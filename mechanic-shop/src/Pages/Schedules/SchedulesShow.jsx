import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { MakePicker } from "../../components/Pickers/MakePicker";
import { ModelPicker } from "../../components/Pickers/ModelPicker";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ScheduleForm.css";
import "./Style/SchedulesShow.css";

const emptyServiceForm = {
	kms: "",
	checkin: "",
	service_type_id: "",
	r_name: "",
	r_phone: "",
};

export default function SchedulesShow() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [schedule, setSchedule] = useState(null);
	const [editing, setEditing] = useState(null);

	const [isEditing, setIsEditing] = useState(false);

	const [relatedServices, setRelatedServices] = useState([]);
	const [loadingRelatedServices, setLoadingRelatedServices] = useState(false);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});

	const [creatingService, setCreatingService] = useState(false);
	const [serviceForm, setServiceForm] = useState(emptyServiceForm);
	const [creatingServiceLoading, setCreatingServiceLoading] = useState(false);

	const [serviceTypes, setServiceTypes] = useState([]);


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
			showMessage("error", "Ocorreu um erro.");
		}

		console.error(err);
	}


	async function loadSchedule() {
		try {
			const res = await api.get(`/schedules/${id}`);

			setSchedule(res.data.schedule);

			setEditing({
				...res.data.schedule,
				make_id: res.data.schedule.car_make_id || "",
				model_id: res.data.schedule.car_model_id || "",
			});
		} catch (err) {
			handleApiError(err);
		}
	}


	async function loadRelatedServices() {
		setLoadingRelatedServices(true);

		try {
			const res = await api.get("/services", { params: { schedule_id: id } });

			setRelatedServices(res.data.service_list || []);
		} catch (err) {
			setRelatedServices([]);
			handleApiError(err);
		} finally {
			setLoadingRelatedServices(false);
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


	useEffect(() => {
		loadSchedule();
		loadRelatedServices();
	}, [id]);

	useEffect(() => { loadServiceTypes(); }, []);


	function beginEdit() {
		setIsEditing(true);
	}


	function cancelEdit() {
		setIsEditing(false);
		loadSchedule();
	}


	function updateDate(e) {
		const { value } = e.target;
		setEditing((prev) => ({ ...prev, date: value }));
	}


	function updateDescription(e) {
		const { value } = e.target;
		setEditing((prev) => ({ ...prev, description: value }));
	}


	function updateClientId(clientId) {
		setEditing((prev) => ({ ...prev, client_id: clientId }));
	}


	function updateCarId(carId) {
		setEditing((prev) => ({
			...prev,
			car_id: carId,
			...(carId ? { make_id: "", model_id: "" } : {}),
		}));
	}


	function updateMakeId(makeId) {
		setEditing((prev) => ({ ...prev, make_id: makeId, model_id: "" }));
	}


	function updateModelId(modelId) {
		setEditing((prev) => ({ ...prev, model_id: modelId }));
	}


	async function saveSchedule() {
		try {
			const data = {
				date: editing.date,
				description: editing.description,
				client_id: editing.client_id || "",
			};

			if (editing.car_id) {
				data.car_id = editing.car_id;
			} else if (editing.model_id) {
				data.model_id = editing.model_id;
			}

			await api.put(`/schedules/${id}`, data);

			showMessage("success", "Schedule updated successfully.");

			setIsEditing(false);

			await loadSchedule();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteSchedule() {
		if (!window.confirm("Delete this schedule?")) return;

		try {
			await api.delete(`/schedules/${id}`);

			showMessage("success", "Schedule deleted successfully.");

			navigate("/schedules");
		} catch (err) {
			handleApiError(err);
		}
	}


	function beginCreateService() {
		if (!editing?.client_id) {
			showMessage("error", "A client is required before creating the service.");
			return;
		}

		setServiceForm({
			kms: "",
			checkin: editing.date || schedule?.date || "",
			service_type_id: "",
			r_name: "",
			r_phone: "",
		});

		setCreatingService(true);
	}


	async function createServiceFromSchedule() {
		const clientId = editing?.client_id;

		if (!clientId) {
			showMessage("error", "A client is required before creating the service.");
			return;
		}

		setCreatingServiceLoading(true);

		try {
			const data = {
				client_id: Number(clientId),
				car_id: editing?.car_id ? Number(editing.car_id) : null,
				kms: serviceForm.kms === "" ? null : Number(serviceForm.kms),
				checkin: serviceForm.checkin || null,
				schedule_id: Number(id),
				service_type_id: serviceForm.service_type_id || null,
				r_name: serviceForm.r_name || null,
				r_phone: serviceForm.r_phone || null,
			};

			const res = await api.post(`/schedules/${id}/create_service`, data);

			const newServiceId = res.data.service?.id || res.data.service_id;

			if (!newServiceId) throw new Error("The API did not return the new service ID.");

			navigate(`/service/${newServiceId}`);
		} catch (err) {
			handleApiError(err);
		} finally {
			setCreatingServiceLoading(false);
		}
	}


	if (!editing) {
		return (
			<div className="page schedules-show-page schedule-form-page">
				<div className="content">
					<div className="card">
						<div className="body">A Carregar...</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="page schedules-show-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-day" />
						<h1>Marcação #{id}</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="details-grid">

							<div className="field">
								<label>Data</label>

								<input
									type="date"
									value={editing.date || ""}
									onChange={updateDate}
									disabled={!isEditing}
								/>
							</div>

							<div className="field field-full">
								<label>Descrição</label>

								<textarea
									value={editing.description || ""}
									onChange={updateDescription}
									disabled={!isEditing}
								/>
							</div>

							<div className="picker-row">
								<ClientPicker
									client_id={editing.client_id}
									onClientIdChange={updateClientId}
									isAllowedEditing={isEditing}
								/>
							</div>

							<div className="picker-row">
								<CarPicker
									car_id={editing.car_id}
									onCarIdChange={updateCarId}
									isAllowedEditing={isEditing}
								/>
							</div>

							{!editing.car_id && (
								<>
									<div className="field">
										<label>Marca <span className="field-hint">(sem viatura escolhida)</span></label>

										<MakePicker
											make_id={editing.make_id}
											onMakeIdChange={updateMakeId}
											disabled={!isEditing}
										/>
									</div>

									<div className="field">
										<label>Modelo <span className="field-hint">(sem viatura escolhida)</span></label>

										<ModelPicker
											make_id={editing.make_id}
											model_id={editing.model_id}
											onModelIdChange={updateModelId}
											disabled={!isEditing}
										/>
									</div>
								</>
							)}

						</div>

						<div className="details-actions">
							{!isEditing ? (
								<>
									<button className="options" onClick={beginEdit}>
										<i className="fa-solid fa-pencil" /> Editar
									</button>

									<button className="cancel" onClick={deleteSchedule}>
										<i className="fa-solid fa-trash" /> Apagar
									</button>

									{relatedServices.length === 0 && !creatingService && (
										<button className="confirm" onClick={beginCreateService}>
											<i className="fa-solid fa-plus" /> Criar Serviço
										</button>
									)}
								</>
							) : (
								<>
									<button className="confirm" onClick={saveSchedule}>
										<i className="fa-solid fa-check" /> Guardar
									</button>

									<button className="cancel" onClick={cancelEdit}>
										<i className="fa-solid fa-xmark" /> Cancelar
									</button>
								</>
							)}

							<Link className="options" to="/schedules_calendar">
								<i className="fa-solid fa-arrow-left" /> Voltar
							</Link>
						</div>

					</div>
				</div>

				{creatingService && (
					<div className="card">
						<div className="header">
							<i className="fa-solid fa-clipboard-list" />
							<h1>Criar Serviço</h1>
						</div>

						<div className="body">

							<div className="details-grid">
								<div className="field">
									<label>Entrada</label>

									<input
										type="date"
										value={serviceForm.checkin}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, checkin: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Kilómetros</label>

									<input
										type="number"
										value={serviceForm.kms}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, kms: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Tipo de Serviço</label>

									<select
										value={serviceForm.service_type_id}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, service_type_id: e.target.value }))
										}
									>
										<option value="">Mecânica (padrão)</option>
										{serviceTypes.map((type) => (
											<option key={type.id} value={type.id}>
												{type.name}
											</option>
										))}
									</select>
								</div>

								<div className="field">
									<label>Nome do Responsável</label>

									<input
										type="text"
										placeholder="S/ Nome"
										value={serviceForm.r_name ?? ""}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, r_name: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Telemóvel do Responsável</label>

									<input
										type="text"
										placeholder="S/ Telemóvel"
										value={serviceForm.r_phone ?? ""}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, r_phone: e.target.value }))
										}
									/>
								</div>
							</div>

							<div className="details-actions">
								<button
									className="confirm"
									onClick={createServiceFromSchedule}
									disabled={creatingServiceLoading}
								>
									<i className="fa-solid fa-check" /> {creatingServiceLoading ? "A Criar..." : "Criar Serviço"}
								</button>

								<button
									className="cancel"
									onClick={() => {
										setCreatingService(false);
										setServiceForm(emptyServiceForm);
									}}
									disabled={creatingServiceLoading}
								>
									<i className="fa-solid fa-xmark" /> Cancelar
								</button>
							</div>

						</div>
					</div>
				)}

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Serviços Relacionados</h1>
					</div>

					<div className="body">
						{loadingRelatedServices ? (
							<p className="schedules-show-empty">A carregar serviços...</p>
						) : relatedServices.length === 0 ? (
							<p className="schedules-show-empty">Sem serviços associados a esta marcação.</p>
						) : (
							<table>
								<thead>
									<tr>
										<th>ID do Serviço</th>
										<th>Entrada</th>
										<th></th>
									</tr>
								</thead>

								<tbody>
									{relatedServices.map((service) => (
										<tr key={service.id}>
											<td data-label="ID do Serviço">#{service.id}</td>
											<td data-label="Entrada">{service.checkin || "-"}</td>

											<td className="actions">
												<Link className="options" to={`/service/${service.id}`}>
													<i className="fa-solid fa-arrow-up-right-from-square" />
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}
