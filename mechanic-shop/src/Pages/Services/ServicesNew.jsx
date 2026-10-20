import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";
import { ServiceLab } from "../ServiceLab";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Schedules/Style/ScheduleForm.css";
import "./Style/ServicesNewLab.css";
import { pushErrorToast } from "../../utils/errorToast";

function oneLine(text) {
	return (text || "").replace(/\s+/g, " ").trim();
}

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export default function ServicesNew() {

	const navigate = useNavigate();

	const emptyService = {
		client_id: "",
		car_id: "",
		schedule_id: "",
		service_type_id: "",
		kms: "",
		checkin: formatDate(new Date()),
		checkout_predict: "",
		signed_service: "",
		malfunction: "",
		r_name: "",
		r_phone: "",
	};

	const [editing, setEditing] = useState(emptyService);
	const [serviceTypes, setServiceTypes] = useState([]);
	const [freeSchedules, setFreeSchedules] = useState([]);
	const [saving, setSaving] = useState(false);
	const [pendingSchedule, setPendingSchedule] = useState(null);


	// Lab items/actions/notes/properties picked before the service exists:
	// the Laboratório card runs as a draft (nothing hits the API) and hands
	// its records here; createLabDraftItems() replays them on the new id.
	const [labDraft, setLabDraft] = useState(null);


	function handleApiError(err) {
		console.error(err);
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			const types = res.data.service_type_list || [];
			setServiceTypes(types);

			// Mecânica is the common case — pre-selected so it's not an
			// extra click for the vast majority of services, while staying
			// changeable like any other field.
			const mecanica = types.find((t) => t.name === "Mecânica");
			if (mecanica) {
				setEditing((prev) => prev.service_type_id ? prev : { ...prev, service_type_id: mecanica.id });
			}
		} catch (err) {
			handleApiError(err);
		}
	}


	async function loadFreeSchedules() {
		try {
			const res = await api.get("/schedules/free");
			setFreeSchedules(res.data.schedule_list || []);
		} catch (err) {
			handleApiError(err);
		}
	}


	useEffect(() => {
		loadServiceTypes();
		loadFreeSchedules();
	}, []);


	function updateField(e) {
		const { name, value } = e.target;
		setEditing((prev) => ({ ...prev, [name]: value }));
	}


	function updateClientId(id) {
		setEditing((prev) => ({ ...prev, client_id: id }));
	}


	function updateCarId(id) {
		setEditing((prev) => ({ ...prev, car_id: id }));
	}


	function handleScheduleSelect(e) {
		const value = e.target.value;

		setEditing((prev) => ({ ...prev, schedule_id: value }));

		if (!value) return;

		const schedule = freeSchedules.find((s) => String(s.id) === String(value));

		if (schedule && oneLine(schedule.description)) {
			setPendingSchedule(schedule);
		}
	}


	function handleConfirmImportDescription() {
		const imported = pendingSchedule.description || "";
		const current = editing.malfunction || "";

		setEditing((prev) => ({
			...prev,
			malfunction: current ? `${imported}\n\n${current}` : imported,
		}));
		setPendingSchedule(null);
	}


	async function createLabDraftItems(serviceId) {
		const realItemIds = {};

		for (const labItem of labDraft.labItems) {
			const itemRes = await api.post(`/services/${serviceId}/lab_items`, {
				t_item_id: labItem.t_item_id,
			});
			realItemIds[labItem.id] = itemRes.data.lab_item.id;
		}

		for (const lav of labDraft.labActionValues) {
			const lavRes = await api.post(`/services/${serviceId}/lab_action_values`, {
				l_item_id: realItemIds[lav.l_item_id],
				t_action_id: lav.t_action_id,
			});
			// Created without a note — the note goes in afterwards.
			if (lav.note) {
				await api.put(`/services/${serviceId}/lab_action_values/${lavRes.data.slav.slav_id}`, { note: lav.note });
			}
		}

		for (const lpv of labDraft.labPropertyValues) {
			if (!lpv.value) continue;
			await api.post(`/services/${serviceId}/lab_property_values`, {
				l_item_id: realItemIds[lpv.l_item_id],
				property_id: lpv.property_id,
				value: lpv.value,
			});
		}
	}


	async function createService() {
		if (!editing.client_id) {
			pushErrorToast("Selecione um cliente.");
			return;
		}

		if (!editing.checkin) {
			pushErrorToast("A data de entrada é obrigatória.");
			return;
		}

		setSaving(true);

		try {
			const data = {
				client_id: editing.client_id,
				car_id: editing.car_id || null,
				schedule_id: editing.schedule_id || null,
				service_type_id: editing.service_type_id || null,
				kms: editing.kms === "" ? null : Number(editing.kms),
				checkin: editing.checkin,
				checkout_predict: editing.checkout_predict || null,
				signed_service: editing.signed_service || null,
				malfunction: editing.malfunction || null,
				r_name: editing.r_name || null,
				r_phone: editing.r_phone || null,
			};

			const res = await api.post("/services", data);
			const newServiceId = res.data.service.id;

			// The service exists by now — even if an item fails, go to it
			// (where the items can be finished) rather than staying here,
			// where saving again would create a second service.
			if (isLabService && labDraft?.labItems.length > 0) {
				try {
					await createLabDraftItems(newServiceId);
				} catch (err) {
					handleApiError(err);
					pushErrorToast("Serviço criado, mas alguns itens de laboratório não foram guardados.");
				}
			}

			navigate(`/services/${newServiceId}`);
		} catch (err) {
			handleApiError(err);
		} finally {
			setSaving(false);
		}
	}

	const selectedTypeName = serviceTypes.find((t) => String(t.id) === String(editing.service_type_id))?.name;
	const selectedTypeAccent = getServiceTypeAccent(editing.service_type_id, selectedTypeName);

	const laboratorioType = serviceTypes.find((t) => t.name === "Laboratório");
	const isLabService = !!laboratorioType && String(editing.service_type_id) === String(laboratorioType.id);


	return (
		<div className="page services-new-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Novo Serviço</h1>
					</div>

					<div className="body">

						<div className="details-grid">

							<div className="picker-row">
								<ClientPicker
									client_id={editing.client_id}
									onClientIdChange={updateClientId}
									isAllowedEditing={true}
								/>
							</div>

							<div className="picker-row">
								<CarPicker
									car_id={editing.car_id}
									onCarIdChange={updateCarId}
									isAllowedEditing={true}
								/>
							</div>

							<div className="field">
								<label htmlFor="service-type">Tipo de Serviço</label>
								<select
									id="service-type"
									name="service_type_id"
									value={editing.service_type_id}
									onChange={updateField}
									style={{
										borderColor: selectedTypeAccent,
										background: `${selectedTypeAccent}1a`,
									}}
								>
									{serviceTypes.map((type) => (
										<option key={type.id} value={type.id}>
											{type.name}
										</option>
									))}
								</select>
							</div>

							<div className="field">
								<label htmlFor="kms">Kms.</label>
								<input
									id="kms"
									type="number"
									min="0"
									name="kms"
									value={editing.kms}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="checkin">Entrada</label>
								<input
									id="checkin"
									type="date"
									name="checkin"
									value={editing.checkin}
									onChange={updateField}
									required
								/>
							</div>

							<div className="field">
								<label htmlFor="checkout-predict">Prev. Saída</label>
								<input
									id="checkout-predict"
									type="date"
									name="checkout_predict"
									value={editing.checkout_predict}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="r-name">Nome do Responsável</label>
								<input
									id="r-name"
									type="text"
									name="r_name"
									value={editing.r_name}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="r-phone">Telemóvel do Responsável</label>
								<input
									id="r-phone"
									type="text"
									name="r_phone"
									value={editing.r_phone}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="schedule">Marcação</label>
								<select
									id="schedule"
									name="schedule_id"
									value={editing.schedule_id}
									onChange={handleScheduleSelect}
								>
									<option value="">Sem Marcação</option>
									{freeSchedules.map((schedule) => (
										<option key={schedule.id} value={schedule.id}>
											#{schedule.id} — {schedule.date} — {oneLine(schedule.description)}
										</option>
									))}
								</select>
							</div>

						{/* Hidden rather than unmounted when another type is picked, so
						    switching back doesn't lose the items (the draft lives inside it). */}
						<div className="lab-draft-section field-full" hidden={!isLabService}>
							<span className="lab-draft-label">Itens de Laboratório</span>
							<div className="lab-draft-body">
								<ServiceLab draft onDraftChange={setLabDraft} />
							</div>
						</div>

							<div className="field field-full">
								<label htmlFor="signed-service">Serviço a Realizar</label>
								<textarea
									id="signed-service"
									name="signed_service"
									value={editing.signed_service}
									onChange={updateField}
									rows={8}
								/>
							</div>



							<div className="field field-full">
								<label htmlFor="malfunction">Descrição de Avaria</label>
								<textarea
									id="malfunction"
									name="malfunction"
									value={editing.malfunction}
									onChange={updateField}
									rows={8}
								/>
							</div>

						</div>

						<div className="details-actions">
							<button className="confirm" onClick={createService} disabled={saving}>
								<i className="fa-solid fa-check" /> {saving ? "A Criar..." : "Criar Serviço"}
							</button>

							<button className="cancel" onClick={() => navigate("/services")} disabled={saving}>
								<i className="fa-solid fa-xmark" /> Cancelar
							</button>
						</div>

					</div>
				</div>

			</div>

			{pendingSchedule && (
				<div className="schedule-import-backdrop" onClick={() => setPendingSchedule(null)}>
					<div className="schedule-import-modal" onClick={(e) => e.stopPropagation()}>
						<div className="schedule-import-header">
							<h2>Importar Descrição da Marcação</h2>
							<button className="cancel" onClick={() => setPendingSchedule(null)}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<p>A marcação #{pendingSchedule.id} tem a seguinte descrição:</p>

						<div className="schedule-import-text">
							{pendingSchedule.description}
						</div>

						<p>Deseja importar para a Descrição de Avaria?</p>

						<div className="schedule-import-actions">
							<button className="confirm" onClick={handleConfirmImportDescription}>
								<i className="fa-solid fa-check" /> Sim, Importar
							</button>
							<button className="cancel" onClick={() => setPendingSchedule(null)}>
								<i className="fa-solid fa-xmark" /> Não
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
