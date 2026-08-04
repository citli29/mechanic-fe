import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";

//import "./MiniCalendar.css";

function formatDateKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function parseDate(value) {
	if (!value) return null;

	const [year, month, day] = String(value)
		.slice(0, 10)
		.split("-")
		.map(Number);

	if (!year || !month || !day) return null;

	return new Date(year, month - 1, day);
}

function getMonthRange(visibleMonth) {
	const startDate = new Date(
		visibleMonth.getFullYear(),
		visibleMonth.getMonth() - 1,
		1
	);

	const endDate = new Date(
		visibleMonth.getFullYear(),
		visibleMonth.getMonth() + 2,
		0
	);

	return {
		startDate,
		endDate,
		start: formatDateKey(startDate),
		end: formatDateKey(endDate)
	};
}

export default function MiniCalendar({
	onSelect,
	loadSchedules,
	value = "",
	width = "400px",
	staleTime = 1,
	locale = "pt-PT",
	weekdays = [
		"Seg",
		"Ter",
		"Qua",
		"Qui",
		"Sex",
		"Sab",
		"Dom"
	],
	date_term = "date",
	showLegend = true
}) {
	const today = useMemo(() => new Date(), []);

	const initialMonth = useMemo(() => {
		const selectedDate = parseDate(value);
		const date = selectedDate || today;

		return new Date(
			date.getFullYear(),
			date.getMonth(),
			1
		);
	}, []);

	const [calendarMonth, setCalendarMonth] =
		useState(initialMonth);

	const [schedules, setSchedules] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const cacheRef = useRef(new Map());
	const requestIdRef = useRef(0);

	const fetchSchedules = useCallback(async () => {
		if (typeof loadSchedules !== "function") {
			setSchedules([]);
			return;
		}

		const { start, end, startDate, endDate } =
			getMonthRange(calendarMonth);

		const cacheKey = `${start}:${end}`;
		const cached = cacheRef.current.get(cacheKey);
		const now = Date.now();

		if (
			cached &&
			now - cached.loadedAt < staleTime
		) {
			setSchedules(cached.schedules);
			setError("");
			return;
		}

		const requestId = ++requestIdRef.current;

		setLoading(true);
		setError("");

		try {
			const result = await loadSchedules({
				visibleMonth: calendarMonth,
				startDate,
				endDate,
				start,
				end
			});

			if (requestId !== requestIdRef.current) {
				return;
			}

			const loadedSchedules = Array.isArray(result)
				? result
				: [];

			cacheRef.current.set(cacheKey, {
				schedules: loadedSchedules,
				loadedAt: Date.now()
			});

			setSchedules(loadedSchedules);
		}
		catch (err) {
			if (requestId !== requestIdRef.current) {
				return;
			}

			console.error(err);
			setSchedules([]);
			setError("Não foi possível carregar as marcações.");
		}
		finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [calendarMonth, loadSchedules, staleTime]);

	useEffect(() => {
		fetchSchedules();
	}, [fetchSchedules]);

	useEffect(() => {
		const selectedDate = parseDate(value);

		if (!selectedDate) return;

		setCalendarMonth(previousMonth => {
			const sameMonth =
				previousMonth.getFullYear() ===
					selectedDate.getFullYear() &&
				previousMonth.getMonth() ===
					selectedDate.getMonth();

			if (sameMonth) {
				return previousMonth;
			}

			return new Date(
				selectedDate.getFullYear(),
				selectedDate.getMonth(),
				1
			);
		});
	}, [value]);

	const appointmentsByDate = useMemo(() => {
		return schedules.reduce((result, schedule) => {
			const dateKey = String(
				schedule[date_term] || ""
			).slice(0, 10);

			if (!dateKey) return result;

			result[dateKey] =
				(result[dateKey] || 0) + 1;

			return result;
		}, {});
	}, [schedules, date_term]);

	const calendarDays = useMemo(() => {
		const year = calendarMonth.getFullYear();
		const month = calendarMonth.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const mondayOffset =
			(firstDay.getDay() + 6) % 7;

		const days = [];

		for (
			let index = 0;
			index < mondayOffset;
			index += 1
		) {
			days.push(null);
		}

		for (
			let day = 1;
			day <= lastDay.getDate();
			day += 1
		) {
			days.push(
				new Date(year, month, day)
			);
		}

		while (days.length % 7 !== 0) {
			days.push(null);
		}

		return days;
	}, [calendarMonth]);

	const calendarTitle = useMemo(() => {
		const month = new Intl.DateTimeFormat(locale, {
			month: "long"
		}).format(calendarMonth);

		const year = calendarMonth.getFullYear();

		return `${month} de ${year}`;
	}, [calendarMonth, locale]);

	function changeMonth(offset) {
		setCalendarMonth(previousMonth =>
			new Date(
				previousMonth.getFullYear(),
				previousMonth.getMonth() + offset,
				1
			)
		);
	}

	function selectDate(date) {
		const dateKey = formatDateKey(date);

		onSelect?.(dateKey, date);
	}

	function clearCache() {
		cacheRef.current.clear();
		fetchSchedules();
	}

	const todayKey = formatDateKey(today);

	return (
		<section
			style={{ maxWidth: width }}
			className="mini-calendar-card"
		>
			<div className="mini-calendar-navigation">
				<button
					type="button"
					aria-label="Mês anterior"
					onClick={() => changeMonth(-1)}
				>
					‹
				</button>

				<h2>{calendarTitle}</h2>

				<button
					type="button"
					aria-label="Mês seguinte"
					onClick={() => changeMonth(1)}
				>
					›
				</button>
			</div>

			<div className="mini-calendar-weekdays">
				{weekdays.map(weekday => (
					<span key={weekday}>
						{weekday}
					</span>
				))}
			</div>

			<div className="mini-calendar-grid">
				{calendarDays.map((date, index) => {
					if (!date) {
						return (
							<div
								key={`empty-${index}`}
								className="mini-calendar-day empty"
							/>
						);
					}

					const dateKey =
						formatDateKey(date);

					const count =
						appointmentsByDate[dateKey] || 0;

					const selected =
						value === dateKey;

					const current =
						todayKey === dateKey;

					const className = [
						"mini-calendar-day",
						count > 0
							? "has-appointments"
							: "",
						selected
							? "selected"
							: "",
						current
							? "today"
							: ""
					]
						.filter(Boolean)
						.join(" ");

					return (
						<button
							key={dateKey}
							type="button"
							className={className}
							aria-pressed={selected}
							aria-label={`${dateKey}, ${count} marcações`}
							onClick={() =>
								selectDate(date)
							}
						>
							<span>
								{date.getDate()}
							</span>

							{count > 0 && (
								<strong>
									{count}
								</strong>
							)}
						</button>
					);
				})}
			</div>

			{loading && (
				<p className="mini-calendar-status">
					A carregar marcações...
				</p>
			)}

			{error && (
				<div className="mini-calendar-error">
					<span>{error}</span>

					<button
						type="button"
						onClick={clearCache}
					>
						Tentar novamente
					</button>
				</div>
			)}

			{showLegend && (
				<div className="mini-calendar-legend">
					<span>
						<i className="legend-dot appointments-dot" />
						Marcações
					</span>

					<span>
						<i className="legend-dot selected-dot" />
						Selecionado
					</span>
				</div>
			)}
		</section>
	);
}
