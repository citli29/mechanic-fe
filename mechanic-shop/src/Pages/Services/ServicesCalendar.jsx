import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesCalendar.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const SERVICE_TYPE_COLORS = ["#2563eb", "#e8aa2e", "#ba2323", "#22c55e", "#a3540a", "#e823d1"];

function getServiceTypeAccent(serviceTypeId) {
	if (!serviceTypeId) return "#cbd5e1";
	return SERVICE_TYPE_COLORS[serviceTypeId % SERVICE_TYPE_COLORS.length];
}

const LAB_ACCENT = getServiceTypeAccent(2);
const MECHANIC_ACCENT = getServiceTypeAccent(1);

export default function ServicesCalendar() {

	const navigate = useNavigate();

	const [services, setServices] = useState([]);

	const [serviceTypes, setServiceTypes] = useState([]);

	const [filters, setFilters] = useState({
		car_plate: "",
		client_name: "",
		service_type_id: "",
		status: "all",
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


	async function loadServices() {
		try {
			const params = {};

			if (filters.car_plate) params.car_plate = filters.car_plate;
			if (filters.client_name) params.client_name = filters.client_name;
			if (filters.service_type_id) params.service_type_id = filters.service_type_id;

			if (filters.status !== "all") params.status = filters.status;

			params.start_date = formatDate(new Date(year, month, 1));
			params.end_date = formatDate(new Date(year, month + 1, 0));

			const res = await api.get("/services", { params });

			setServices(res.data.service_list || []);
		} catch (err) {
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

	useEffect(() => { loadServices(); }, [year, month]);

	useEffect(() => {
		const timer = setTimeout(() => { loadServices(); }, 400);
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


	function getServiceStatusClass(service) {
		if (service.checkout) return "appointment-delivered";
		if (service.is_finished === 1) return "appointment-finished";
		return "appointment-pending";
	}


	function getServiceStatusLabel(service) {
		if (service.checkout) return "Entregue";
		if (service.is_finished === 1) return "Terminado";
		return "Por Terminar";
	}


	function renderAppointment(service) {
		return (
			<div
				key={service.id}
				className={`appointment ${getServiceStatusClass(service)}`}
				onClick={() => navigate(`/s/${service.id}`)}
			>
				<div className="appointment-plate">
					{service.car_plate
						? `${service.car_plate} - ${[service.car_make_name, service.car_model_name].filter(Boolean).join(" ")}`
						: [service.car_make_name, service.car_model_name].filter(Boolean).join(" ") || "Sem Viatura"}
				</div>

				<div className="appointment-client">
					{service.client_name || "Sem Cliente"}
				</div>

				<div className="appointment-description">
					{getServiceStatusLabel(service)}
				</div>
			</div>
		);
	}


	function renderDayHalves(dayServices) {
		const labServices = dayServices.filter((s) => s.service_type_id === 2);
		const mechanicServices = dayServices.filter((s) => s.service_type_id !== 2);

		return (
			<div className="day-halves">
				{labServices.length > 0 && (
					<div className="day-half day-half-top" style={{ borderLeftColor: LAB_ACCENT }}>
						<div className="day-half-label">Laboratório</div>

						<div className="appointments">
							{labServices.map((service) => renderAppointment(service))}
						</div>
					</div>
				)}

				{mechanicServices.length > 0 && (
					<div className="day-half day-half-bottom" style={{ borderLeftColor: MECHANIC_ACCENT }}>
						<div className="day-half-label">Mecânica</div>

						<div className="appointments">
							{mechanicServices.map((service) => renderAppointment(service))}
						</div>
					</div>
				)}
			</div>
		);
	}


	const groupedServices = useMemo(() => {
		const grouped = {};

		services.forEach((service) => {
			if (!service.checkin) return;
			if (!grouped[service.checkin]) grouped[service.checkin] = [];
			grouped[service.checkin].push(service);
		});

		return grouped;
	}, [services]);


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
			services: groupedServices[key] || [],
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

								{renderDayHalves(day.services)}
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

							{renderDayHalves(day.services)}
						</div>
					))}
				</div>
			</>
		);
	}

	return (
		<div className="page services-calendar-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Serviços</h1>

						<ViewToggle listPath="/services" calendarPath="/services_calendar" />
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
								name="client_name"
								placeholder="Cliente"
								value={filters.client_name}
								onChange={updateFilter}
							/>

							<select
								name="service_type_id"
								value={filters.service_type_id}
								onChange={updateFilter}
							>
								<option value="">Tipo de Serviço</option>
								{serviceTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>

							<select
								name="status"
								value={filters.status}
								onChange={updateFilter}
							>
								<option value="all">Todos</option>
								<option value="unfinished">Por Terminar</option>
								<option value="finished">Terminados</option>
								<option value="delivered">Entregues</option>
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							<button className="confirm" onClick={() => navigate("/services/new")}>
								<i className="fa-solid fa-plus" /> Adicionar Serviço
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
