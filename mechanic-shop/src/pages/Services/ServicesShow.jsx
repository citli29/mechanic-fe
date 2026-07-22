import { useEffect, useRef, useState } from "react";
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
		schedule_id: "",
		service: "",
		note: "",
		is_finished: false
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

	const editingRef = useRef(emptyService);
	const saveQueueRef = useRef(Promise.resolve());
	const saveVersionRef = useRef(0);

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

			const editableService = {
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

				schedule_id:
					loadedService.schedule_id || "",

				service:
					loadedService.service || "",
				note:
					loadedService.note || "",

				is_finished:
					Boolean(loadedService.is_finished)
			};

			setEditing(editableService);
			editingRef.current = editableService;

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

	function buildServicePayload(values) {

		return {
			client_id:
				values.client_id
					? Number(values.client_id)
					: null,

			car_id:
				values.car_id
					? Number(values.car_id)
					: null,

			checkin:
				values.checkin || null,

			checkout:
				values.checkout || null,

			kms:
				values.kms === ""
					? null
					: Number(values.kms),

			malfunction:
				values.malfunction,

			schedule_id:
				values.schedule_id || null,

			service:
				values.service,
			note:
				values.note,

			is_finished:
				Boolean(values.is_finished)
		};

	}

	function queueServiceUpdate(values) {

		const data = buildServicePayload(values);

		const requestVersion =
			++saveVersionRef.current;

		setSaving(true);

		const request = saveQueueRef.current
			.catch(() => undefined)
			.then(async () => {

				await api.put(
					`/services/${id}`,
					data
				);

				setService(prev => ({
					...prev,
					...data
				}));

			});

		saveQueueRef.current = request;

		return request
			.catch(err => {

				handleApiError(err);

			})
			.finally(() => {

				if (
					requestVersion ===
					saveVersionRef.current
				) {

					setSaving(false);

				}

			});

	}

	function updateEdit(e) {

		const {
			name,
			value,
			type,
			checked
		} = e.target;

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

		const updated = {
			...editingRef.current,
			[name]:
				type === "checkbox"
					? checked
					: value
		};

		editingRef.current = updated;
		setEditing(updated);

		queueServiceUpdate(updated);

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

			const updatedService = {
				...editingRef.current,
				client_id: String(client.id)
			};

			editingRef.current = updatedService;
			setEditing(updatedService);

			await queueServiceUpdate(updatedService);

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

			const updatedService = {
				...editingRef.current,
				car_id: String(car.id)
			};

			editingRef.current = updatedService;
			setEditing(updatedService);

			await queueServiceUpdate(updatedService);

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

	const selectedClient = clients.find(
		client =>
			Number(client.id) ===
			Number(editing.client_id)
	);

	const selectedCar = cars.find(
		car =>
			Number(car.id) ===
			Number(editing.car_id)
	);

	if (loading || !service) {

		return (

			<div className="container">
				Loading...
			</div>

		);

	}

	return (

		<div
			className={
				`container ${
editing.is_finished
? "service-page-finished"
: ""
}`
			}
		>
			<div className="service-title">

				<h1>Serviço #{id}</h1>

				<button
					type="button"
					onClick={() =>
						navigate("/schedules_calendar")
					}
				>
					Voltar
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

					<h2>Informação de Serviço</h2>

				</div>

				<div className="service-form-grid">

					<div className="service-form-section">

						<h3>Cliente</h3>

						<div className="field">

							<label>Cliente</label>

							{!creatingClient ? (

								<>

									<select
										name="client_id"
										value={editing.client_id || ""}
										onChange={updateEdit}
									>

										<option value="">
											Sem Cliente
										</option>

										<option value="new">
											+ Criar Novo Cliente
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

									</select>

									{selectedClient && (

										<div className="info-box">

											<div>
												<strong>Nome:</strong>{" "}
												{selectedClient.name}
											</div>

											<div>
												<strong>Telemóvel:</strong>{" "}
												{selectedClient.phone || "-"}
											</div>

											<div>
												<strong>Email:</strong>{" "}
												{selectedClient.email || "-"}
											</div>

											<div>
												<strong>Morada:</strong>{" "}
												{selectedClient.address || "-"}
											</div>

											<div>
												<strong>Cod. Postal:</strong>{" "}
												{selectedClient.zip_code || "-"}
											</div>

											<div>
												<strong>NIF:</strong>{" "}
												{selectedClient.tax_nr || "-"}
											</div>

										</div>

									)}

								</>

							) : (

								<div className="inline-create">

									<input
										name="name"
										placeholder="Nome"
										value={newClient.name}
										onChange={updateNewClient}
									/>

									<input
										name="phone"
										placeholder="Telemóvel"
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
										placeholder="Morada"
										value={newClient.address}
										onChange={updateNewClient}
									/>

									<input
										name="zip_code"
										placeholder="Cod. Postal"
										value={newClient.zip_code}
										onChange={updateNewClient}
									/>

									<input
										name="tax_nr"
										placeholder="NIF"
										value={newClient.tax_nr}
										onChange={updateNewClient}
									/>

									<div className="create-buttons">

										<button
											type="button"
											onClick={createClient}
										>
											Adicionar
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

							)}

						</div>

					</div>

					<div className="service-form-section">

						<h3>Car</h3>

						<div className="field">

							<label>Viatura</label>

							{!creatingCar ? (

								<>

									<select
										name="car_id"
										value={editing.car_id || ""}
										onChange={updateEdit}
									>

										<option value="">
											Sem Viatura
										</option>

										<option value="new">
											+ Criar Nova Viatura
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

									</select>

									{selectedCar && (

										<div className="info-box">

											<div>
												<strong>Matrícula:</strong>{" "}
												{selectedCar.plate || "-"}
											</div>

											<div>
												<strong>Marca:</strong>{" "}
												{selectedCar.make_name || "-"}
											</div>

											<div>
												<strong>Modelo:</strong>{" "}
												{selectedCar.model_name || "-"}
											</div>

											{selectedCar.year && (

												<div>
													<strong>Ano:</strong>{" "}
													{selectedCar.year}
												</div>

											)}

											{selectedCar.month && (

												<div>
													<strong>Mes:</strong>{" "}
													{selectedCar.month}
												</div>

											)}

											{selectedCar.engine_code && (

												<div>
													<strong>Cod. Motor:</strong>{" "}
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
													<strong>Cod. Motor:</strong>{" "}
													{selectedCar.color_code}
												</div>

											)}

											{selectedCar.chassi_nr && (

												<div>
													<strong>Nr. Chassi:</strong>{" "}
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
										placeholder="Matrícula"
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
												Selecionar Marca
											</option>

											<option value="new">
												+ Criar Nova Marca
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
													Adicionar
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
												Selecionar Modelo
											</option>

											<option value="new">
												+ Criar Novo Modelo
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

										<>

											<input
												placeholder="Novo modelo"
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
													Adicionar
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
										placeholder="Mes"
										value={newCar.month}
										onChange={updateNewCar}
									/>

									<input
										name="year"
										type="number"
										placeholder="Ano"
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
										placeholder="Cod. Motor"
										value={newCar.engine_code}
										onChange={updateNewCar}
									/>

									<input
										name="color_code"
										placeholder="Cod. Cor"
										value={newCar.color_code}
										onChange={updateNewCar}
									/>

									<input
										name="chassi_nr"
										placeholder="Nr. Chassi"
										value={newCar.chassi_nr}
										onChange={updateNewCar}
									/>

									<div className="create-buttons">

										<button
											type="button"
											onClick={createCar}
										>
											Adicionar Viatura
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
											Cancelar
										</button>

									</div>

								</div>

							)}

						</div>

					</div>

				</div>

				<div className="service-form-section">

					<h3>Serviço</h3>

					<div className="form-grid">

						<div className="field">

							<label>Entrada</label>

							<input
								type="date"
								name="checkin"
								value={editing.checkin}
								onChange={updateEdit}
							/>

						</div>

						<div className="field">

							<label>Saída</label>

							<input
								type="date"
								name="checkout"
								value={editing.checkout}
								onChange={updateEdit}
							/>

						</div>

						<div className="field">

							<label>Kilometros</label>

							<input
								type="number"
								name="kms"
								value={editing.kms}
								onChange={updateEdit}
							/>

						</div>

						<div className="field field-full">

							<label>Notas/Observações</label>

							<textarea
								name="note"
								value={editing.note}
								onChange={updateEdit}
							/>

						</div>

						<div className="field field-full">

							<label>Descrição Avaria</label>

							<textarea
								name="malfunction"
								value={editing.malfunction}
								onChange={updateEdit}
							/>

						</div>

						<div className="field field-full">

							<label>Serviço Realizado</label>

							<textarea
								name="service"
								value={editing.service}
								onChange={updateEdit}
							/>

						</div>

					</div>

					<div className="container-buttons">

						<span className="autosave-status">
							{saving
								? "A guardar..."
								: "Alterações guardadas automaticamente"}
						</span>

						<button
							type="button"
							className="delete-btn"
							onClick={deleteService}
						>
							Apagar
						</button>

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

				<div className="field">

					<label htmlFor="service-is-finished">
						Serviço terminado
					</label>

					<input
						id="service-is-finished"
						type="checkbox"
						name="is_finished"
						checked={Boolean(editing.is_finished)}
						onChange={updateEdit}
					/>

				</div>
			</div>


		</div>

	);

}
