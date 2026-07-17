import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";

import AppliedProductsTable from "./AppliedProductsTable";
import UserTimesTable from "./UserTimesTable";

import "./ServicesShow.css";

export default function ServicesShow() {

	const { id } = useParams();
	const navigate = useNavigate();

	const emptyService = {
		client_id: "",
		car_id: "",
		checkin: "",
		checkout: "",
		kms: "",
		malfunction: "",
		service: ""
	};

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

	const [service, setService] = useState(null);
	const [editing, setEditing] = useState(emptyService);

	const [clients, setClients] = useState([]);
	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [creatingClient, setCreatingClient] = useState(false);
	const [creatingCar, setCreatingCar] = useState(false);
	const [creatingMake, setCreatingMake] = useState(false);
	const [creatingModel, setCreatingModel] = useState(false);

	const [newClient, setNewClient] = useState(emptyClient);
	const [newCar, setNewCar] = useState(emptyCar);

	const [newMakeName, setNewMakeName] = useState("");
	const [newModelName, setNewModelName] = useState("");

	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [message, setMessage] = useState({
		type: "",
		text: ""
	});

	useEffect(() => {

		loadData();

	}, [id]);

	useEffect(() => {

		if (newCar.make_id) {

			loadModels(newCar.make_id);

		}
		else {

			setModels([]);

		}

	}, [newCar.make_id]);

	async function loadData() {

		setLoading(true);

		try {

			await Promise.all([
				loadService(),
				loadClients(),
				loadCars(),
				loadMakes()
			]);

		}
		finally {

			setLoading(false);

		}

	}

	async function loadService() {

		try {

			const res = await api.get(
				`/services/${id}`
			);

			const loadedService =
				res.data.service ||
				res.data;

			setService(loadedService);

			setEditing({
				client_id:
					loadedService.client_id || "",

				car_id:
					loadedService.car_id || "",

				checkin:
					formatDateInput(
						loadedService.checkin
					),

				checkout:
					formatDateInput(
						loadedService.checkout
					),

				kms:
					loadedService.kms ?? "",

				malfunction:
					loadedService.malfunction || "",

				service:
					loadedService.service || ""
			});

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function loadClients() {

		try {

			const res = await api.get("/clients");

			setClients(
				res.data.client_list ||
				res.data.clients ||
				[]
			);

		}
		catch (err) {

			setClients([]);
			console.error(err);

		}

	}

	async function loadCars() {

		try {

			const res = await api.get("/cars");

			setCars(
				res.data.car_list ||
				res.data.cars ||
				[]
			);

		}
		catch (err) {

			setCars([]);
			console.error(err);

		}

	}

	async function loadMakes() {

		try {

			const res = await api.get("/makes");

			setMakes(
				res.data.make_list ||
				res.data.makes ||
				[]
			);

		}
		catch (err) {

			setMakes([]);
			console.error(err);

		}

	}

	async function loadModels(makeId) {

		if (!makeId) {

			setModels([]);
			return;

		}

		try {

			const res = await api.get(
				"/models",
				{
					params: {
						make_id: makeId
					}
				}
			);

			setModels(
				res.data.model_list ||
					res.data.models ||
					[]
			);

		}
		catch (err) {

			setModels([]);
			console.error(err);

		}

	}

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

	function updateEdit(e) {

		const { name, value } = e.target;

		if (
			name === "client_id" &&
			value === "new"
		) {

			setCreatingClient(true);
			return;

		}

		if (
			name === "car_id" &&
			value === "new"
		) {

			setCreatingCar(true);
			return;

		}

		setEditing(prev => ({
			...prev,
			[name]: value
		}));

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

		if (
			name === "make_id" &&
			value === "new"
		) {

			setCreatingMake(true);
			return;

		}

		if (
			name === "model_id" &&
			value === "new"
		) {

			setCreatingModel(true);
			return;

		}

		setNewCar(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			if (name === "make_id") {

				updated.model_id = "";

			}

			return updated;

		});

	}

	function beginEdit() {

		setEditing({
			client_id:
				service.client_id || "",

			car_id:
				service.car_id || "",

			checkin:
				formatDateInput(
					service.checkin
				),

			checkout:
				formatDateInput(
					service.checkout
				),

			kms:
				service.kms ?? "",

			malfunction:
				service.malfunction || "",

			service:
				service.service || ""
		});

		setIsEditing(true);

	}

	function cancelEdit() {

		setEditing({
			client_id:
				service.client_id || "",

			car_id:
				service.car_id || "",

			checkin:
				formatDateInput(
					service.checkin
				),

			checkout:
				formatDateInput(
					service.checkout
				),

			kms:
				service.kms ?? "",

			malfunction:
				service.malfunction || "",

			service:
				service.service || ""
		});

		setCreatingClient(false);
		setCreatingCar(false);
		setCreatingMake(false);
		setCreatingModel(false);

		setNewClient(emptyClient);
		setNewCar(emptyCar);

		setNewMakeName("");
		setNewModelName("");

		setIsEditing(false);

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
					.filter(
						([_, value]) =>
							value !== ""
					)
			);

			const res = await api.post(
				"/clients",
				data
			);

			const client =
				res.data.client ||
				res.data;

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

	async function createMake() {

		if (!newMakeName.trim()) {

			showMessage(
				"error",
				"Make name is required."
			);

			return;

		}

		try {

			const res = await api.post(
				"/makes",
				{
					name: newMakeName
				}
			);

			const make =
				res.data.make ||
				res.data;

			setMakes(prev => [
				...prev,
				make
			]);

			setNewCar(prev => ({
				...prev,
				make_id: String(make.id),
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

			const res = await api.post(
				"/models",
				{
					name: newModelName,
					make_id: newCar.make_id
				}
			);

			const model =
				res.data.model ||
				res.data;

			setModels(prev => [
				...prev,
				model
			]);

			setNewCar(prev => ({
				...prev,
				model_id: String(model.id)
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
					.filter(
						([_, value]) =>
							value !== ""
					)
			);

			const res = await api.post(
				"/cars",
				data
			);

			const car =
				res.data.car ||
				res.data;

			setCars(prev => [
				...prev,
				car
			]);

			setEditing(prev => ({
				...prev,
				car_id: car.id
			}));

			setCreatingCar(false);
			setCreatingMake(false);
			setCreatingModel(false);

			setNewCar(emptyCar);
			setNewMakeName("");
			setNewModelName("");

			showMessage(
				"success",
				"Car created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function saveService() {

		setSaving(true);

		try {

			const data = {
				client_id:
					editing.client_id
						? Number(editing.client_id)
						: null,

				car_id:
					editing.car_id
						? Number(editing.car_id)
						: null,

				checkin:
					editing.checkin || null,

				checkout:
					editing.checkout || null,

				kms:
					editing.kms === ""
						? null
						: Number(editing.kms),

				malfunction:
					editing.malfunction,

				service:
					editing.service
			};

			await api.put(
				`/services/${id}`,
				data
			);

			showMessage(
				"success",
				"Service updated successfully."
			);

			setCreatingClient(false);
			setCreatingCar(false);
			setCreatingMake(false);
			setCreatingModel(false);

			setNewClient(emptyClient);
			setNewCar(emptyCar);

			setIsEditing(false);

			await Promise.all([
				loadService(),
				loadClients(),
				loadCars()
			]);

		}
		catch (err) {

			handleApiError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function deleteService() {

		const confirmed = window.confirm(
			"Delete this service?"
		);

		if (!confirmed) {
			return;
		}

		try {

			await api.delete(
				`/services/${id}`
			);

			navigate("/services");

		}
		catch (err) {

			handleApiError(err);

		}

	}

	function formatDateInput(value) {

		if (!value) {
			return "";
		}

		const stringValue = String(value);

		if (stringValue.includes("T")) {

			return stringValue.split("T")[0];

		}

		if (stringValue.includes(" ")) {

			return stringValue.split(" ")[0];

		}

		return stringValue.slice(0, 10);

	}

	function formatDateDisplay(value) {

		const dateValue = formatDateInput(value);

		if (!dateValue) {
			return "-";
		}

		const [year, month, day] =
			dateValue.split("-");

		if (!year || !month || !day) {
			return dateValue;
		}

		return `${day}/${month}/${year}`;

	}

	const selectedClient = clients.find(
		client =>
			Number(client.id) ===
			Number(
				isEditing
					? editing.client_id
					: service?.client_id
			)
	);

	const selectedCar = cars.find(
		car =>
			Number(car.id) ===
			Number(
				isEditing
					? editing.car_id
					: service?.car_id
			)
	);

	function getClientValue(field) {

		const serviceFields = {
			name: service?.client_name,
			phone: service?.client_phone,
			email: service?.client_email,
			address: service?.client_address,
			zip_code: service?.client_zip_code,
			tax_nr: service?.client_tax_nr
		};

		return (
			selectedClient?.[field] ||
			serviceFields[field] ||
			"-"
		);

	}

	function getCarValue(field) {

		const serviceFields = {
			plate: service?.car_plate,

			make_name:
				service?.car_make_name ||
				service?.car_make,

			model_name:
				service?.car_model_name ||
				service?.car_model,

			year: service?.car_year,
			month: service?.car_month,
			cc: service?.car_cc,
			engine_code: service?.car_engine_code,
			color_code: service?.car_color_code,
			chassi_nr: service?.car_chassi_nr
		};

		return (
			selectedCar?.[field] ||
			serviceFields[field] ||
			"-"
		);

	}

	if (loading || !service) {

		return (

			<div className="container">
				Loading...
			</div>

		);

	}

	return (

		<div className="container">

			<div className="service-title">

				<h1>Service #{id}</h1>

				<button
					type="button"
					onClick={() =>
						navigate("/services")
					}
				>
					Back
				</button>

			</div>

			{message.text && (

				<div
					className={
						`api-message ${message.type}`
					}
				>
					{message.text}
				</div>

			)}

			<div className="service-form">

				<div className="service-form-header">

					<h2>Service Information</h2>
			</div>

				<div className="service-form-grid">

					<div className="service-form-section">

						<h3>Client</h3>

						<div className="field">

							<label>Client</label>

							{isEditing ? (

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
													{client.name}
													{client.phone
														? ` (${client.phone})`
														: ""}
												</option>

											))}

											<option value="new">
												+ Create new client
											</option>

										</select>

										{selectedClient && (

											<div className="info-box">

												<div>
													<strong>Name:</strong>{" "}
													{selectedClient.name}
												</div>

												<div>
													<strong>Phone:</strong>{" "}
													{selectedClient.phone || "-"}
												</div>

												<div>
													<strong>Email:</strong>{" "}
													{selectedClient.email || "-"}
												</div>

												<div>
													<strong>Address:</strong>{" "}
													{selectedClient.address || "-"}
												</div>

												<div>
													<strong>ZIP:</strong>{" "}
													{selectedClient.zip_code || "-"}
												</div>

												<div>
													<strong>Tax:</strong>{" "}
													{selectedClient.tax_nr || "-"}
												</div>

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

											<button
												type="button"
												onClick={createClient}
											>
												Add
											</button>

											<button
												type="button"
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

							) : (

								<>

									<input
										readOnly
										value={
											service.client_name
												? `${service.client_name}${service.client_phone
													? ` (${service.client_phone})`
													: ""}`
												: "-"
										}
									/>

									{(
										selectedClient ||
										service.client_name
									) && (

										<div className="info-box">

											<div>
												<strong>Name:</strong>{" "}
												{getClientValue("name")}
											</div>

											<div>
												<strong>Phone:</strong>{" "}
												{getClientValue("phone")}
											</div>

											<div>
												<strong>Email:</strong>{" "}
												{getClientValue("email")}
											</div>

											<div>
												<strong>Address:</strong>{" "}
												{getClientValue("address")}
											</div>

											<div>
												<strong>ZIP:</strong>{" "}
												{getClientValue("zip_code")}
											</div>

											<div>
												<strong>Tax:</strong>{" "}
												{getClientValue("tax_nr")}
											</div>

										</div>

									)}

								</>

							)}

						</div>

					</div>

					<div className="service-form-section">

						<h3>Car</h3>

						<div className="field">

							<label>Car</label>

							{isEditing ? (

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
													{(
														car.make_name ||
														car.model_name
													)
														? ` (${car.make_name || ""} ${car.model_name || ""})`
														: ""}
												</option>

											))}

											<option value="new">
												+ Create new car
											</option>

										</select>

										{selectedCar && (

											<div className="info-box">

												<div>
													<strong>Plate:</strong>{" "}
													{selectedCar.plate || "-"}
												</div>

												<div>
													<strong>Make:</strong>{" "}
													{selectedCar.make_name || "-"}
												</div>

												<div>
													<strong>Model:</strong>{" "}
													{selectedCar.model_name || "-"}
												</div>

												{selectedCar.year && (

													<div>
														<strong>Year:</strong>{" "}
														{selectedCar.year}
													</div>

												)}

												{selectedCar.month && (

													<div>
														<strong>Month:</strong>{" "}
														{selectedCar.month}
													</div>

												)}

												{selectedCar.engine_code && (

													<div>
														<strong>Engine:</strong>{" "}
														{selectedCar.engine_code}
													</div>

												)}

												{selectedCar.cc && (

													<div>
														<strong>CC:</strong>{" "}
														{selectedCar.cc}
													</div>

												)}

												{selectedCar.color_code && (

													<div>
														<strong>Color:</strong>{" "}
														{selectedCar.color_code}
													</div>

												)}

												{selectedCar.chassi_nr && (

													<div>
														<strong>Chassis:</strong>{" "}
														{selectedCar.chassi_nr}
													</div>

												)}

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
													onChange={e =>
														setNewMakeName(
															e.target.value
														)
													}
												/>

												<div className="create-buttons">

													<button
														type="button"
														onClick={createMake}
													>
														Add
													</button>

													<button
														type="button"
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
													onChange={e =>
														setNewModelName(
															e.target.value
														)
													}
												/>

												<div className="create-buttons">

													<button
														type="button"
														onClick={createModel}
													>
														Add
													</button>

													<button
														type="button"
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

										<input
											name="month"
											type="number"
											min="1"
											max="12"
											placeholder="Month"
											value={newCar.month}
											onChange={updateNewCar}
										/>

										<input
											name="year"
											type="number"
											placeholder="Year"
											value={newCar.year}
											onChange={updateNewCar}
										/>

										<input
											name="cc"
											type="number"
											placeholder="CC"
											value={newCar.cc}
											onChange={updateNewCar}
										/>

										<input
											name="engine_code"
											placeholder="Engine code"
											value={newCar.engine_code}
											onChange={updateNewCar}
										/>

										<input
											name="color_code"
											placeholder="Color code"
											value={newCar.color_code}
											onChange={updateNewCar}
										/>

										<input
											name="chassi_nr"
											placeholder="Chassis number"
											value={newCar.chassi_nr}
											onChange={updateNewCar}
										/>

										<div className="create-buttons">

											<button
												type="button"
												onClick={createCar}
											>
												Add Car
											</button>

											<button
												type="button"
												onClick={() => {

													setCreatingCar(false);
													setCreatingMake(false);
													setCreatingModel(false);

													setNewCar(emptyCar);
													setNewMakeName("");
													setNewModelName("");

												}}
											>
												Cancel
											</button>

										</div>

									</div>

								)

							) : (

								<>

									<input
										readOnly
										value={
											service.car_plate
												? `${service.car_plate} (${getCarValue("make_name")} ${getCarValue("model_name")})`
												: "-"
										}
									/>

									{(
										selectedCar ||
										service.car_plate
									) && (

										<div className="info-box">

											<div>
												<strong>Plate:</strong>{" "}
												{getCarValue("plate")}
											</div>

											<div>
												<strong>Make:</strong>{" "}
												{getCarValue("make_name")}
											</div>

											<div>
												<strong>Model:</strong>{" "}
												{getCarValue("model_name")}
											</div>

											{getCarValue("year") !== "-" && (

												<div>
													<strong>Year:</strong>{" "}
													{getCarValue("year")}
												</div>

											)}

											{getCarValue("month") !== "-" && (

												<div>
													<strong>Month:</strong>{" "}
													{getCarValue("month")}
												</div>

											)}

											{getCarValue("engine_code") !== "-" && (

												<div>
													<strong>Engine:</strong>{" "}
													{getCarValue("engine_code")}
												</div>

											)}

											{getCarValue("cc") !== "-" && (

												<div>
													<strong>CC:</strong>{" "}
													{getCarValue("cc")}
												</div>

											)}

											{getCarValue("color_code") !== "-" && (

												<div>
													<strong>Color:</strong>{" "}
													{getCarValue("color_code")}
												</div>

											)}

											{getCarValue("chassi_nr") !== "-" && (

												<div>
													<strong>Chassis:</strong>{" "}
													{getCarValue("chassi_nr")}
												</div>

											)}

										</div>

									)}

								</>

							)}

						</div>

					</div>

				</div>


				<div className="service-form-section">

					<h3>Service</h3>

					<div className="form-grid">

						<div className="field">

							<label>Check In</label>

							{isEditing ? (

								<input
									type="date"
									name="checkin"
									value={editing.checkin}
									onChange={updateEdit}
								/>

							) : (

								<input
									readOnly
									value={
										formatDateDisplay(
											service.checkin
										)
									}
								/>

							)}

						</div>

						<div className="field">

							<label>Check Out</label>

							{isEditing ? (

								<input
									type="date"
									name="checkout"
									value={editing.checkout}
									onChange={updateEdit}
								/>

							) : (

								<input
									readOnly
									value={
										formatDateDisplay(
											service.checkout
										)
									}
								/>

							)}

						</div>

						<div className="field">

							<label>Kilometers</label>

							<input
								type="number"
								name="kms"
								value={
									isEditing
										? editing.kms
										: service.kms ?? ""
								}
								onChange={updateEdit}
								readOnly={!isEditing}
							/>

						</div>

						<div className="field field-full">

							<label>Malfunction</label>

							<textarea
								name="malfunction"
								value={
									isEditing
										? editing.malfunction
										: service.malfunction || ""
								}
								onChange={updateEdit}
								readOnly={!isEditing}
							/>

						</div>

						<div className="field field-full">

							<label>Service Performed</label>

							<textarea
								name="service"
								value={
									isEditing
										? editing.service
										: service.service || ""
								}
								onChange={updateEdit}
								readOnly={!isEditing}
							/>

						</div>

					</div>

	
					<div className="container-buttons">

						{!isEditing ? (

							<>

								<button
									type="button"
									onClick={beginEdit}
								>
									Edit
								</button>

								<button
									type="button"
									className="delete-btn"
									onClick={deleteService}
								>
									Delete
								</button>

							</>

						) : (

							<>

								<button
									type="button"
									onClick={saveService}
									disabled={saving}
								>
									{saving
										? "Saving..."
										: "Save"}
								</button>

								<button
									type="button"
									onClick={cancelEdit}
									disabled={saving}
								>
									Cancel
								</button>

							</>

						)}

					</div>

				</div>

			</div>

			<div className="service-table-section">

				<AppliedProductsTable
					serviceId={id}
					showMessage={showMessage}
					handleApiError={handleApiError}
				/>

			</div>

			<div className="service-table-section">

				<UserTimesTable
					serviceId={id}
					showMessage={showMessage}
					handleApiError={handleApiError}
				/>

			</div>

		</div>

	);

}

