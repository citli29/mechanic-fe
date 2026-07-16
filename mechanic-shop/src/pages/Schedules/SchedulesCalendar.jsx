import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./SchedulesCalendar.css";

export default function SchedulesCalendar() {

	const navigate = useNavigate();

	const [schedules, setSchedules] = useState([]);

	const [filters, setFilters] = useState({
		car_plate: "",
		car_make: "",
		car_model: "",
		client_name: ""
	});

	const [currentMonth, setCurrentMonth] = useState(new Date());

	const [loading, setLoading] = useState(false);

	const [message, setMessage] = useState({
		type: "",
		text: ""
	});


	function showMessage(type, text) {

		setMessage({
			type,
			text
		});

		setTimeout(() => {

			setMessage({
				type: "",
				text: ""
			});

		}, 4000);

	}


	function handleApiError(err) {

		if (err.response?.data?.error) {

			showMessage(
				"error",
				err.response.data.error
			);

		}
		else {

			showMessage(
				"error",
				"Something went wrong."
			);

		}

		console.error(err);

	}


	useEffect(() => {

		loadSchedules();

	}, []);


	useEffect(() => {

		const timer = setTimeout(() => {

			loadSchedules();

		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);


	async function loadSchedules() {

		try {

			setLoading(true);

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/schedules", {
				params
			});

			setSchedules(res.data.schedule_list || []);

		}
		catch (err) {

			handleApiError(err);

		}
		finally {

			setLoading(false);

		}

	}


	function updateFilter(e) {

		setFilters({
			...filters,
			[e.target.name]: e.target.value
		});

	}


	function clearFilters() {

		setFilters({
			car_plate: "",
			car_make: "",
			car_model: "",
			client_name: ""
		});

	}


	function previousMonth() {

		setCurrentMonth(prev =>
			new Date(
				prev.getFullYear(),
				prev.getMonth() - 1,
				1
			)
		);

	}


	function nextMonth() {

		setCurrentMonth(prev =>
			new Date(
				prev.getFullYear(),
				prev.getMonth() + 1,
				1
			)
		);

	}


	const monthSchedules = useMemo(() => {

		return schedules.filter(schedule => {

			const date = new Date(schedule.date);

			return (
				date.getFullYear() === currentMonth.getFullYear() &&
					date.getMonth() === currentMonth.getMonth()
			);

		});

	}, [schedules, currentMonth]);


	const groupedSchedules = useMemo(() => {

		const grouped = {};

		monthSchedules.forEach(schedule => {

			if (!grouped[schedule.date]) {

				grouped[schedule.date] = [];

			}

			grouped[schedule.date].push(schedule);

		});

		return grouped;

	}, [monthSchedules]);


	const daysInMonth = new Date(
		currentMonth.getFullYear(),
		currentMonth.getMonth() + 1,
		0
	).getDate();


	const firstDay = new Date(
		currentMonth.getFullYear(),
		currentMonth.getMonth(),
		1
	).getDay();


	const startDay = firstDay === 0 ? 6 : firstDay - 1;


	const calendarDays = [];

	for (let i = 0; i < startDay; i++) {

		calendarDays.push(null);

	}

	for (let day = 1; day <= daysInMonth; day++) {

		const date = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);

		const key = date.toISOString().split("T")[0];

		calendarDays.push({
			day,
			key,
			schedules: groupedSchedules[key] || []
		});

	}


	const monthName = currentMonth.toLocaleString(
		"default",
		{
			month: "long",
			year: "numeric"
		}
	); 
	return (
		<div className="container">

			<h1>Schedule</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			<div className="month-navigation">

				<button onClick={previousMonth}>
					◀
				</button>

				<h2>{monthName}</h2>

				<button onClick={nextMonth}>
					▶
				</button>

			</div>

			<div className="filters">

				<input
					name="car_plate"
					placeholder="Plate"
					value={filters.car_plate}
					onChange={updateFilter}
				/>

				<input
					name="car_make"
					placeholder="Make"
					value={filters.car_make}
					onChange={updateFilter}
				/>

				<input
					name="car_model"
					placeholder="Model"
					value={filters.car_model}
					onChange={updateFilter}
				/>

				<input
					name="client_name"
					placeholder="Client"
					value={filters.client_name}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Clear
				</button>

			</div>

			<div className="calendar">

				<div className="calendar-header">Mon</div>
				<div className="calendar-header">Tue</div>
				<div className="calendar-header">Wed</div>
				<div className="calendar-header">Thu</div>
				<div className="calendar-header">Fri</div>
				<div className="calendar-header">Sat</div>
				<div className="calendar-header">Sun</div>

				{calendarDays.map((day, index) => (

					<div
						key={index}
						className={`calendar-day ${!day ? "empty" : ""}`}
					>

						{day && (
							<>

								<div className="day-number">
									{day.day}
								</div>

								<div className="appointments">

									{day.schedules.map(schedule => (

										<div
											key={schedule.id}
											className="appointment"
											onClick={() =>
												navigate(`/schedules/${schedule.id}`)
											}
										>

											<div className="appointment-plate">
												{schedule.car_plate || "No Car"}
											</div>

											<div className="appointment-client">
												{schedule.client_name || "No Client"}
											</div>

											<div className="appointment-description">
												{schedule.description}
											</div>

										</div>

									))}

								</div>

							</>
						)}

					</div>

				))}

			</div>

		</div>
	);
}
