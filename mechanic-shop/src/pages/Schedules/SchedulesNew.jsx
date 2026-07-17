import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./SchedulesShow.css";

export default function SchedulesNew() {

	const navigate = useNavigate();

	const emptySchedule = {
		date: "",
		description: "",
		client_id: "",
		car_id: "",
		make_id: "",
		model_id: ""
	};

	const [editing, setEditing] = useState(emptySchedule);

	const [cars, setCars] = useState([]);
	const [clients, setClients] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [creatingClient, setCreatingClient] = useState(false);
	const [creatingCar, setCreatingCar] = useState(false);
	const [creatingMake, setCreatingMake] = useState(false);
	const [creatingModel, setCreatingModel] = useState(false);

	const emptyClient = {
		name: "",
		phone: "",
		address: "",
		email: "",
		zip_code: "",
		tax_nr: ""
	};

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

	const [newClient, setNewClient] = useState(emptyClient);
	const [newCar, setNewCar] = useState(emptyCar);

	const [newMakeName, setNewMakeName] = useState("");
	const [newModelName, setNewModelName] = useState("");

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

		loadCars();
		loadClients();
		loadMakes();

	}, []);

	useEffect(() => {

		if (editing.make_id) {

			loadModels(editing.make_id);

		}
		else {

			setModels([]);

		}

	}, [editing.make_id]);

	async function loadCars() {

		try {

			const res = await api.get("/cars");

			setCars(res.data.car_list || []);

		}
		catch {

			setCars([]);

		}

	}

	async function loadClients() {

		try {

			const res = await api.get("/clients");

			setClients(res.data.client_list || []);

		}
		catch {

			setClients([]);

		}

	}

	async function loadMakes() {

		try {

			const res = await api.get("/makes");

			setMakes(res.data.make_list || []);

		}
		catch {

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
				params: { make_id }
			});

			setModels(res.data.model_list || []);

		}
		catch {

			setModels([]);

		}

	}

	const selectedClient = clients.find(
		client => client.id === Number(editing.client_id)
	);

	const selectedCar = cars.find(
		car => car.id === Number(editing.car_id)
	);

	function updateEdit(e) {

		const { name, value } = e.target;

		if (name === "client_id" && value === "new") {

			setCreatingClient(true);
			return;

		}

		if (name === "car_id" && value === "new") {

			setCreatingCar(true);
			return;

		}

		setEditing(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			if (name === "car_id" && value !== "") {

				updated.make_id = "";
				updated.model_id = "";

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
	async function createMake() {

		if (!newMakeName.trim()) {

			showMessage(
				"error",
				"Make name is required."
			);

			return;

		}

		try {

			const res = await api.post("/makes", {
				name: newMakeName
			});

			const make = res.data.make;

			setMakes(prev => [
				...prev,
				make
			]);

			setNewCar(prev => ({
				...prev,
				make_id: make.id,
				model_id: ""
			}));

			setCreatingMake(false);
			setNewMakeName("");

			showMessage(
				"success",
				"Make created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function createModel() {

		if (!newCar.make_id) {

			showMessage(
				"error",
				"Select a make first."
			);

			return;

		}

		if (!newModelName.trim()) {

			showMessage(
				"error",
				"Model name is required."
			);

			return;

		}

		try {

			const res = await api.post("/models", {
				name: newModelName,
				make_id: newCar.make_id
			});

			const model = res.data.model;

			setModels(prev => [
				...prev,
				model
			]);

			setNewCar(prev => ({
				...prev,
				model_id: model.id
			}));

			setCreatingModel(false);
			setNewModelName("");

			showMessage(
				"success",
				"Model created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function createClient() {

		if (!newClient.name.trim()) {

			showMessage(
				"error",
				"Client name is required."
			);

			return;

		}

		if (!newClient.phone.trim()) {

			showMessage(
				"error",
				"Phone is required."
			);

			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newClient)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.post(
				"/clients",
				data
			);

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
			setNewClient(emptyClient);

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

			showMessage(
				"error",
				"Plate is required."
			);

			return;

		}

		if (!newCar.make_id) {

			showMessage(
				"error",
				"Please select a make."
			);

			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newCar)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.post(
				"/cars",
				data
			);

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
			setCreatingMake(false);
			setCreatingModel(false);

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

	async function createSchedule() {

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

			const res = await api.post(
				"/schedules",
				data
			);

			showMessage(
				"success",
				"Schedule created successfully."
			);

			navigate(`/schedules/${res.data.schedule.id}`);

		}
		catch (err) {

			handleApiError(err);

		}

	}

	return (

		<div className="container">

			<h1>New Schdeule</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

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

						{

							!creatingClient ? (

								<>

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
												{client.name} ({client.phone})
											</option>
										))}

										<option value="new">
											+ Create new client
										</option>

									</select>

									{selectedClient && (

										<div className="info-box">

											<div><strong>Name:</strong> {selectedClient.name}</div>
											<div><strong>Phone:</strong> {selectedClient.phone}</div>
											<div><strong>Email:</strong> {selectedClient.email || "-"}</div>
											<div><strong>Address:</strong> {selectedClient.address || "-"}</div>
											<div><strong>ZIP:</strong> {selectedClient.zip_code || "-"}</div>
											<div><strong>Tax:</strong> {selectedClient.tax_nr || "-"}</div>

										</div>

									)}

								</>

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
											placeholder="ZIP Code"
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
													setNewClient(emptyClient);

												}}
											>
												X
											</button>

										</div>

									</div>

								)
						}
					</div>

					<div className="field">

						<label>Car</label>

						{

							!creatingCar ? (

								<>

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

									{selectedCar && (

										<div className="info-box">

											<div>
												<strong>Plate:</strong> {selectedCar.plate}
											</div>

											<div>
												<strong>Make:</strong> {selectedCar.make_name}
											</div>

											<div>
												<strong>Model:</strong> {selectedCar.model_name}
											</div>

										</div>

									)}

								</>

							) : (

								<div className="inline-create">

									<input
										name="plate"
										placeholder="Plate"
										value={newCar.plate}
										onChange={updateNewCar}
									/>

									{!creatingMake ? (

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

											<option value="new">
												+ Create new make
											</option>

										</select>

									) : (

										<>
											<input
												placeholder="New make"
												value={newMakeName}
												onChange={(e) =>
													setNewMakeName(e.target.value)
												}
											/>

											<div className="create-buttons">

												<button onClick={createMake}>
													Add
												</button>

												<button
													onClick={() => {
														setCreatingMake(false);
														setNewMakeName("");
													}}
												>
													X
												</button>

											</div>

										</>

									)}
																		{!creatingModel ? (

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

											<option value="new">
												+ Create new model
											</option>

										</select>

									) : (

										<>

											<input
												placeholder="New model"
												value={newModelName}
												onChange={(e) =>
													setNewModelName(e.target.value)
												}
											/>

											<div className="create-buttons">

												<button onClick={createModel}>
													Add
												</button>

												<button
													onClick={() => {

														setCreatingModel(false);
														setNewModelName("");

													}}
												>
													X
												</button>

											</div>

										</>

									)}

									<div className="create-buttons">

										<button onClick={createCar}>
											Add Car
										</button>

										<button
											onClick={() => {

												setCreatingCar(false);
												setCreatingMake(false);
												setCreatingModel(false);

												setNewCar(emptyCar);

											}}
										>
											Cancel
										</button>

									</div>

								</div>

							)

						}

					</div>

					{!editing.car_id && !creatingCar &&(

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
					<button onClick={createSchedule}>
						Create
					</button>

					<button onClick={() => navigate("/schedules")}>
						Cancel
					</button>
				</div>


			</div>

		</div>

	);

}

