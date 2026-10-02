import { useEffect, useState } from "react";
import api from "../../api/axios";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";
import "./EventModal.css";

function validate(data) {
	if (!data.title.trim()) {
		pushErrorToast("O título do evento é obrigatório.");
		return false;
	}

	if (!data.start_date || !data.end_date) {
		pushErrorToast("As datas de início e fim são obrigatórias.");
		return false;
	}

	if (!!data.start_time !== !!data.end_time) {
		pushErrorToast("Preencha a hora de início e de fim, ou deixe ambas em branco para um evento de dia inteiro.");
		return false;
	}

	return true;
}

// Shown from both the services and schedules month calendars when an event
// pill is clicked — same component either way, since an event isn't tied to
// either page.
export default function EventModal({ event, onClose, onSaved }) {
	const [editing, setEditing] = useState({
		...event,
		description: event.description || "",
		start_time: event.start_time || "",
		end_time: event.end_time || "",
		color: event.color || "",
		user_id: event.user_id || "",
	});

	const [users, setUsers] = useState([]);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		async function loadUsers() {
			try {
				const res = await api.get("/users");
				setUsers(res.data.user_list || []);
			} catch (err) {
				console.error(err);
			}
		}

		loadUsers();
	}, []);

	function updateField(e) {
		const { name, value } = e.target;
		setEditing((prev) => ({ ...prev, [name]: value }));
	}

	async function handleSave() {
		if (!validate(editing)) return;

		setSaving(true);

		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/events/${editing.id}`, data);

			pushSuccessToast("Evento atualizado com sucesso.");
			onSaved();
		} catch (err) {
			console.error(err);
			setSaving(false);
		}
	}

	async function handleDelete() {
		const confirmed = window.confirm("Apagar este evento?");
		if (!confirmed) return;

		setDeleting(true);

		try {
			await api.delete(`/events/${editing.id}`);

			pushSuccessToast("Evento apagado com sucesso.");
			onSaved();
		} catch (err) {
			console.error(err);
			setDeleting(false);
		}
	}

	const busy = saving || deleting;

	return (
		<div className="event-modal-backdrop" onClick={onClose}>
			<div className="event-modal" onClick={(e) => e.stopPropagation()}>
				<div className="event-modal-header">
					<h2>Evento</h2>
					<button type="button" className="cancel" title="Fechar" onClick={onClose}>
						<i className="fa-solid fa-xmark" />
					</button>
				</div>

				<div className="event-modal-field">
					<label htmlFor="event-modal-title">Título</label>
					<input
						id="event-modal-title"
						name="title"
						value={editing.title || ""}
						disabled={busy}
						onChange={updateField}
					/>
				</div>

				<div className="event-modal-field">
					<label htmlFor="event-modal-description">Descrição</label>
					<textarea
						id="event-modal-description"
						name="description"
						value={editing.description}
						disabled={busy}
						onChange={updateField}
					/>
				</div>

				<div className="event-modal-row">
					<div className="event-modal-field">
						<label htmlFor="event-modal-start-date">Data de Início</label>
						<input
							id="event-modal-start-date"
							type="date"
							name="start_date"
							value={editing.start_date || ""}
							disabled={busy}
							onChange={updateField}
						/>
					</div>

					<div className="event-modal-field">
						<label htmlFor="event-modal-start-time">Hora de Início</label>
						<input
							id="event-modal-start-time"
							type="time"
							name="start_time"
							value={editing.start_time}
							disabled={busy}
							onChange={updateField}
						/>
					</div>
				</div>

				<div className="event-modal-row">
					<div className="event-modal-field">
						<label htmlFor="event-modal-end-date">Data de Fim</label>
						<input
							id="event-modal-end-date"
							type="date"
							name="end_date"
							value={editing.end_date || ""}
							disabled={busy}
							onChange={updateField}
						/>
					</div>

					<div className="event-modal-field">
						<label htmlFor="event-modal-end-time">Hora de Fim</label>
						<input
							id="event-modal-end-time"
							type="time"
							name="end_time"
							value={editing.end_time}
							disabled={busy}
							onChange={updateField}
						/>
					</div>
				</div>

				<div className="event-modal-row">
					<div className="event-modal-field event-modal-field-color">
						<label htmlFor="event-modal-color">Cor</label>
						<input
							id="event-modal-color"
							type="color"
							name="color"
							value={editing.color || "#2563eb"}
							disabled={busy}
							onChange={updateField}
						/>
					</div>

					<div className="event-modal-field">
						<label htmlFor="event-modal-user">Utilizador</label>
						<select
							id="event-modal-user"
							name="user_id"
							value={editing.user_id}
							disabled={busy}
							onChange={updateField}
						>
							<option value="">Sem Utilizador</option>
							{users.map((user) => (
								<option key={user.id} value={user.id}>{user.name}</option>
							))}
						</select>
					</div>
				</div>

				<div className="event-modal-actions">
					<button type="button" className="confirm" disabled={busy} onClick={handleSave}>
						{saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
						Guardar
					</button>

					<button type="button" className="cancel" disabled={busy} onClick={handleDelete}>
						{deleting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash" />}
						Apagar
					</button>
				</div>
			</div>
		</div>
	);
}
