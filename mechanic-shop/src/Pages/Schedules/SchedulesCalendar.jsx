import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/SchedulesCalendar.css";

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

export default function SchedulesCalendar() {

	const navigate = useNavigate();

	const [schedules, setSchedules] = useState([]);

	const [filters, setFilters] = useState({
		car_plate: "",
		car_make: "",
		car_model: "",
		client_name: "",
	});

	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());

	const [weekIndex, setWeekIndex] = useState(0);
	const [weekIndexMonthKey, setWeekIndexMonthKey] = useState(`${now.getFullYear()}-${now.getMonth()}`);

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);


	const currentMonthKey = `${year}-${month}`;

	if (currentMonthKey !== weekIndexMonthKey) {
		setWeekIndexMonthKey(currentMonthKey);
		setWeekIndex(0);
	}


	function showMessage(type, text) {
		setMessage({ type, text });

		setTimeout(() => {
			setMessage({ type: "", text: "" });
		}, 4000);
	}


	function handleApiError(err) {
		if (err.response?.data?.error) {
			showMessage("error", err.response.data.error);
		} else {
			showMessage("error", "Something went wrong.");
		}

		console.error(err);
	}


	async function loadSchedules() {
		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.start_date = formatDate(new Date(year, month, 1));
			params.end_date = formatDate(new Date(year, month + 1, 0));

			const res = await api.get("/schedules", { params });

			setSchedules(res.data.schedule_list || []);
		} catch (err) {
			handleApiError(err);
		}
	}


	useEffect(() => { loadSchedules(); }, [year, month]);

	useEffect(() => {
		const timer = setTimeout(() => { loadSchedules(); }, 400);
		return () => clearTimeout(timer);
	}, [filters]);


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function clearFilters() {
		setFilters({ car_plate: "", car_make: "", car_model: "", client_name: "" });
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
			<div
				key={schedule.id}
				className={`appointment ${getAppointmentStatusClass(schedule)}`}
				onClick={() => navigate(`/schedules/${schedule.id}`)}
			>
				<div className="appointment-plate">
					{schedule.car_plate
						? `${schedule.car_plate} - ${[schedule.car_make, schedule.car_model].filter(Boolean).join(" ")}`
						: [schedule.car_make, schedule.car_model].filter(Boolean).join(" ") || "Sem Viatura"}
				</div>

				<div className="appointment-client">
					{schedule.client_name || "Sem Cliente"}
				</div>

				<div className="appointment-description">
					{schedule.description}
				</div>
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


	const daysInMonth = new Date(year, month + 1, 0).getDate();

	const firstDay = new Date(year, month, 1).getDay();

	const startDay = firstDay === 0 ? 6 : firstDay - 1;

	const calendarDays = [];

	for (let i = 0; i < startDay; i++) {
		calendarDays.push(null);
	}

	for (let day = 1; day <= daysInMonth; day++) {
		const key = formatDate(new Date(year, month, day));

		calendarDays.push({
			day,
			key,
			schedules: groupedSchedules[key] || [],
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

	function previousWeek() {
		setWeekIndex((prev) => Math.max(0, prev - 1));
	}

	function nextWeek() {
		setWeekIndex((prev) => Math.min(weeksOfMonth.length - 1, prev + 1));
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
						className={`calendar-day ${!day ? "empty" : ""}`}
					>
						{day && (
							<>
								<div className="day-number">{day.day}</div>

								<div className="appointments">
									{day.schedules.map((schedule) => renderAppointment(schedule))}
								</div>
							</>
						)}
					</div>
				))}

			</div>
		);
	}


	function renderCalendarMobile() {
		const week = weeksOfMonth[weekIndex] || [];

		return (
			<>
				<div className="week-navigation">
					<button className="accent" disabled={weekIndex <= 0} onClick={previousWeek}>
						<i className="fa-solid fa-chevron-left" />
					</button>

					<span>Semana {weekIndex + 1} de {weeksOfMonth.length}</span>

					<button
						className="accent"
						disabled={weekIndex >= weeksOfMonth.length - 1}
						onClick={nextWeek}
					>
						<i className="fa-solid fa-chevron-right" />
					</button>
				</div>

				<div className="calendar calendar-vertical">
					{week.map((day, index) => day && (
						<div key={day.key} className="calendar-day">
							<div className="day-label">
								<span className="weekday-name">{WEEKDAY_NAMES[index]}</span>
								<span className="day-number">{day.day}</span>
							</div>

							<div className="appointments">
								{day.schedules.map((schedule) => renderAppointment(schedule))}
							</div>
						</div>
					))}
				</div>
			</>
		);
	}

	return (
		<div className="page schedules-calendar-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-days" />
						<h1>Calendário</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="month-navigation">
							<button className="accent" onClick={previousMonth}>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<h2>{monthName}</h2>

							<button className="accent" onClick={nextMonth}>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

						<div className="filters">
							<input
								name="car_plate"
								placeholder="Matrícula"
								value={filters.car_plate}
								onChange={updateFilter}
							/>

							<input
								name="car_make"
								placeholder="Marca"
								value={filters.car_make}
								onChange={updateFilter}
							/>

							<input
								name="car_model"
								placeholder="Modelo"
								value={filters.car_model}
								onChange={updateFilter}
							/>

							<input
								name="client_name"
								placeholder="Cliente"
								value={filters.client_name}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							<button className="confirm" onClick={() => navigate("/schedules/new")}>
								<i className="fa-solid fa-plus" /> Adicionar Marcação
							</button>
						</div>

						<div className="calendar-wrapper">
							{isMobile ? renderCalendarMobile() : renderCalendarDesktop()}
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
