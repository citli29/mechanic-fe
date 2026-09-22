import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Schedules/Style/ScheduleForm.css";

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

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


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


	async function createService() {
		if (!editing.client_id) {
			showMessage("error", "Selecione um cliente.");
			return;
		}

		if (!editing.checkin) {
			showMessage("error", "A data de entrada é obrigatória.");
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

			navigate(`/service/${res.data.service.id}`);
		} catch (err) {
			handleApiError(err);
		} finally {
			setSaving(false);
		}
	}

	const selectedTypeName = serviceTypes.find((t) => String(t.id) === String(editing.service_type_id))?.name;
	const selectedTypeAccent = getServiceTypeAccent(editing.service_type_id, selectedTypeName);


	return (
		<div className="page services-new-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Novo Serviço</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

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
