import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function SchedulesList() {

	const navigate = useNavigate();

	const [schedules, setSchedules] = useState([]);
	const [clients, setClients] = useState([]);
	const [cars, setCars] = useState([]);

	const [filters, setFilters] = useState({
		day: "",
		month: "",
		year: "",
		client_name: "",
		car_plate: "",
		car_make: "",
		car_model: ""
	});

	const [editing, setEditing] = useState(null);

	const [loading, setLoading] = useState(false);

	const [message, setMessage] = useState({
		type: "",
		text: ""
	});

	const emptySchedule = {
		date: "",
		description: "",
		client_id: "",
		car_id: ""
	};

	const [creatingSchedule, setCreatingSchedule] = useState(false);
	const [newSchedule, setNewSchedule] = useState(emptySchedule);

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
		loadClients();
		loadCars();

	}, []);

	useEffect(() => {

		const timer = setTimeout(() => {

			loadSchedules();

		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);

	function buildDateFilter() {

		if (!filters.year)
			return "";

		let date = filters.year;

		if (filters.month)
			date += "-" + filters.month.padStart(2, "0");

		if (filters.day)
			date += "-" + filters.day.padStart(2, "0");

		return date;

	}

	async function loadSchedules() {

		try {

			setLoading(true);

			const params = {};

			const date = buildDateFilter();

			if (date)
				params.date = date;

			if (filters.client_name)
				params.client_name = filters.client_name;

			if (filters.car_plate)
				params.car_plate = filters.car_plate;

			if (filters.car_make)
				params.car_make = filters.car_make;

			if (filters.car_model)
				params.car_model = filters.car_model;

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

	async function loadClients() {

		try {

			const res = await api.get("/clients");

			setClients(res.data.client_list || []);

		}
		catch (err) {

			console.error(err);
			setClients([]);

		}

	}

	async function loadCars() {

		try {

			const res = await api.get("/cars");

			setCars(res.data.car_list || []);

		}
		catch (err) {

			console.error(err);
			setCars([]);

		}

	}

	function updateFilter(e) {

		let { name, value } = e.target;

		// Only allow numbers for date fields
		if (["day", "month", "year"].includes(name)) {

			value = value.replace(/\D/g, "");

			if (name === "day")
				value = value.slice(0, 2);

			if (name === "month")
				value = value.slice(0, 2);

			if (name === "year")
				value = value.slice(0, 4);

		}

		setFilters(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			// If year is removed, clear month and day
			if (name === "year" && value === "") {
				updated.month = "";
				updated.day = "";
			}

			// If month is removed, clear day
			if (name === "month" && value === "") {
				updated.day = "";
			}

			return updated;

		});

	}

	function padDateField(e) {

		const { name } = e.target;

		if (!["day", "month"].includes(name))
			return;

		setFilters(prev => {

			let value = prev[name];

			if (value.length === 1)
				value = value.padStart(2, "0");

			return {
				...prev,
				[name]: value
			};

		});

	}

	function clearFilters() {

		setFilters({
			day: "",
			month: "",
			year: "",
			client_name: "",
			car_plate: "",
			car_make: "",
			car_model: ""
		});

	}

	function editSchedule(schedule) {

		setEditing({
			...schedule
		});

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value
		});

	}

	function updateNewSchedule(e) {

		const { name, value } = e.target;

		setNewSchedule(prev => ({
			...prev,
			[name]: value
		}));

	}
	async function saveSchedule() {

		try {

			const data = Object.fromEntries(
				Object.entries(editing)
					.filter(([_, value]) => value !== "")
			);

			await api.put(
				`/schedules/${editing.id}`,
				data
			);

			showMessage(
				"success",
				"Schedule updated successfully."
			);

			setEditing(null);

			loadSchedules();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function createSchedule() {

		if (!newSchedule.date) {

			showMessage(
				"error",
				"Date is required."
			);

			return;

		}

		if (!newSchedule.description.trim()) {

			showMessage(
				"error",
				"Description is required."
			);

			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newSchedule)
					.filter(([_, value]) => value !== "")
			);

			await api.post(
				"/schedules",
				data
			);

			showMessage(
				"success",
				"Schedule created successfully."
			);

			setCreatingSchedule(false);

			setNewSchedule(emptySchedule);

			loadSchedules();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function deleteSchedule(id) {

		if (!window.confirm("Delete this schedule?"))
			return;

		try {

			await api.delete(`/schedules/${id}`);

			showMessage(
				"success",
				"Schedule deleted successfully."
			);

			loadSchedules();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	// return (

	/*
	Replace your old date filter with these three inputs:

	<input
		name="day"
		placeholder="DD"
		maxLength={2}
		value={filters.day}
		onChange={updateFilter}
		onBlur={padDateField}
		disabled={!filters.month}
	/>

	<input
		name="month"
		placeholder="MM"
		maxLength={2}
		value={filters.month}
		onChange={updateFilter}
		onBlur={padDateField}
		disabled={!filters.year}
	/>

	<input
		name="year"
		placeholder="YYYY"
		maxLength={4}
		value={filters.year}
		onChange={updateFilter}
	/>

	*/
	return (
		<div className="container">

			<h1>Schedules</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			<div className="filters">

				<input
					name="year"
					placeholder="YYYY"
					maxLength={4}
					value={filters.year}
					onChange={updateFilter}
				/>

				<input
					name="month"
					placeholder="MM"
					maxLength={2}
					value={filters.month}
					onChange={updateFilter}
					onBlur={padDateField}
					disabled={!filters.year}
				/>

				<input
					name="day"
					placeholder="DD"
					maxLength={2}
					value={filters.day}
					onChange={updateFilter}
					onBlur={padDateField}
					disabled={!filters.month}
				/>
				<input
					name="client_name"
					placeholder="Client"
					value={filters.client_name}
					onChange={updateFilter}
				/>

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

				<button onClick={clearFilters}>
					Clear
				</button>

				<button onClick={() => navigate("/schedules/new")}>
					Add Schedule
				</button>

			</div>

			<table className="table">

				<thead>
					<tr>
						<th>Date</th>
						<th>Client</th>
						<th>Phone</th>
						<th>Plate</th>
						<th>Make</th>
						<th>Model</th>
						<th>Description</th>
						<th></th>
					</tr>
				</thead>

				<tbody>

					{loading ? (

						<tr>
							<td colSpan={8}>
								Loading...
							</td>
						</tr>

					) : schedules.length === 0 ? (

							<tr>
								<td colSpan={8}>
									No schedules found.
								</td>
							</tr>

						) : (

								schedules.map(schedule => (

									<tr
										key={schedule.id}
										onClick={() => navigate(`/schedules/${schedule.id}`)}
										style={{ cursor: "pointer" }}
									>

										<td>{schedule.date}</td>

										<td>
											{schedule.client_name || "-"}
										</td>

										<td>
											{schedule.client_phone || "-"}
										</td>

										<td>
											{schedule.car_plate || "-"}
										</td>

										<td>
											{schedule.car_make || "-"}
										</td>

										<td>
											{schedule.car_model || "-"}
										</td>

										<td>
											{schedule.description}
										</td>

										<td>

											<div className="container-buttons">

												<button
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/schedules/${schedule.id}`);
													}}
												>
													Open
												</button>

												<button
													className="delete-btn"
													onClick={(e) => {
														e.stopPropagation();
														deleteSchedule(schedule.id);
													}}
												>
													Delete
												</button>

											</div>

										</td>

									</tr>

								))

							)}

				</tbody>

			</table>

		</div>
	);
}
