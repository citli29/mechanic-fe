import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/UserTimeStats.css";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const MONTH_NAMES = [
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Total gets the app's own brand blue, deliberately outside the categorical
// set below so it reads as "the aggregate", not "a 5th user".
const TOTAL_COLOR = "#2563eb";

// Fixed-order categorical palette (validated for adjacent-pair CVD safety),
// assigned to users in a stable order (by id) — never re-sorted by value.
const USER_COLORS = ["#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7", "#008300"];

function niceMax(value) {
	if (value <= 0) return 1;

	const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
	const steps = [1, 2, 2.5, 5, 10];

	for (const step of steps) {
		const candidate = step * magnitude;
		if (candidate >= value) return candidate;
	}

	return 10 * magnitude;
}

function formatHours(hours) {
	return hours.toFixed(1);
}

function daysInMonth(year, month) {
	return new Date(year, month, 0).getDate();
}

function weeksInMonth(year, month) {
	return Math.ceil(daysInMonth(year, month) / 7);
}

// Local-time formatter — avoids the UTC-shift bug toISOString() has for
// timezones ahead of UTC (would otherwise roll dates back by a day).
function formatISODate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

// Real calendar weeks (Monday-Sunday), clipped to the given year — so the
// year's first week is whatever partial days lead up to the first Sunday
// (e.g. 2026 starts on a Thursday: week 1 is just Thu 1-Sun 4), and every
// week after that is a full Monday-Sunday span. Shared by the print report
// and the on-screen "Semanal" tab, so both agree on the same week boundaries.
function buildYearWeeks(year, dailyStatsList, sortedUsers) {
	const entries = [];
	const yearEnd = new Date(year, 11, 31);

	let cursor = new Date(year, 0, 1);
	let weekIndex = 0;

	while (cursor <= yearEnd) {
		weekIndex += 1;

		const dayOfWeek = cursor.getDay();
		const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

		let weekEnd = new Date(cursor);
		weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
		if (weekEnd > yearEnd) weekEnd = new Date(yearEnd);

		const start = cursor;
		const end = weekEnd;

		const days = [];
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			days.push(formatISODate(d));
		}

		const rows = dailyStatsList.filter((r) => days.includes(r.ut_date));

		const userHours = sortedUsers.map((u) => {
			const minutes = rows
				.filter((r) => r.user_id === u.id)
				.reduce((sum, r) => sum + r.total_minutes, 0);
			return { user: u, hours: minutes / 60 };
		});

		const totalHours = userHours.reduce((sum, u) => sum + u.hours, 0);

		// A week that crosses a month boundary is grouped under the month
		// it starts in — the day numbers alone (e.g. "26-1") still make
		// the range unambiguous without repeating the month name.
		entries.push({
			key: weekIndex,
			month: start.getMonth(),
			dayLabel: `${start.getDate()}-${end.getDate()}`,
			start: new Date(start),
			end: new Date(end),
			totalHours,
			userHours,
		});

		cursor = new Date(end);
		cursor.setDate(cursor.getDate() + 1);
	}

	return entries;
}

// Pure calendar math, no data needed — used to jump to the last week of the
// previous year without waiting on that year's stats to be fetched first.
function countWeeksInYear(year) {
	return buildYearWeeks(year, [], []).length;
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TABS = [
	{ key: "yearly", label: "Anual", icon: "fa-calendar" },
	{ key: "monthly", label: "Mensal", icon: "fa-calendar-days" },
	{ key: "weekly", label: "Semanal", icon: "fa-calendar-week" },
];


// Shared by the yearly (entries = months) and monthly (entries = weeks)
// sections below — same totals tiles + bar chart, just fed a different
// breakdown of the same underlying hours.
function UserTimeBarStats({ entries, sortedUsers, isMobile, totalLabel }) {

	const [hoverInfo, setHoverInfo] = useState(null);

	const totals = useMemo(() => {
		const perUser = sortedUsers.map((u, idx) => {
			const hours = entries.reduce((sum, e) => sum + e.userHours[idx].hours, 0);
			return { user: u, hours };
		});

		const totalHours = perUser.reduce((sum, u) => sum + u.hours, 0);

		return { totalHours, perUser };
	}, [entries, sortedUsers]);


	const maxHours = useMemo(() => {
		let max = 0;

		entries.forEach((e) => {
			max = Math.max(max, e.totalHours, ...e.userHours.map((u) => u.hours));
		});

		return niceMax(max);
	}, [entries]);


	const axisTicks = useMemo(() => {
		const stepCount = 4;
		const step = maxHours / stepCount;

		return Array.from({ length: stepCount + 1 }, (_, i) => Math.round(step * i * 10) / 10);
	}, [maxHours]);


	// Bars must never flex-shrink below their intended size (that's what was
	// squeezing them — and their labels — together), so the plot needs a
	// min-width that actually fits every bar per group, however many users
	// there are. Smaller on mobile so more groups fit in view before
	// scrolling is needed.
	const barWidth = isMobile ? 10 : 16;
	const barGap = isMobile ? 2 : 4;
	const groupGap = isMobile ? 4 : 8;

	const barsPerGroup = sortedUsers.length + 1;
	const groupMinWidth = barsPerGroup * barWidth + (barsPerGroup - 1) * barGap;
	const plotMinWidth = groupMinWidth * entries.length + (entries.length - 1) * groupGap;


	function handleBarEnter(e, label, hours) {
		const rect = e.currentTarget.getBoundingClientRect();

		setHoverInfo({
			x: rect.left + rect.width / 2,
			y: rect.top,
			label,
			value: formatHours(hours),
		});
	}


	function handleBarLeave() {
		setHoverInfo(null);
	}


	function renderMobileChart() {
		return (
			<div className="user-time-stats-mobile-chart">
				{entries.map((e) => (
					<div className="user-time-stats-mobile-month" key={e.key}>
						<div className="user-time-stats-mobile-month-label">{e.label}</div>

						<div className="user-time-stats-mobile-row">
							<span className="user-time-stats-mobile-row-label" title="Total">Total</span>
							<div className="user-time-stats-mobile-bar-track">
								<div
									className="user-time-stats-mobile-bar"
									style={{ width: `${(e.totalHours / maxHours) * 100}%`, background: TOTAL_COLOR }}
								/>
							</div>
							<span className="user-time-stats-mobile-row-value">{formatHours(e.totalHours)}</span>
						</div>

						{e.userHours.map((u, idx) => (
							<div className="user-time-stats-mobile-row" key={u.user.id}>
								<span className="user-time-stats-mobile-row-label" title={u.user.name}>{u.user.name}</span>
								<div className="user-time-stats-mobile-bar-track">
									<div
										className="user-time-stats-mobile-bar"
										style={{
											width: `${(u.hours / maxHours) * 100}%`,
											background: USER_COLORS[idx % USER_COLORS.length],
										}}
									/>
								</div>
								<span className="user-time-stats-mobile-row-value">{formatHours(u.hours)}</span>
							</div>
						))}
					</div>
				))}
			</div>
		);
	}


	function renderChart() {
		return (
			<>
				<div className="user-time-stats-chart">
					<div className="user-time-stats-chart-row">
						<div className="user-time-stats-axis">
							{axisTicks.slice().reverse().map((tick, idx) => (
								<div className="user-time-stats-axis-tick" key={idx}>{tick}</div>
							))}
						</div>

						<div className="user-time-stats-plot" style={{ minWidth: `${plotMinWidth}px`, gap: `${groupGap}px` }}>
							{axisTicks.map((tick, idx) => (
								<div
									className="user-time-stats-gridline"
									key={idx}
									style={{ bottom: `${(tick / maxHours) * 100}%` }}
								/>
							))}

							{entries.map((e) => (
								<div className="user-time-stats-month-group" key={e.key}>
									<div className="user-time-stats-bars" style={{ gap: `${barGap}px` }}>
										<div
											className="user-time-stats-bar"
											style={{
												height: `${(e.totalHours / maxHours) * 100}%`,
												background: TOTAL_COLOR,
												flex: `0 0 ${barWidth}px`,
												width: `${barWidth}px`,
											}}
											onMouseEnter={(ev) => handleBarEnter(ev, "Total", e.totalHours)}
											onMouseLeave={handleBarLeave}
										>
											{e.totalHours > 0 && (
												<span className="user-time-stats-bar-label">{formatHours(e.totalHours)}</span>
											)}
										</div>

										{e.userHours.map((u, idx) => (
											<div
												key={u.user.id}
												className="user-time-stats-bar"
												style={{
													height: `${(u.hours / maxHours) * 100}%`,
													background: USER_COLORS[idx % USER_COLORS.length],
													flex: `0 0 ${barWidth}px`,
													width: `${barWidth}px`,
												}}
												onMouseEnter={(ev) => handleBarEnter(ev, u.user.name, u.hours)}
												onMouseLeave={handleBarLeave}
											>
												{u.hours > 0 && (
													<span className="user-time-stats-bar-label">{formatHours(u.hours)}</span>
												)}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="user-time-stats-labels-row">
						<div className="user-time-stats-axis-spacer" />

						<div className="user-time-stats-labels" style={{ minWidth: `${plotMinWidth}px`, gap: `${groupGap}px` }}>
							{entries.map((e) => (
								<div className="user-time-stats-month-label" key={e.key}>{e.label}</div>
							))}
						</div>
					</div>
				</div>

				{hoverInfo && (
					<div
						className="user-time-stats-tooltip"
						style={{ left: hoverInfo.x, top: hoverInfo.y }}
					>
						<strong>{hoverInfo.label}</strong>
						<span>{hoverInfo.value}</span>
					</div>
				)}
			</>
		);
	}


	return (
		<>
			<div className="user-time-stats-yearly-totals">
				<div className="user-time-stats-yearly-tile" style={{ borderTopColor: TOTAL_COLOR }}>
					<span className="user-time-stats-yearly-value">{formatHours(totals.totalHours)}</span>
					<span className="user-time-stats-yearly-label">{totalLabel}</span>
				</div>

				{totals.perUser.map(({ user, hours }, idx) => (
					<div
						className="user-time-stats-yearly-tile"
						key={user.id}
						style={{ borderTopColor: USER_COLORS[idx % USER_COLORS.length] }}
					>
						<span className="user-time-stats-yearly-value">{formatHours(hours)}</span>
						<span className="user-time-stats-yearly-label">{user.name}</span>
					</div>
				))}
			</div>

			{isMobile ? renderMobileChart() : renderChart()}
		</>
	);
}


export default function UserTimeStats() {

	const [activeTab, setActiveTab] = useState(TABS[0].key);

	const [year, setYear] = useState(new Date().getFullYear());
	const [users, setUsers] = useState([]);
	const [statsList, setStatsList] = useState([]);
	const [loading, setLoading] = useState(true);

	const [statsMonth, setStatsMonth] = useState(() => {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() + 1 };
	});
	const [weeklyStatsList, setWeeklyStatsList] = useState([]);
	const [weeklyLoading, setWeeklyLoading] = useState(true);

	const [statsWeekYear, setStatsWeekYear] = useState(() => new Date().getFullYear());
	const [weekIndex, setWeekIndex] = useState(() => {
		const now = new Date();
		const weeks = buildYearWeeks(now.getFullYear(), [], []);
		const idx = weeks.findIndex((w) => now >= w.start && now <= w.end);
		return idx >= 0 ? idx : 0;
	});
	const [weekDailyStatsList, setWeekDailyStatsList] = useState([]);
	const [weekDailyLoading, setWeekDailyLoading] = useState(true);

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");
		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);


	useEffect(() => {
		function resetPrintMode() {
			document.body.classList.remove("print-report-anual", "print-report-semanal");
		}

		window.addEventListener("afterprint", resetPrintMode);
		return () => window.removeEventListener("afterprint", resetPrintMode);
	}, []);


	useEffect(() => {
		api.get("/users")
			.then((res) => setUsers(res.data.user_list || []))
			.catch(() => setUsers([]));
	}, []);


	useEffect(() => {
		setLoading(true);

		api.get("/user_times/monthly_stats", { params: { year } })
			.then((res) => setStatsList(res.data.stats_list || []))
			.catch(() => setStatsList([]))
			.finally(() => setLoading(false));
	}, [year]);


	// Used only by the "Relatório Semanal" print report — every day of the
	// selected year, fetched in one request; grouped into real Monday-Sunday
	// weeks client-side (see allWeeksOfYearData below).
	const [yearlyDailyStatsList, setYearlyDailyStatsList] = useState([]);

	useEffect(() => {
		api.get("/user_times/yearly_daily_stats", { params: { year } })
			.then((res) => setYearlyDailyStatsList(res.data.stats_list || []))
			.catch(() => setYearlyDailyStatsList([]));
	}, [year]);


	useEffect(() => {
		setWeeklyLoading(true);

		api.get("/user_times/weekly_stats", {
			params: { year: statsMonth.year, month: String(statsMonth.month).padStart(2, "0") },
		})
			.then((res) => setWeeklyStatsList(res.data.stats_list || []))
			.catch(() => setWeeklyStatsList([]))
			.finally(() => setWeeklyLoading(false));
	}, [statsMonth]);


	useEffect(() => {
		setWeekDailyLoading(true);

		api.get("/user_times/yearly_daily_stats", { params: { year: statsWeekYear } })
			.then((res) => setWeekDailyStatsList(res.data.stats_list || []))
			.catch(() => setWeekDailyStatsList([]))
			.finally(() => setWeekDailyLoading(false));
	}, [statsWeekYear]);


	const sortedUsers = useMemo(
		() => [...users].sort((a, b) => a.id - b.id),
		[users]
	);


	const monthsData = useMemo(() => {
		return MONTH_LABELS.map((label, idx) => {
			const monthNumber = idx + 1;
			const rows = statsList.filter((r) => r.month === monthNumber);

			const userHours = sortedUsers.map((u) => {
				const row = rows.find((r) => r.user_id === u.id);
				return { user: u, hours: row ? row.total_minutes / 60 : 0 };
			});

			const totalHours = userHours.reduce((sum, u) => sum + u.hours, 0);

			return { key: monthNumber, label, totalHours, userHours };
		});
	}, [statsList, sortedUsers]);


	const weeksData = useMemo(() => {
		const weekCount = Math.ceil(daysInMonth(statsMonth.year, statsMonth.month) / 7);

		return Array.from({ length: weekCount }, (_, idx) => {
			const weekNumber = idx + 1;
			const rows = weeklyStatsList.filter((r) => r.week === weekNumber);

			const userHours = sortedUsers.map((u) => {
				const row = rows.find((r) => r.user_id === u.id);
				return { user: u, hours: row ? row.total_minutes / 60 : 0 };
			});

			const totalHours = userHours.reduce((sum, u) => sum + u.hours, 0);

			return { key: weekNumber, label: `Semana ${weekNumber}`, totalHours, userHours };
		});
	}, [weeklyStatsList, sortedUsers, statsMonth]);


	// Real calendar weeks (Monday-Sunday), clipped to the selected year — so
	// the year's first week is whatever partial days lead up to the first
	// Sunday (e.g. 2026 starts on a Thursday: week 1 is just Thu 1-Sun 4),
	// and every week after that is a full Monday-Sunday span.
	const allWeeksOfYearData = useMemo(
		() => buildYearWeeks(year, yearlyDailyStatsList, sortedUsers),
		[yearlyDailyStatsList, sortedUsers, year]
	);


	// Same real-week boundaries, but for the independently-navigable
	// "Semanal" tab (its own year, not tied to the Anual tab's).
	const weeksOfStatsWeekYear = useMemo(
		() => buildYearWeeks(statsWeekYear, weekDailyStatsList, sortedUsers),
		[weekDailyStatsList, sortedUsers, statsWeekYear]
	);

	const selectedWeek = weeksOfStatsWeekYear[
		Math.min(weekIndex, weeksOfStatsWeekYear.length - 1)
	];

	const daysData = useMemo(() => {
		if (!selectedWeek) return [];

		const days = [];
		for (let d = new Date(selectedWeek.start); d <= selectedWeek.end; d.setDate(d.getDate() + 1)) {
			days.push(new Date(d));
		}

		return days.map((date) => {
			const iso = formatISODate(date);
			const rows = weekDailyStatsList.filter((r) => r.ut_date === iso);

			const userHours = sortedUsers.map((u) => {
				const row = rows.find((r) => r.user_id === u.id);
				return { user: u, hours: row ? row.total_minutes / 60 : 0 };
			});

			const totalHours = userHours.reduce((sum, u) => sum + u.hours, 0);
			const weekday = WEEKDAY_SHORT[date.getDay()];

			return { key: iso, label: `${weekday} ${date.getDate()}`, totalHours, userHours };
		});
	}, [selectedWeek, weekDailyStatsList, sortedUsers]);


	function goPrevMonth() {
		setStatsMonth(({ year, month }) =>
			month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
		);
	}


	function goNextMonth() {
		setStatsMonth(({ year, month }) =>
			month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
		);
	}


	function goPrevWeek() {
		if (weekIndex > 0) {
			setWeekIndex((idx) => idx - 1);
			return;
		}

		const prevYear = statsWeekYear - 1;
		setStatsWeekYear(prevYear);
		setWeekIndex(countWeeksInYear(prevYear) - 1);
	}


	function goNextWeek() {
		if (weekIndex < weeksOfStatsWeekYear.length - 1) {
			setWeekIndex((idx) => idx + 1);
			return;
		}

		setStatsWeekYear((y) => y + 1);
		setWeekIndex(0);
	}


	function renderStatsTable(entries, columnHeader, showFooter = true) {
		return (
			<table className="user-time-stats-print-table">
				<thead>
					<tr>
						<th>{columnHeader}</th>
						<th>Total</th>
						{sortedUsers.map((u) => (
							<th key={u.id}>{u.name}</th>
						))}
					</tr>
				</thead>

				<tbody>
					{entries.map((e) => (
						<tr key={e.key}>
							<td>{e.label}</td>
							<td>{formatHours(e.totalHours)}</td>
							{e.userHours.map((u) => (
								<td key={u.user.id}>{formatHours(u.hours)}</td>
							))}
						</tr>
					))}
				</tbody>

				{showFooter && (
					<tfoot>
						<tr>
							<td>Total</td>
							<td>{formatHours(entries.reduce((sum, e) => sum + e.totalHours, 0))}</td>
							{sortedUsers.map((u, idx) => (
								<td key={u.id}>
									{formatHours(entries.reduce((sum, e) => sum + e.userHours[idx].hours, 0))}
								</td>
							))}
						</tr>
					</tfoot>
				)}
			</table>
		);
	}


	function renderAnualReport() {
		return (
			<div className="user-time-stats-print-anual">
				<h2>Relatório Anual - Tempos dos Utilizadores</h2>

				<p className="user-time-stats-print-meta">
					Ano: {year} · Gerado em {new Date().toLocaleDateString("pt-PT")}
				</p>

				{renderStatsTable(monthsData, "Mês")}
			</div>
		);
	}


	function renderSemanalReport() {
		const monthGroups = [];

		allWeeksOfYearData.forEach((w) => {
			let group = monthGroups[monthGroups.length - 1];
			if (!group || group.month !== w.month) {
				group = { month: w.month, weeks: [] };
				monthGroups.push(group);
			}
			group.weeks.push(w);
		});

		const userTotals = sortedUsers.map((u, idx) => ({
			user: u,
			hours: allWeeksOfYearData.reduce((sum, w) => sum + w.userHours[idx].hours, 0),
		}));

		const grandTotal = userTotals.reduce((sum, t) => sum + t.hours, 0);

		return (
			<div className="user-time-stats-print-semanal">
				<h2>Relatório Semanal - Tempos dos Utilizadores</h2>

				<p className="user-time-stats-print-meta">
					Ano: {year} · Todas as semanas · Gerado em {new Date().toLocaleDateString("pt-PT")}
				</p>

				<table className="user-time-stats-print-table">
					<thead>
						<tr>
							<th>Mês</th>
							<th>Dias</th>
							<th>Total</th>
							{sortedUsers.map((u) => (
								<th key={u.id}>{u.name}</th>
							))}
						</tr>
					</thead>

					{monthGroups.map((group) => (
						// A separate <tbody> per month, kept whole across a page
						// break (see break-inside: avoid in the CSS) — otherwise
						// the month's rowSpan cell can get sliced by the page
						// break and loses its border on the cut edge.
						<tbody key={group.month}>
							{group.weeks.map((w, idx) => (
								<tr key={w.key}>
									{idx === 0 && (
										<td rowSpan={group.weeks.length} className="user-time-stats-print-month-cell">
											{MONTH_NAMES[group.month]}
										</td>
									)}
									<td className="user-time-stats-print-day-cell">{w.dayLabel}</td>
									<td>{formatHours(w.totalHours)}</td>
									{w.userHours.map((u) => (
										<td key={u.user.id}>{formatHours(u.hours)}</td>
									))}
								</tr>
							))}
						</tbody>
					))}

					<tfoot>
						<tr>
							<td colSpan={2}>Total</td>
							<td>{formatHours(grandTotal)}</td>
							{userTotals.map((t) => (
								<td key={t.user.id}>{formatHours(t.hours)}</td>
							))}
						</tr>
					</tfoot>
				</table>
			</div>
		);
	}


	function handlePrintAnual() {
		document.body.classList.remove("print-report-semanal");
		document.body.classList.add("print-report-anual");
		window.print();
	}


	function handlePrintSemanal() {
		document.body.classList.remove("print-report-anual");
		document.body.classList.add("print-report-semanal");
		window.print();
	}


	return (
		<div className="page user-time-stats-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-chart-column" />
						<h1>Tempos dos Utilizadores</h1>
					</div>

					<div className="body">

						<div className="user-time-stats-toolbar">
							<div className="uts-tabs">
								{TABS.map((tab) => (
									<button
										key={tab.key}
										className={activeTab === tab.key ? "active" : ""}
										onClick={() => setActiveTab(tab.key)}
									>
										<i className={`fa-solid ${tab.icon}`} />
										{tab.label}
									</button>
								))}
							</div>

							<div className="user-time-stats-print-buttons">
								<button type="button" className="options" onClick={handlePrintAnual}>
									<i className="fa-solid fa-file-lines" />
									Relatório Anual
								</button>

								<button type="button" className="options" onClick={handlePrintSemanal}>
									<i className="fa-solid fa-file-lines" />
									Relatório Semanal
								</button>
							</div>
						</div>

						{activeTab === "yearly" && (
							<>
								<div className="filters">
									<button className="options" onClick={() => setYear((y) => y - 1)}>
										<i className="fa-solid fa-chevron-left" />
									</button>

									<span className="user-time-stats-year">{year}</span>

									<button className="options" onClick={() => setYear((y) => y + 1)}>
										<i className="fa-solid fa-chevron-right" />
									</button>
								</div>

								{loading ? (
									<p className="user-time-stats-empty">A carregar...</p>
								) : (
									<UserTimeBarStats
										entries={monthsData}
										sortedUsers={sortedUsers}
										isMobile={isMobile}
										totalLabel="Total do Ano"
									/>
								)}
							</>
						)}

						{activeTab === "monthly" && (
							<>
								<div className="filters">
									<button className="options" onClick={goPrevMonth}>
										<i className="fa-solid fa-chevron-left" />
									</button>

									<span className="user-time-stats-year">
										{MONTH_NAMES[statsMonth.month - 1]} {statsMonth.year}
									</span>

									<button className="options" onClick={goNextMonth}>
										<i className="fa-solid fa-chevron-right" />
									</button>
								</div>

								{weeklyLoading ? (
									<p className="user-time-stats-empty">A carregar...</p>
								) : (
									<UserTimeBarStats
										entries={weeksData}
										sortedUsers={sortedUsers}
										isMobile={isMobile}
										totalLabel="Total do Mês"
									/>
								)}
							</>
						)}

						{activeTab === "weekly" && (
							<>
								<div className="filters">
									<button className="options" onClick={goPrevWeek}>
										<i className="fa-solid fa-chevron-left" />
									</button>

									<span className="user-time-stats-year">
										{selectedWeek
											? `${MONTH_LABELS[selectedWeek.month]} ${selectedWeek.dayLabel} · ${statsWeekYear}`
											: ""}
									</span>

									<button className="options" onClick={goNextWeek}>
										<i className="fa-solid fa-chevron-right" />
									</button>
								</div>

								{weekDailyLoading ? (
									<p className="user-time-stats-empty">A carregar...</p>
								) : (
									<UserTimeBarStats
										entries={daysData}
										sortedUsers={sortedUsers}
										isMobile={isMobile}
										totalLabel="Total da Semana"
									/>
								)}
							</>
						)}

					</div>
				</div>

				{renderAnualReport()}
				{renderSemanalReport()}

			</div>
		</div>
	);
}
