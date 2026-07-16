import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./CarsList.css";

export default function CarsList() {
	const navigate = useNavigate();

	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [filters, setFilters] = useState({
		plate: "",
		year: "",
		month: "",
		model_name: "",
		make_name: "",
	});

	const [editing, setEditing] = useState(null);
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
		} else {
			showMessage(
				"error",
				"Something went wrong."
			);
		}

		console.error(err);
	}

	useEffect(() => {
		loadCars();
		loadMakes();
	}, []);


	useEffect(() => {
		const timer = setTimeout(() => {
			loadCars();
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadCars() {
		try {
			setLoading(true);

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/cars", { params });

			setCars(res.data.car_list || []);

		} catch (err) {
			console.error(err);
			setCars([]);
		} finally {
			setLoading(false);
		}
	}


	async function loadMakes() {
		try {
			const res = await api.get("/makes");
			setMakes(res.data.make_list || []);

		} catch (err) {
			console.error(err);
			setMakes([]);
		}
	}


	async function loadModels(make_id) {
		if (!make_id) {
			setModels([]);
			return;
		}

		try {
			const res = await api.get("/models", {
				params: {
					make_id
				}
			});

			setModels(res.data.model_list || []);

		} catch (err) {
			console.error(err);
			setModels([]);
		}
	}


	function updateFilter(e) {
		setFilters({
			...filters,
			[e.target.name]: e.target.value,
		});
	}


	function editCar(car) {
		setEditing({
			...car
		});

		loadModels(car.make_id);
	}


	function updateEdit(e) {
		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});

		if (name === "make_id") {
			loadModels(value);

			setEditing(prev => ({
				...prev,
				make_id: value,
				model_id: ""
			}));
		}
	}


	/*async function saveCar() {
		try {
			await api.put(`/cars/${editing.id}`, editing);

			setEditing(null);
			loadCars();

		} catch (err) {
			console.error("Update failed:", err);
		}
	}
	async function saveCar() {
		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/cars/${editing.id}`, data);

			setEditing(null);
			loadCars();

		} catch (err) {
			handleApiError(err);
		}
	}*/
	async function saveCar() {
	try {

		const data = Object.fromEntries(
			Object.entries(editing)
				.filter(([_, value]) => value !== "")
		);

		await api.put(`/cars/${editing.id}`, data);

		showMessage(
			"success",
			"Car updated successfully."
		);

		setEditing(null);
		loadCars();

	} catch (err) {
		handleApiError(err);
	}
}

	function clearFilters() {
		setFilters({
			plate: "",
			year: "",
			month: "",
			model_name: "",
			make_name: "",
		});
	}


			/*{error && (
				<div className="api-error">
					{error}
				</div>
			)}*/
	return (
		<div className="cars-container">

			<h1>Cars</h1>
			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}


			<div className="filters">

				<input
					name="plate"
					placeholder="Plate"
					value={filters.plate}
					onChange={updateFilter}
				/>

				<input
					name="year"
					placeholder="Year"
					value={filters.year}
					onChange={updateFilter}
				/>

				<input
					name="month"
					placeholder="Month"
					value={filters.month}
					onChange={updateFilter}
				/>

				<input
					name="make_name"
					placeholder="Make"
					value={filters.make_name}
					onChange={updateFilter}
				/>

				<input
					name="model_name"
					placeholder="Model"
					value={filters.model_name}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Clear
				</button>

			</div>


			{loading && <p>Loading...</p>}


			<table className="cars-table">

				<thead>
					<tr>
						<th>Plate</th>
						<th>Make</th>
						<th>Model</th>
						<th>Month</th>
						<th>Year</th>
						<th>CC</th>
						<th>Engine</th>
						<th>Color</th>
						<th>Chassi</th>
						<th></th>
					</tr>
				</thead>


				<tbody>

					{cars.map(car => (

						editing?.id === car.id ? (

							<tr key={car.id}>

								<td>
									<input
										name="plate"
										value={editing.plate || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<select
										name="make_id"
										value={editing.make_id || ""}
										onChange={updateEdit}
									>
										<option value="">
											Make
										</option>

										{makes.map(make => (
											<option
												key={make.id}
												value={make.id}
											>
												{make.name}
											</option>
										))}
									</select>
								</td>


								<td>
									<select
										name="model_id"
										value={editing.model_id || ""}
										onChange={updateEdit}
									>
										<option value="">
											Model
										</option>

										{models.map(model => (
											<option
												key={model.id}
												value={model.id}
											>
												{model.name}
											</option>
										))}
									</select>
								</td>


								<td>
									<input
										name="month"
										value={editing.month || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<input
										name="year"
										value={editing.year || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<input
										name="cc"
										value={editing.cc || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<input
										name="engine_code"
										value={editing.engine_code || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<input
										name="color_code"
										value={editing.color_code || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<input
										name="chassi_nr"
										value={editing.chassi_nr || ""}
										onChange={updateEdit}
									/>
								</td>


								<td>
									<button onClick={saveCar}>
										Save
									</button>

									<button onClick={() => setEditing(null)}>
										X
									</button>
								</td>

							</tr>


						) : (

							<tr
								key={car.id}
								onClick={() => navigate(`/cars/${car.id}`)}
							>

								<td>{car.plate}</td>
								<td>{car.make_name}</td>
								<td>{car.model_name}</td>
								<td>{car.month}</td>
								<td>{car.year}</td>
								<td>{car.cc}</td>
								<td>{car.engine_code}</td>
								<td>{car.color_code}</td>
								<td>{car.chassi_nr}</td>

								<td>
									<button
										onClick={(e) => {
											e.stopPropagation();
											editCar(car);
										}}
									>
										Edit
									</button>
								</td>

							</tr>

						)

					))}

				</tbody>

			</table>

		</div>
	);
}
