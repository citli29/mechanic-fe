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
		service: "",
	};

	const [service, setService] = useState(null);
	const [editing, setEditing] = useState(emptyService);

	const [clients, setClients] = useState([]);
	const [cars, setCars] = useState([]);

	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});

	useEffect(() => {

		loadData();

	}, [id]);

	async function loadData() {

		setLoading(true);

		try {

			await Promise.all([
				loadService(),
				loadClients(),
				loadCars(),
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
					loadedService.service || "",
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

	function showMessage(type, text) {

		setMessage({
			type,
			text,
		});

		setTimeout(() => {

			setMessage({
				type: "",
				text: "",
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

		setEditing({
			...editing,
			[name]: value,
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
				service.service || "",
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
				service.service || "",
		});

		setIsEditing(false);

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
					editing.service,
			};

			await api.put(
				`/services/${id}`,
				data
			);

			showMessage(
				"success",
				"Service updated successfully."
			);

			setIsEditing(false);

			await loadService();

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

	function getSelectedClient() {

		return clients.find(
			client =>
				Number(client.id) ===
				Number(
					isEditing
						? editing.client_id
						: service?.client_id
				)
		);

	}

	function getSelectedCar() {

		return cars.find(
			car =>
				Number(car.id) ===
				Number(
					isEditing
						? editing.car_id
						: service?.car_id
				)
		);

	}

	function getClientValue(field) {

		const client = getSelectedClient();

		const serviceFields = {
			name: service?.client_name,
			phone: service?.client_phone,
			email: service?.client_email,
			address: service?.client_address,
			zip_code: service?.client_zip_code,
			tax_nr: service?.client_tax_nr,
		};

		return (
			client?.[field] ||
			serviceFields[field] ||
			"-"
		);

	}

	function getCarValue(field) {

		const car = getSelectedCar();

		const serviceFields = {
			plate: service?.car_plate,
			make_name: service?.car_make_name,
			model_name: service?.car_model_name,
			year: service?.car_year,
			month: service?.car_month,
			cc: service?.car_cc,
			engine_code: service?.car_engine_code,
			color_code: service?.car_color_code,
			chassi_nr: service?.car_chassi_nr,
		};

		return (
			car?.[field] ||
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

				<div className="service-form-grid">

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

					</div>

					<div className="service-form-section">

						<h3>Client</h3>

						<div className="form-grid">

							<div className="field field-full">

								<label>Client</label>

								{isEditing ? (

									<select
										name="client_id"
										value={editing.client_id}
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
													? ` - ${client.phone}`
													: ""}
											</option>

										))}

									</select>

								) : (

									<input
										readOnly
										value={getClientValue("name")}
									/>

								)}

							</div>

							<div className="field">

								<label>Phone</label>

								<input
									readOnly
									value={getClientValue("phone")}
								/>

							</div>

							<div className="field">

								<label>Email</label>

								<input
									readOnly
									value={getClientValue("email")}
								/>

							</div>

							<div className="field field-full">

								<label>Address</label>

								<input
									readOnly
									value={getClientValue("address")}
								/>

							</div>

							<div className="field">

								<label>ZIP Code</label>

								<input
									readOnly
									value={getClientValue("zip_code")}
								/>

							</div>

							<div className="field">

								<label>Tax Number</label>

								<input
									readOnly
									value={getClientValue("tax_nr")}
								/>

							</div>

						</div>

					</div>

					<div className="service-form-section">

						<h3>Car</h3>

						<div className="form-grid">

							<div className="field field-full">

								<label>Car</label>

								{isEditing ? (

									<select
										name="car_id"
										value={editing.car_id}
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
												{" - "}
												{car.make_name || ""}
												{" "}
												{car.model_name || ""}
											</option>

										))}

									</select>

								) : (

									<input
										readOnly
										value={
											`${getCarValue("plate")} - ${getCarValue("make_name")} ${getCarValue("model_name")}`
										}
									/>

								)}

							</div>

							<div className="field">

								<label>Plate</label>

								<input
									readOnly
									value={getCarValue("plate")}
								/>

							</div>

							<div className="field">

								<label>Make</label>

								<input
									readOnly
									value={getCarValue("make_name")}
								/>

							</div>

							<div className="field">

								<label>Model</label>

								<input
									readOnly
									value={getCarValue("model_name")}
								/>

							</div>

							<div className="field">

								<label>Year</label>

								<input
									readOnly
									value={getCarValue("year")}
								/>

							</div>

							<div className="field">

								<label>Month</label>

								<input
									readOnly
									value={getCarValue("month")}
								/>

							</div>

							<div className="field">

								<label>CC</label>

								<input
									readOnly
									value={getCarValue("cc")}
								/>

							</div>

							<div className="field">

								<label>Engine Code</label>

								<input
									readOnly
									value={getCarValue("engine_code")}
								/>

							</div>

							<div className="field">

								<label>Color Code</label>

								<input
									readOnly
									value={getCarValue("color_code")}
								/>

							</div>

							<div className="field field-full">

								<label>Chassis Number</label>

								<input
									readOnly
									value={getCarValue("chassi_nr")}
								/>

							</div>

						</div>

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
