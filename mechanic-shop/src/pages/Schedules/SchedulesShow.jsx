import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

export default function ScheduleDetails() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [schedule, setSchedule] = useState(null);
	const [editing, setEditing] = useState(null);

	const [isEditing, setIsEditing] = useState(false);

	const [cars, setCars] = useState([]);
	const [clients, setClients] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);
	const [relatedServices, setRelatedServices] = useState([]);
	const [loadingRelatedServices, setLoadingRelatedServices] = useState(false);

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

	const emptyService = {
		kms: "",
		checkin: ""
	};

	const [creatingService, setCreatingService] = useState(false);
	const [serviceForm, setServiceForm] = useState(emptyService);
	const [creatingServiceLoading, setCreatingServiceLoading] = useState(false);

	function beginCreateService() {

		if (!editing?.client_id) {

			showMessage(
				"error",
				"A client is required before creating the service."
			);

			return;

		}

		setServiceForm({
			kms: "",
			checkin: editing.date || schedule?.date || ""
		});

		setCreatingService(true);

	}

	async function createServiceFromSchedule() {

		const clientId = editing?.client_id;

		if (!clientId) {

			showMessage(
				"error",
				"A client is required before creating the service."
			);

			return;

		}

		setCreatingServiceLoading(true);

		try {

			const data = {
				client_id: Number(clientId),
				car_id: editing?.car_id
					? Number(editing.car_id)
					: null,
				kms: serviceForm.kms === ""
					? null
					: Number(serviceForm.kms),
				checkin: serviceForm.checkin || null,
				schedule_id: Number(id)
			};

			const res = await api.post(
				`/schedules/${id}/create_service`,
				data
			);

			const newServiceId =
				res.data.service?.id ||
				res.data.service_id;

			if (!newServiceId) {

				throw new Error(
					"The API did not return the new service ID."
				);

			}

			navigate(`/services/${newServiceId}`);

		}
		catch (err) {

			handleApiError(err);

		}
		finally {

			setCreatingServiceLoading(false);

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

	useEffect(() => {

		loadSchedule();
		loadCars();
		loadClients();
		loadMakes();
		loadRelatedServices();

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
				make_id: res.data.schedule.car_make_id || "",
				model_id: res.data.schedule.car_model_id || ""
			});

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function loadRelatedServices() {

		setLoadingRelatedServices(true);

		try {

			const res = await api.get("/services");

			const serviceList =
				res.data.service_list ||
				res.data.services ||
				[];

			const matchingServices = serviceList.filter(
				service =>
					Number(service.schedule_id) === Number(id)
			);

			setRelatedServices(matchingServices);

		}
		catch (err) {

			setRelatedServices([]);
			handleApiError(err);

		}
		finally {

			setLoadingRelatedServices(false);

		}

	}

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
				params: {
					make_id
				}
			});

			setModels(res.data.model_list || []);

		}
		catch {

			setModels([]);

		}

	}

	const selectedClient = clients.find(
		client => client.id === Number(editing?.client_id)
	);

	const selectedCar = cars.find(
		car => car.id === Number(editing?.car_id)
	);

	function beginEdit() {

		setIsEditing(true);

	}

	function cancelEdit() {

		setIsEditing(false);

		setCreatingClient(false);
		setCreatingCar(false);
		setCreatingMake(false);
		setCreatingModel(false);

		setNewClient(emptyClient);
		setNewCar(emptyCar);

		loadSchedule();

	}

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

		if (name === "make_id" && value === "new") {

			setCreatingMake(true);
			return;

		}

		if (name === "model_id" && value === "new") {

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

			loadModels(make.id);

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

	async function saveSchedule() {

		try {

			const data = {
				date: editing.date,
				description: editing.description
			};

			if (editing.client_id) {
				data.client_id = editing.client_id;
			}

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

			setIsEditing(false);

			await loadSchedule();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function deleteSchedule() {

		if (!window.confirm("Delete this schedule?")) {
			return;
		}

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

	if (!editing) {

		return (
			<div className="container">
				A Carregar...
			</div>
		);

	}

	return (

		<div className="container">

			<h1>Marcação #{id}</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}


			<div className="details-card">

				<h2>Seriços Relacionados</h2>

				{loadingRelatedServices ? (

					<p>A carregar serviços...</p>

				) : relatedServices.length === 0 ? (

					<p>No services linked to this schedule.</p>

				) : (

					<div className="table-wrapper">

						<table className="table">

							<thead>

								<tr>
									<th>Service ID</th>
									<th>Check In</th>
									<th></th>
								</tr>

							</thead>

							<tbody>

								{relatedServices.map(service => (

									<tr key={service.id}>

										<td>
											#{service.id}
										</td>

										<td>
											{service.checkin || "-"}
										</td>

										<td>

											<button
												type="button"
												onClick={() =>
													navigate(`/services/${service.id}`)
												}
											>
												Open Service
											</button>

										</td>

									</tr>

								))}

							</tbody>

						</table>

					</div>

				)}

			</div>

			<div className="details-card">

				<div className="details-grid">

					<div className="field">

						<label>Date</label>

						<input
							type="date"
							name="date"
							value={editing.date || ""}
							onChange={updateEdit}
							readOnly={!isEditing}
						/>

					</div>

					<div className="field field-full">

						<label>Description</label>

						<textarea
							name="description"
							value={editing.description || ""}
							onChange={updateEdit}
							readOnly={!isEditing}
						/>

					</div>

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

						) : (

							<>

								<input
									readOnly
									value={
										schedule.client_name
											? `${schedule.client_name} (${schedule.client_phone})`
											: "-"
									}
								/>

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

						)}

					</div>

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
											</option>

										))}

										<option value="new">
											+ Create new car
										</option>

									</select>

									{selectedCar && (

										<div className="info-box">

											<div><strong>Plate:</strong> {selectedCar.plate}</div>
											<div><strong>Make:</strong> {selectedCar.make_name}</div>
											<div><strong>Model:</strong> {selectedCar.model_name}</div>

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
												onChange={e =>
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

						) : (

							<>

								<input
									readOnly
									value={
										schedule.car_plate
											? `${schedule.car_plate} (${schedule.car_make} ${schedule.car_model})`
											: "-"
									}
								/>

								{selectedCar && (

									<div className="info-box">

										<div><strong>Plate:</strong> {selectedCar.plate}</div>
										<div><strong>Make:</strong> {selectedCar.make_name}</div>
										<div><strong>Model:</strong> {selectedCar.model_name}</div>

										{selectedCar.year && (
											<div><strong>Year:</strong> {selectedCar.year}</div>
										)}

										{selectedCar.month && (
											<div><strong>Month:</strong> {selectedCar.month}</div>
										)}

										{selectedCar.engine_code && (
											<div><strong>Engine:</strong> {selectedCar.engine_code}</div>
										)}

										{selectedCar.cc && (
											<div><strong>CC:</strong> {selectedCar.cc}</div>
										)}

										{selectedCar.color_code && (
											<div><strong>Color:</strong> {selectedCar.color_code}</div>
										)}

										{selectedCar.chassi_nr && (
											<div><strong>Chassis:</strong> {selectedCar.chassi_nr}</div>
										)}

									</div>

								)}

							</>

						)}

					</div>

					{!editing.car_id && (

						<>

							<div className="field">

								<label>Make</label>

								{isEditing ? (

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

								) : (

									<input
										readOnly
										value={schedule.car_make || "-"}
									/>

								)}

							</div>

							<div className="field">

								<label>Model</label>

								{isEditing ? (

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

								) : (

									<input
										readOnly
										value={schedule.car_model || "-"}
									/>

								)}

							</div>

						</>

					)}

				</div>

				<div className="details-actions">

					{!isEditing ? (

						<>

							<button onClick={beginEdit}>
								Edit
							</button>

							<button
								className="delete-btn"
								onClick={deleteSchedule}
							>
								Delete
							</button>

							<button
								type="button"
								onClick={beginCreateService}
							>
								Create Service
							</button>

						</>

					) : (

						<>

							<button onClick={saveSchedule}>
								Save
							</button>

							<button onClick={cancelEdit}>
								Cancel
							</button>

						</>

					)}

					<button onClick={() => navigate("/schedules_calendar")}>
						Back
					</button>

				</div>

			</div>


			{creatingService && (

				<div className="details-card">

					<h2>Create Service</h2>

					<div className="details-grid">

						<div className="field">

							<label>Check In</label>

							<input
								type="date"
								value={serviceForm.checkin}
								onChange={e =>
									setServiceForm(prev => ({
										...prev,
										checkin: e.target.value
									}))
								}
							/>

						</div>

						<div className="field">

							<label>Kilometers</label>

							<input
								type="number"
								value={serviceForm.kms}
								onChange={e =>
									setServiceForm(prev => ({
										...prev,
										kms: e.target.value
									}))
								}
							/>

						</div>

					</div>

					<div className="details-actions">

						<button
							type="button"
							onClick={createServiceFromSchedule}
							disabled={creatingServiceLoading}
						>
							{creatingServiceLoading
								? "Creating..."
								: "Create Service"}
						</button>

						<button
							type="button"
							onClick={() => {
								setCreatingService(false);
								setServiceForm(emptyService);
							}}
							disabled={creatingServiceLoading}
						>
							Cancel
						</button>

					</div>

				</div>

			)}

		</div>

	);

}
