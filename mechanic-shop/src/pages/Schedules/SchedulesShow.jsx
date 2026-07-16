import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import "./SchedulesShow.css";

export default function ScheduleDetails() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [schedule, setSchedule] = useState(null);

	const [editing, setEditing] = useState(null);

	const [cars, setCars] = useState([]);
	const [clients, setClients] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [creatingClient, setCreatingClient] = useState(false);
	const [creatingCar, setCreatingCar] = useState(false);

	const [newClient, setNewClient] = useState({
		name: "",
		phone: "",
		address: "",
		email: "",
		zip_code: "",
		tax_nr: ""
	});

	const emptyCar = {
		plate: "",
		make_id: "",
		model_id: "",
		month: "",
		year: "",
		cc: "",
		engine_code: "",
		color_code: "",
		chassi_nr: ""
	};

	const [newCar, setNewCar] = useState(emptyCar);

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

		loadSchedule();
		loadCars();
		loadClients();
		loadMakes();

	}, [id]);


	useEffect(() => {

		if (editing?.make_id) {
			loadModels(editing.make_id);
		}
		else {
			setModels([]);
		}

	}, [editing?.make_id]);


	async function loadSchedule() {

		try {

			const res = await api.get(`/schedules/${id}`);

			setSchedule(res.data.schedule);

			setEditing({

				...res.data.schedule,

				make_id: "",
				model_id: ""

			});

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function loadCars() {

		try {

			const res = await api.get("/cars");

			setCars(res.data.car_list || []);

		}
		catch (err) {

			console.error(err);

		}

	}


	async function loadClients() {

		try {

			const res = await api.get("/clients");

			setClients(res.data.client_list || []);

		}
		catch (err) {

			console.error(err);

		}

	}


	async function loadMakes() {

		try {

			const res = await api.get("/makes");

			setMakes(res.data.make_list || []);

		}
		catch (err) {

			console.error(err);

		}

	}


	async function loadModels(makeId) {

		if (!makeId) {

			setModels([]);
			return;

		}

		try {

			const res = await api.get("/models", {
				params: {
					make_id: makeId
				}
			});

			setModels(res.data.model_list || []);

		}
		catch (err) {

			console.error(err);

			setModels([]);

		}

	}
	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			if (name === "car_id") {

				if (value === "new") {
					setCreatingCar(true);
					return prev;
				}

				if (value !== "") {

					updated.make_id = "";
					updated.model_id = "";

				}

			}

			if (name === "client_id" && value === "new") {

				setCreatingClient(true);
				return prev;

			}

			if (name === "make_id") {

				updated.model_id = "";

				loadModels(value);

			}

			return updated;

		});

	}


	function updateNewClient(e) {

		const { name, value } = e.target;

		setNewClient(prev => ({
			...prev,
			[name]: value
		}));

	}


	function updateNewCar(e) {

		const { name, value } = e.target;

		setNewCar(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			if (name === "make_id") {

				updated.model_id = "";

				loadModels(value);

			}

			return updated;

		});

	}


	async function createClient() {

		if (!newClient.name.trim()) {

			showMessage("error", "Client name is required.");
			return;

		}

		if (!newClient.phone.trim()) {

			showMessage("error", "Phone is required.");
			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newClient)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.post("/clients", data);

			const client = res.data.client;

			setClients(prev => [
				...prev,
				client
			]);

			setEditing(prev => ({
				...prev,
				client_id: client.id
			}));

			setCreatingClient(false);

			setNewClient({
				name: "",
				phone: "",
				address: "",
				email: "",
				zip_code: "",
				tax_nr: ""
			});

			showMessage(
				"success",
				"Client created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function createCar() {

		if (!newCar.plate.trim()) {

			showMessage("error", "Plate is required.");
			return;

		}

		if (!newCar.make_id) {

			showMessage("error", "Please select a make.");
			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newCar)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.post("/cars", data);

			const car = res.data.car;

			setCars(prev => [
				...prev,
				car
			]);

			setEditing(prev => ({
				...prev,
				car_id: car.id,
				make_id: "",
				model_id: ""
			}));

			setCreatingCar(false);

			setNewCar(emptyCar);

			showMessage(
				"success",
				"Car created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function saveSchedule() {

		try {

			const data = {
				date: editing.date,
				description: editing.description
			};

			if (editing.client_id)
				data.client_id = editing.client_id;

			if (editing.car_id) {

				data.car_id = editing.car_id;

			}
			else if (editing.model_id) {

				data.model_id = editing.model_id;

			}

			await api.put(
				`/schedules/${id}`,
				data
			);

			showMessage(
				"success",
				"Schedule updated successfully."
			);

			loadSchedule();

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function deleteSchedule() {

		if (!window.confirm("Delete this schedule?"))
			return;

		try {

			await api.delete(`/schedules/${id}`);

			showMessage(
				"success",
				"Schedule deleted successfully."
			);

			navigate("/schedules");

		}
		catch (err) {

			handleApiError(err);

		}

	}
	return (

		<div className="container">

			<h1>Schedule #{id}</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			{editing && (

				<div className="details-card">

					<div className="details-grid">

						<div className="field">

							<label>Date</label>

							<input
								type="date"
								name="date"
								value={editing.date || ""}
								onChange={updateEdit}
							/>

						</div>

						<div className="field field-full">

							<label>Description</label>

							<textarea
								name="description"
								value={editing.description || ""}
								onChange={updateEdit}
							/>

						</div>

						<div className="field">

							<label>Client</label>

							{!creatingClient ? (

								<select
									name="client_id"
									value={editing.client_id || ""}
									onChange={updateEdit}
								>

									<option value="">
										No client
									</option>

									{clients.map(client => (

										<option
											key={client.id}
											value={client.id}
										>
											{client.name}
										</option>

									))}

									<option value="new">
										+ Create new client
									</option>

								</select>

							) : (

								<div className="inline-create">

									<input
										name="name"
										placeholder="Client name"
										value={newClient.name}
										onChange={updateNewClient}
									/>

									<input
										name="phone"
										placeholder="Phone"
										value={newClient.phone}
										onChange={updateNewClient}
									/>

									<input
										name="email"
										placeholder="Email"
										value={newClient.email}
										onChange={updateNewClient}
									/>

									<input
										name="address"
										placeholder="Address"
										value={newClient.address}
										onChange={updateNewClient}
									/>

									<input
										name="zip_code"
										placeholder="Zip Code"
										value={newClient.zip_code}
										onChange={updateNewClient}
									/>

									<input
										name="tax_nr"
										placeholder="Tax Number"
										value={newClient.tax_nr}
										onChange={updateNewClient}
									/>

									<div className="create-buttons">

										<button onClick={createClient}>
											Add
										</button>

										<button
											onClick={() => {

												setCreatingClient(false);

												setNewClient({
													name: "",
													phone: "",
													address: "",
													email: "",
													zip_code: "",
													tax_nr: ""
												});

											}}
										>
											X
										</button>

									</div>

								</div>

							)}

						</div>

						<div className="field">

							<label>Car</label>

							{!creatingCar ? (

								<select
									name="car_id"
									value={editing.car_id || ""}
									onChange={updateEdit}
								>

									<option value="">
										No car
									</option>

									{cars.map(car => (

										<option
											key={car.id}
											value={car.id}
										>
											{car.plate}
										</option>

									))}

									<option value="new">
										+ Create new car
									</option>

								</select>

							) : (

								<div className="inline-create">

									<input
										name="plate"
										placeholder="Plate"
										value={newCar.plate}
										onChange={updateNewCar}
									/>

									<select
										name="make_id"
										value={newCar.make_id}
										onChange={updateNewCar}
									>

										<option value="">
											Select Make
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

									<select
										name="model_id"
										value={newCar.model_id}
										onChange={updateNewCar}
										disabled={!newCar.make_id}
									>

										<option value="">
											Select Model
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

									<div className="create-buttons">

										<button onClick={createCar}>
											Add
										</button>

										<button
											onClick={() => {

												setCreatingCar(false);
												setNewCar(emptyCar);

											}}
										>
											X
										</button>

									</div>

								</div>

							)}

						</div>

						{!editing.car_id && (

							<>

								<div className="field">

									<label>Make</label>

									<select
										name="make_id"
										value={editing.make_id || ""}
										onChange={updateEdit}
									>

										<option value="">
											Select Make
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

								</div>

								<div className="field">

									<label>Model</label>

									<select
										name="model_id"
										value={editing.model_id || ""}
										onChange={updateEdit}
										disabled={!editing.make_id}
									>

										<option value="">
											Select Model
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

								</div>

							</>

						)}

					</div>

					<div className="details-actions">

						<button onClick={saveSchedule}>
							Save
						</button>

						<button
							className="delete-btn"
							onClick={deleteSchedule}
						>
							Delete
						</button>

						<button
							onClick={() => navigate("/schedules")}
						>
							Back
						</button>

					</div>

				</div>

			)}

		</div>

	);

}
