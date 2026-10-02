import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/EventsList.css";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 15;

const emptyEvent = {
	title: "",
	description: "",
	start_date: "",
	start_time: "",
	end_date: "",
	end_time: "",
	color: "",
	user_id: "",
};

function formatDateTime(date, time) {
	if (!date) return "-";
	return time ? `${date} ${time}` : date;
}

export default function EventsList() {

	const requestIdRef = useRef(0);

	const [events, setEvents] = useState([]);
	const [users, setUsers] = useState([]);

	const [filters, setFilters] = useState({
		title: "",
		user_id: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);
	const [newEvent, setNewEvent] = useState(emptyEvent);

	function handleApiError(err) {
		console.error(err);
	}


	useEffect(() => {
		loadEvents();
		loadUsers();
	}, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadEvents();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadEvents() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/events", { params });

			if (requestId !== requestIdRef.current) return;

			setEvents(res.data.event_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.event_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setEvents([]);
		}
	}


	async function loadUsers() {
		try {
			const res = await api.get("/users");
			setUsers(res.data.user_list || []);
		} catch (err) {
			console.error(err);
			setUsers([]);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function editEvent(event) {
		setEditing({
			...event,
			start_time: event.start_time || "",
			end_time: event.end_time || "",
			description: event.description || "",
			color: event.color || "",
			user_id: event.user_id || "",
		});
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	function updateNewEvent(e) {
		const { name, value } = e.target;
		setNewEvent((prev) => ({ ...prev, [name]: value }));
	}


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


	async function createEvent() {
		if (!validate(newEvent)) return;

		try {
			const data = Object.fromEntries(
				Object.entries(newEvent).filter(([_, value]) => value !== "")
			);

			await api.post("/events", data);

			pushSuccessToast("Evento criado com sucesso.");

			setCreating(false);
			setNewEvent(emptyEvent);

			loadEvents();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function saveEvent() {
		if (!validate(editing)) return;

		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/events/${editing.id}`, data);

			pushSuccessToast("Evento atualizado com sucesso.");

			setEditing(null);

			loadEvents();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteEvent(id) {
		const confirmed = window.confirm("Apagar este evento?");
		if (!confirmed) return;

		try {
			await api.delete(`/events/${id}`);

			pushSuccessToast("Evento apagado com sucesso.");

			loadEvents();
		} catch (err) {
			handleApiError(err);
		}
	}


	function clearFilters() {
		setFilters({ title: "", user_id: "" });
	}

	function renderUserField(value, onChange) {
		return (
			<select name="user_id" value={value || ""} onChange={onChange}>
				<option value="">Sem Utilizador</option>
				{users.map((user) => (
					<option key={user.id} value={user.id}>
						{user.name}
					</option>
				))}
			</select>
		);
	}

	return (
		<div className="page events-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-days" />
						<h1>Eventos</h1>
					</div>

					<div className="body">

						<div className="filters">
							<input
								name="title"
								placeholder="Título"
								value={filters.title}
								onChange={updateFilter}
							/>

							<select
								name="user_id"
								value={filters.user_id}
								onChange={updateFilter}
							>
								<option value="">Utilizador</option>
								{users.map((user) => (
									<option key={user.id} value={user.id}>
										{user.name}
									</option>
								))}
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button
									className="confirm"
									onClick={() => {
										setCreating(true);
										setNewEvent(emptyEvent);
									}}
								>
									<i className="fa-solid fa-plus" /> Adicionar Evento
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Título</th>
									<th>Início</th>
									<th>Fim</th>
									<th>Cor</th>
									<th>Utilizador</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Título">
											<input
												name="title"
												placeholder="Título"
												value={newEvent.title}
												onChange={updateNewEvent}
											/>
											<input
												name="description"
												placeholder="Descrição (opcional)"
												value={newEvent.description}
												onChange={updateNewEvent}
											/>
										</td>

										<td data-label="Início">
											<input
												type="date"
												name="start_date"
												value={newEvent.start_date}
												onChange={updateNewEvent}
											/>
											<input
												type="time"
												name="start_time"
												value={newEvent.start_time}
												onChange={updateNewEvent}
											/>
										</td>

										<td data-label="Fim">
											<input
												type="date"
												name="end_date"
												value={newEvent.end_date}
												onChange={updateNewEvent}
											/>
											<input
												type="time"
												name="end_time"
												value={newEvent.end_time}
												onChange={updateNewEvent}
											/>
										</td>

										<td data-label="Cor">
											<input
												type="color"
												name="color"
												value={newEvent.color || "#2563eb"}
												onChange={updateNewEvent}
											/>
										</td>

										<td data-label="Utilizador">
											{renderUserField(newEvent.user_id, updateNewEvent)}
										</td>

										<td className="actions">
											<button className="confirm" onClick={createEvent}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreating(false);
													setNewEvent(emptyEvent);
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{events.length === 0 && !creating ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem Eventos.</td>
									</tr>
								) : (
									events.map((event) => (
										editing?.id === event.id ? (
											<tr key={event.id} className="editing">
												<td data-label="Título">
													<input
														name="title"
														value={editing.title || ""}
														onChange={updateEdit}
													/>
													<input
														name="description"
														placeholder="Descrição (opcional)"
														value={editing.description || ""}
														onChange={updateEdit}
													/>
												</td>

												<td data-label="Início">
													<input
														type="date"
														name="start_date"
														value={editing.start_date || ""}
														onChange={updateEdit}
													/>
													<input
														type="time"
														name="start_time"
														value={editing.start_time || ""}
														onChange={updateEdit}
													/>
												</td>

												<td data-label="Fim">
													<input
														type="date"
														name="end_date"
														value={editing.end_date || ""}
														onChange={updateEdit}
													/>
													<input
														type="time"
														name="end_time"
														value={editing.end_time || ""}
														onChange={updateEdit}
													/>
												</td>

												<td data-label="Cor">
													<input
														type="color"
														name="color"
														value={editing.color || "#2563eb"}
														onChange={updateEdit}
													/>
												</td>

												<td data-label="Utilizador">
													{renderUserField(editing.user_id, updateEdit)}
												</td>

												<td className="actions">
													<button className="confirm" onClick={saveEvent}>
														<i className="fa-solid fa-check" />
													</button>
													<button
														className="cancel"
														onClick={() => setEditing(null)}
													>
														<i className="fa-solid fa-x" />
													</button>
												</td>
											</tr>
										) : (
											<tr key={event.id}>
												<td data-label="Título">
													<span className="cell-truncate" title={event.description || event.title}>{event.title}</span>
												</td>
												<td data-label="Início">
													<span className="cell-truncate">{formatDateTime(event.start_date, event.start_time)}</span>
												</td>
												<td data-label="Fim">
													<span className="cell-truncate">{formatDateTime(event.end_date, event.end_time)}</span>
												</td>
												<td data-label="Cor">
													{event.color && (
														<span className="event-color-swatch" style={{ background: event.color }} title={event.color} />
													)}
												</td>
												<td data-label="Utilizador">
													<span className="cell-truncate" title={event.user_name || "-"}>{event.user_name || "-"}</span>
												</td>

												<td className="actions">
													<button className="options" onClick={() => editEvent(event)}>
														<i className="fa-solid fa-pencil" />
													</button>
													<button
														className="cancel"
														onClick={() => deleteEvent(event.id)}
													>
														<i className="fa-solid fa-trash" />
													</button>
												</td>
											</tr>
										)
									))
								)}
							</tbody>
						</table>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} eventos)</span>

							<button
								className="options"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
