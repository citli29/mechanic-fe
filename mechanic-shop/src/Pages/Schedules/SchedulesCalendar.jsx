import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useUrlParam, useUrlState } from "../../utils/useUrlState";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/SchedulesCalendar.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";
import EventModal from "../../components/EventModal/EventModal";
import { getServiceTypeAccent, getServiceTypeSelectStyle } from "../../utils/serviceTypeColor";
import { layoutWeekEvents } from "../../utils/eventLanes";
import { useCalendarEvents, DayEventLanes, DayEventStrip } from "../../components/CalendarEvents/CalendarEvents";

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

// Phone day navigation helpers (dates at local midnight).
function startOfDay(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

// Monday of the week the date is in.
function mondayOf(date) {
	return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
}

function capitalize(text) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

// How far a horizontal swipe must go (px) to change day, and how much
// vertical movement still counts as a swipe rather than a scroll.
const SWIPE_MIN_X = 60;
const SWIPE_MAX_Y = 40;

const LAB_ACCENT = getServiceTypeAccent(2);
const MECHANIC_ACCENT = getServiceTypeAccent(1);
const DESLOCACOES_ACCENT = getServiceTypeAccent(null, "Deslocações");
const ELETRICIDADE_ACCENT = getServiceTypeAccent(4);

export default function SchedulesCalendar() {

	const requestIdRef = useRef(0);

	const [schedules, setSchedules] = useState([]);

	const [serviceTypes, setServiceTypes] = useState([]);

	const deslocacoesId = useMemo(
		() => serviceTypes.find((t) => t.name === "Deslocações")?.id,
		[serviceTypes]
	);

	// Filters, month and (phone) week live in the URL, so ← back from a
	// marcação lands on the same view.
	const [filters, setFilters] = useUrlState({
		car_plate: "",
		client_name: "",
		service_type_id: "",
		status: "all",
	});

	const now = new Date();
	const [year, setYear] = useUrlParam("y", now.getFullYear());
	// month is 0-based in here, 1-based in the URL (?m=11 = Novembro).
	const [monthNr, setMonthNr] = useUrlParam("m", now.getMonth() + 1);
	const month = monthNr - 1;
	const setMonth = (next) => setMonthNr((prevNr) =>
		(typeof next === "function" ? next(prevNr - 1) : next) + 1
	);

	// Phone: the shown week is the one around this date (opens on today;
	// ‹ › / swipe move it 7 days, Hoje resets it). Its month drives which
	// month is loaded (see the sync below).
	const [dayKey, setDayKey] = useUrlParam("d", formatDate(startOfDay(now)));
	const selectedDate = useMemo(() => {
		const [y, m, d] = dayKey.split("-").map(Number);
		const date = new Date(y, (m || 1) - 1, d || 1);
		return Number.isNaN(date.getTime()) ? startOfDay(now) : date;
	}, [dayKey]);
	const setSelectedDate = (next) => setDayKey((prevKey) => {
		const [y, m, d] = prevKey.split("-").map(Number);
		const prev = new Date(y, m - 1, d);
		return formatDate(typeof next === "function" ? next(prev) : next);
	});
	const swipeStartRef = useRef(null);

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);


	// Phone: load the selected day's month. Its padded grid (below) always
	// covers the whole week around any of its days, even across months.
	if (isMobile && (selectedDate.getFullYear() !== year || selectedDate.getMonth() !== month)) {
		setYear(selectedDate.getFullYear());
		setMonth(selectedDate.getMonth());
	}

	// The calendar grid always shows whole weeks — the first/last row
	// usually spills a few days into the previous/next month. These are
	// how many, computed once here so both the data fetch below and the
	// day-grid further down agree on the exact same padded range.
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const firstDay = new Date(year, month, 1).getDay();
	const startDay = firstDay === 0 ? 6 : firstDay - 1;
	const lastDayWeekday = new Date(year, month, daysInMonth).getDay();
	const lastDayIndex = lastDayWeekday === 0 ? 6 : lastDayWeekday - 1;
	const trailingPad = 6 - lastDayIndex;

	// Events overlapping the same padded grid range the cells show.
	const {
		events,
		reload: reloadEvents,
		selectedEvent,
		setSelectedEvent,
		hoveredEventId,
		setHoveredEventId,
	} = useCalendarEvents(
		formatDate(new Date(year, month, 1 - startDay)),
		formatDate(new Date(year, month, daysInMonth + trailingPad)),
		handleApiError
	);

	function handleApiError(err) {
		console.error(err);
	}


	async function loadSchedules() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(
					([key, value]) => value !== "" && !(key === "status" && value === "all")
				)
			);

			// Padded to the full displayed grid (see startDay/trailingPad
			// above), not just the month's own days — otherwise a schedule on
			// one of the spillover days from the previous/next month
			// wouldn't show up on it.
			params.start_date = formatDate(new Date(year, month, 1 - startDay));
			params.end_date = formatDate(new Date(year, month, daysInMonth + trailingPad));

			const res = await api.get("/schedules", { params });

			if (requestId !== requestIdRef.current) return;

			setSchedules(res.data.schedule_list || []);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			handleApiError(err);
		}
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			setServiceTypes(res.data.service_type_list || []);
		} catch (err) {
			handleApiError(err);
		}
	}




	useEffect(() => { loadServiceTypes(); }, []);

	useEffect(() => { loadSchedules(); }, [year, month]);

	useEffect(() => {
		const timer = setTimeout(() => { loadSchedules(); }, 400);
		return () => clearTimeout(timer);
	}, [filters]);


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function clearFilters() {
		setFilters({ car_plate: "", client_name: "", service_type_id: "", status: "all" });
	}


	function previousMonth() {
		if (month === 0) {
			setYear((prev) => prev - 1);
			setMonth(11);
		} else {
			setMonth((prev) => prev - 1);
		}
	}


	function nextMonth() {
		if (month === 11) {
			setYear((prev) => prev + 1);
			setMonth(0);
		} else {
			setMonth((prev) => prev + 1);
		}
	}


	function getAppointmentStatusClass(schedule) {
		if (schedule.service_checkout) return "appointment-delivered";
		if (schedule.service_is_finished === 1) return "appointment-finished";
		if (schedule.service_id !== null) return "appointment-with-service";
		return "appointment-without-service";
	}


	function renderAppointment(schedule) {
		return (
			<div key={schedule.id} className="appointment-wrap">
				<Link
					className={`appointment ${getAppointmentStatusClass(schedule)}`}
					to={`/schedules/${schedule.id}`}
				>
					<div className="appointment-top-row">
						<div className="appointment-plate">
							{schedule.car_plate
								? `${schedule.car_plate} - ${[schedule.car_make, schedule.car_model].filter(Boolean).join(" ")}`
								: [schedule.car_make, schedule.car_model].filter(Boolean).join(" ") || "Sem Viatura"}
						</div>

						{/* Reserves the same space the overlaid icon link (below)
						    occupies, so the plate text doesn't run under it. */}
						{schedule.service_id !== null && <span className="appointment-open-service-spacer" />}
					</div>

					<div className="appointment-client">
						{schedule.client_name || "Sem Cliente"}
					</div>

					<div className="appointment-description">
						{schedule.description}
					</div>
				</Link>

				{schedule.service_id !== null && (
					// Sibling of the card's own <Link>, not nested inside it — an
					// <a> inside an <a> is invalid HTML (React warns loudly about
					// it). Absolutely positioned to land in the same visual spot.
					<Link
						className="appointment-open-service"
						title="Abrir Serviço"
						to={`/services/${schedule.service_id}`}
					>
						<i className="fa-solid fa-arrow-up-right-from-square" />
					</Link>
				)}
			</div>
		);
	}


	function renderDayHalves(daySchedules) {
		const unassignedSchedules = daySchedules.filter((s) => s.service_id === null);
		const labSchedules = daySchedules.filter((s) => s.service_id !== null && s.service_type_id === 2);
		const deslocacoesSchedules = daySchedules.filter(
			(s) => s.service_id !== null && s.service_type_id === deslocacoesId
		);
		const eletricidadeSchedules = daySchedules.filter((s) => s.service_id !== null && s.service_type_id === 4);
		const mechanicSchedules = daySchedules.filter(
			(s) => s.service_id !== null && s.service_type_id !== 2 && s.service_type_id !== 4 && s.service_type_id !== deslocacoesId
		);

		return (
			<div className="day-halves">
				{unassignedSchedules.length > 0 && (
					<div className="day-half day-half-unassigned">
						<div className="appointments">
							{unassignedSchedules.map((schedule) => renderAppointment(schedule))}
						</div>
					</div>
				)}

				{labSchedules.length > 0 && (
					<div className="day-half day-half-top" style={{ borderLeftColor: LAB_ACCENT }}>
						<div className="day-half-label">Laboratório</div>

						<div className="appointments">
							{labSchedules.map((schedule) => renderAppointment(schedule))}
						</div>
					</div>
				)}

				{mechanicSchedules.length > 0 && (
					<div className="day-half day-half-top" style={{ borderLeftColor: MECHANIC_ACCENT }}>
						<div className="day-half-label">Mecânica</div>

						<div className="appointments">
							{mechanicSchedules.map((schedule) => renderAppointment(schedule))}
						</div>
					</div>
				)}

				{eletricidadeSchedules.length > 0 && (
					<div className="day-half day-half-top" style={{ borderLeftColor: ELETRICIDADE_ACCENT }}>
						<div className="day-half-label">Eletricidade</div>

						<div className="appointments">
							{eletricidadeSchedules.map((schedule) => renderAppointment(schedule))}
						</div>
					</div>
				)}

				{deslocacoesSchedules.length > 0 && (
					<div className="day-half day-half-bottom" style={{ borderLeftColor: DESLOCACOES_ACCENT }}>
						<div className="day-half-label">Deslocações</div>

						<div className="appointments">
							{deslocacoesSchedules.map((schedule) => renderAppointment(schedule))}
						</div>
					</div>
				)}
			</div>
		);
	}


	const groupedSchedules = useMemo(() => {
		const grouped = {};

		schedules.forEach((schedule) => {
			if (!grouped[schedule.date]) grouped[schedule.date] = [];
			grouped[schedule.date].push(schedule);
		});

		return grouped;
	}, [schedules]);


	// A full padded grid — the leading/trailing spillover days (from
	// startDay/trailingPad above) get real day numbers and data too now,
	// not blank cells; `new Date(year, month, day)` normalizes on its own
	// for day <= 0 or day > daysInMonth, landing in the right adjacent
	// month/year without any special-casing here.
	const calendarDays = [];

	for (let day = 1 - startDay; day <= daysInMonth + trailingPad; day++) {
		const date = new Date(year, month, day);
		const key = formatDate(date);

		calendarDays.push({
			day: date.getDate(),
			key,
			isOtherMonth: date.getMonth() !== month,
			schedules: groupedSchedules[key] || [],
			// An event can span several days, so membership isn't a simple
			// key lookup like schedules above — a day belongs to an event
			// whenever it falls within that event's own range.
			events: events.filter((event) => event.start_date <= key && key <= event.end_date),
		});
	}

	const formattedMonthName = new Date(year, month, 1).toLocaleString("pt-PT", {
		month: "long",
		year: "numeric",
	});

	const monthName = formattedMonthName.charAt(0).toUpperCase() + formattedMonthName.slice(1);

	const weeksOfMonth = [];

	for (let i = 0; i < calendarDays.length; i += 7) {
		weeksOfMonth.push(calendarDays.slice(i, i + 7));
	}

	// Lane layout per week row, flattened back so it lines up index for
	// index with calendarDays (the desktop grid renders calendarDays flat).
	const dayEventLanes = weeksOfMonth.flatMap(layoutWeekEvents);

	// ---------- phone: day navigation ----------

	const dayByKey = Object.fromEntries(calendarDays.map((day) => [day.key, day]));

	const todayKey = formatDate(now);
	const selectedMonday = mondayOf(selectedDate);
	const stripDays = Array.from({ length: 7 }, (_, i) => {
		const date = addDays(selectedMonday, i);
		const key = formatDate(date);
		// Days of the loaded grid have their data; the very first render
		// after a month change may not yet, so fall back to an empty day.
		return dayByKey[key] ?? { day: date.getDate(), key, schedules: [], events: [] };
	});

	const selectedMonthName = capitalize(
		selectedDate.toLocaleString("pt-PT", { month: "long", year: "numeric" }).replace(" de ", " ")
	);

	// "Nov 2026" for very narrow phones (see the CSS).
	const selectedMonthShort = `${capitalize(
		selectedDate.toLocaleString("pt-PT", { month: "short" }).replace(".", "")
	)} ${selectedDate.getFullYear()}`;

	function moveSelectedDate(days) {
		setSelectedDate((prev) => addDays(prev, days));
	}

	function goToToday() {
		setSelectedDate(startOfDay(new Date()));
	}

	// Native month picker (big jumps): today if it's the current month,
	// otherwise the 1st of the picked month.
	function handlePickMonth(e) {
		const [y, m] = e.target.value.split("-").map(Number);
		if (!y || !m) return;
		const today = startOfDay(new Date());
		setSelectedDate(
			today.getFullYear() === y && today.getMonth() === m - 1 ? today : new Date(y, m - 1, 1)
		);
	}

	// Swipe left / right on the week's cards: next / previous week.
	// Passive: never blocks scrolling; only a clearly horizontal move counts.
	function handleSwipeStart(e) {
		const touch = e.touches[0];
		swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
	}

	function handleSwipeEnd(e) {
		const start = swipeStartRef.current;
		swipeStartRef.current = null;
		if (!start) return;

		const touch = e.changedTouches[0];
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;

		if (Math.abs(dx) >= SWIPE_MIN_X && Math.abs(dy) <= SWIPE_MAX_Y) {
			moveSelectedDate(dx < 0 ? 7 : -7);
		}
	}


	function renderCalendarDesktop() {
		return (
			<div className="calendar">

				<div className="calendar-header">Seg</div>
				<div className="calendar-header">Ter</div>
				<div className="calendar-header">Qua</div>
				<div className="calendar-header">Qui</div>
				<div className="calendar-header">Sex</div>
				<div className="calendar-header">Sab</div>
				<div className="calendar-header">Dom</div>

				{calendarDays.map((day, index) => (
					<div
						key={index}
						className={`calendar-day ${day.isOtherMonth ? "other-month" : ""}`}
					>
						<DayEventLanes
							lanes={dayEventLanes[index]}
							hoveredEventId={hoveredEventId}
							onHover={setHoveredEventId}
							onSelect={setSelectedEvent}
						/>

						<div className="day-number">{day.day}</div>

						{renderDayHalves(day.schedules)}
					</div>
				))}

			</div>
		);
	}


	// Phone: month ▾, ‹ › (week) and Hoje, a strip summing up the week's
	// 7 days (dots = marcações; not clickable), then the week's cards below.
	function renderCalendarMobile() {
		// Hoje is greyed out while today's week is the one shown.
		const isOnToday = formatDate(selectedMonday) === formatDate(mondayOf(now));

		return (
			<div className="day-nav">
				<div className="day-nav-header">
					{/* The month name opens the phone's own month picker. */}
					<label className="day-nav-month" title="Escolher mês">
						<span className="day-nav-month-long">{selectedMonthName}</span>
						<span className="day-nav-month-short">{selectedMonthShort}</span>
						<i className="fa-solid fa-caret-down" />
						<input
							type="month"
							value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`}
							onChange={handlePickMonth}
							aria-label="Escolher mês"
						/>
					</label>

					<div className="day-nav-actions">
						<button type="button" className="day-nav-arrow" title="Semana anterior" aria-label="Semana anterior" onClick={() => moveSelectedDate(-7)}>
							<i className="fa-solid fa-chevron-left" />
						</button>
						<button type="button" className="day-nav-arrow" title="Semana seguinte" aria-label="Semana seguinte" onClick={() => moveSelectedDate(7)}>
							<i className="fa-solid fa-chevron-right" />
						</button>
						<button
							type="button"
							className="day-nav-today"
							disabled={isOnToday}
							onClick={goToToday}
						>
							Hoje
						</button>
					</div>
				</div>

				<div className="week-strip">

					{stripDays.map((day, index) => {
						const count = day.schedules.length;

						return (
							<div
								key={day.key}
								className={`week-strip-day ${day.key === todayKey ? "is-today" : ""}`}
								aria-label={`${WEEKDAY_NAMES[index]} ${day.day}: ${count} ${count === 1 ? "marcação" : "marcações"}`}
							>
								<span className="week-strip-weekday">{WEEKDAY_NAMES[index]}</span>
								<span className="week-strip-number">{day.day}</span>
								<span className="week-strip-dots">
									{Array.from({ length: Math.min(count, 3) }, (_, i) => <i key={i} />)}
									{day.events.length > 0 && <i className="is-event" />}
								</span>
							</div>
						);
					})}
				</div>

				{/* The whole week, one card per day; swiping left / right
				   changes week. */}
				<div
					className="calendar calendar-vertical week-days"
					onTouchStart={handleSwipeStart}
					onTouchEnd={handleSwipeEnd}
				>
					{stripDays.map((day, index) => (
						<div key={day.key} className={`calendar-day ${day.key === todayKey ? "is-today" : ""}`}>
							<DayEventStrip events={day.events} dayKey={day.key} onSelect={setSelectedEvent} />

							<div className="day-label">
								<span className="weekday-name">{WEEKDAY_NAMES[index]}</span>
								<span className="day-number">{day.day}</span>
								{day.key === todayKey && <span className="day-today-tag">Hoje</span>}
							</div>

							{day.schedules.length > 0
								? renderDayHalves(day.schedules)
								: <p className="day-empty">Sem marcações.</p>}
						</div>
					))}
				</div>
			</div>
		);
	}

	function renderMonthNavigation() {
		return (
			<div className="month-navigation">
				<button className="accent" onClick={previousMonth}>
					<i className="fa-solid fa-chevron-left" />
				</button>

				<h2>{monthName}</h2>

				<button className="accent" onClick={nextMonth}>
					<i className="fa-solid fa-chevron-right" />
				</button>
			</div>
		);
	}

	return (
		<div className="page schedules-calendar-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-days" />
						<h1>Marcações</h1>

						{/* Desktop only (CSS); phones have it on top of the filters. */}
						<Link className="header-add" to="/schedules/new">
							<i className="fa-solid fa-plus" /> <span>Adicionar Marcação</span>
						</Link>

						<ViewToggle listPath="/schedules" calendarPath="/schedules_calendar" />
					</div>

					<div className="body">

						<div className="filters">
							<input
								className="plate-filter"
								name="car_plate"
								placeholder="Matrícula"
								value={filters.car_plate}
								onChange={updateFilter}
							/>

							<input
								className="client-filter"
								name="client_name"
								placeholder="Cliente"
								value={filters.client_name}
								onChange={updateFilter}
							/>

							<select
								className="type-filter"
								name="service_type_id"
								value={filters.service_type_id}
								onChange={updateFilter}
								style={getServiceTypeSelectStyle(filters.service_type_id, serviceTypes)}
							>
								<option value="">Tipo de Serviço</option>
								{serviceTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>

							<select
								className="status-filter"
								name="status"
								value={filters.status}
								onChange={updateFilter}
							>
								<option value="all">{isMobile ? "Todos" : "Todos os Estados"}</option>
								<option value="without_service">Sem Serviço</option>
								<option value="with_service">Com Serviço</option>
								<option value="finished">Terminado</option>
								<option value="delivered">Entregue</option>
							</select>

							<button className="options clear-filters" title="Limpar filtros" aria-label="Limpar filtros" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> <span className="clear-filters-label">Limpar</span>
							</button>

							{/* Phone only (CSS); desktop has it in the header. */}
							<Link className="confirm filters-add" to="/schedules/new">
								<i className="fa-solid fa-plus" /> Adicionar Marcação
							</Link>
						</div>

						{/* Desktop: month bar under the filters, right above the
						   grid. Phone: its own month / week navigation inside
						   renderCalendarMobile. */}
						{!isMobile && renderMonthNavigation()}

						<div className="calendar-wrapper">
							{isMobile ? renderCalendarMobile() : renderCalendarDesktop()}
						</div>

					</div>
				</div>

			</div>

			{selectedEvent && (
				<EventModal
					event={selectedEvent}
					onClose={() => setSelectedEvent(null)}
					onSaved={() => {
						setSelectedEvent(null);
						reloadEvents();
					}}
				/>
			)}
		</div>
	);
}
