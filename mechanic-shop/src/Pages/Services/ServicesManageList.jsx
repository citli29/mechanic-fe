import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesManageList.css";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";
import { pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 10;

export default function ServicesManageList() {

	const requestIdRef = useRef(0);

	const [services, setServices] = useState([]);
	const [serviceTypes, setServiceTypes] = useState([]);

	const [search, setSearch] = useState("");

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [sortColumn, setSortColumn] = useState(null);
	const [sortDirection, setSortDirection] = useState("asc");

	const [loading, setLoading] = useState(true);

	const [editing, setEditing] = useState(null);
	const [editSchedules, setEditSchedules] = useState([]);
	const [editLoading, setEditLoading] = useState(false);

	function handleApiError(err) {
		console.error(err);
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			setServiceTypes(res.data.service_type_list || []);
		} catch (err) {
			console.error(err);
		}
	}


	async function loadServices() {
		const requestId = ++requestIdRef.current;

		setLoading(true);

		try {
			const params = { p: page, u: PER_PAGE };

			if (search) params.q = search;

			if (sortColumn) {
				params.sort = sortColumn;
				params.dir = sortDirection;
			}

			const res = await api.get("/services", { params });

			if (requestId !== requestIdRef.current) return;

			setServices(res.data.service_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.service_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			handleApiError(err);
			setServices([]);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	useEffect(() => { loadServiceTypes(); }, []);

	useEffect(() => { loadServices(); }, [page]);

	useEffect(() => {
		if (page !== 1) {
			setPage(1);
		} else {
			loadServices();
		}
	}, [sortColumn, sortDirection]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadServices();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [search]);


	function handleSort(column) {
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortColumn(column);
			setSortDirection("asc");
		}
	}


	function renderSortableHeader(column, label) {
		const isActive = sortColumn === column;

		return (
			<th className="sortable" onClick={() => handleSort(column)}>
				{label}
				<i
					className={`fa-solid ${isActive && sortDirection === "desc" ? "fa-sort-down" : isActive ? "fa-sort-up" : "fa-sort"}`}
				/>
			</th>
		);
	}


	async function getFreeSchedules() {
		try {
			const res = await api.get("schedules/free");
			return res.data.schedule_list || [];
		} catch (err) {
			console.error(err);
			return [];
		}
	}


	async function getSchedule(id) {
		try {
			const res = await api.get(`schedules/${id}`);
			return res.data.schedule || null;
		} catch (err) {
			console.error(err);
			return null;
		}
	}


	async function startEdit(service) {
		setEditLoading(true);

		try {
			const res = await api.get(`/services/${service.id}`);

			setEditing(res.data.service);

			let list = await getFreeSchedules();

			if (res.data.service.schedule_id) {
				const current = await getSchedule(res.data.service.schedule_id);
				if (current) list.push(current);
			}

			list = [...new Map(list.map((s) => [s.id, s])).values()];
			list.sort((a, b) => a.id - b.id);

			setEditSchedules(list);
		} catch (err) {
			handleApiError(err);
			setEditing(null);
		} finally {
			setEditLoading(false);
		}
	}


	function cancelEdit() {
		setEditing(null);
		setEditSchedules([]);
	}


	async function saveEdit() {
		try {
			await api.put(`/services/${editing.id}`, editing);

			pushSuccessToast("Serviço atualizado com sucesso.");

			cancelEdit();
			loadServices();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteService(service) {
		const confirmed = window.confirm(
			`Apagar o serviço #${service.id} (${service.client_name || "s/cliente"})? Esta ação não pode ser desfeita.`
		);

		if (!confirmed) return;

		try {
			await api.delete(`/services/${service.id}`);

			pushSuccessToast("Serviço apagado com sucesso.");

			loadServices();
		} catch (err) {
			handleApiError(err);
		}
	}


	return (
		<div className="page services-manage-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-list-check" />
						<h1>Gestão de Serviços</h1>
					</div>

					<div className="body">

						<div className="filters">
							<input
								placeholder="Pesquisar por cliente, matrícula ou telemóvel..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>

						<table>
							<thead>
								<tr>
									{renderSortableHeader("id", "ID")}
									{renderSortableHeader("service_type_name", "Tipo de Serviço")}
									{renderSortableHeader("schedule_id", "Marcação")}
									{renderSortableHeader("car_plate", "Matrícula")}
									<th>Cliente</th>
									<th>Telemóvel</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{loading && services.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
									</tr>
								) : !loading && services.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem serviços.</td>
									</tr>
								) : (
									services.map((service) => {
										const isEditingRow = editing?.id === service.id;
										const rowDisabled = !isEditingRow || editLoading;

										const serviceTypeValue = isEditingRow ? editing.service_type_id : service.service_type_id;
										const serviceTypeAccent = getServiceTypeAccent(
											serviceTypeValue,
											serviceTypes.find((t) => String(t.id) === String(serviceTypeValue))?.name
										);
										const scheduleValue = isEditingRow ? editing.schedule_id : service.schedule_id;

										const scheduleOptions = isEditingRow
											? editSchedules
											: (service.schedule_id ? [{ id: service.schedule_id }] : []);

										return (
											<tr key={service.id} className={isEditingRow ? "editing" : ""}>
												<td data-label="ID"><span className="cell-truncate" title={`#${service.id}`}>#{service.id}</span></td>
												<td data-label="Tipo de Serviço">
													<select
														disabled={rowDisabled}
														value={serviceTypeValue || ""}
														onChange={(e) => setEditing((prev) => ({ ...prev, service_type_id: e.target.value }))}
														style={{
															borderColor: serviceTypeAccent,
															background: `${serviceTypeAccent}1a`,
														}}
													>
														{serviceTypes.map((type) => (
															<option key={type.id} value={type.id}>{type.name}</option>
														))}
													</select>
												</td>

												<td data-label="Marcação">
													<select
														disabled={rowDisabled}
														value={scheduleValue || ""}
														onChange={(e) => setEditing((prev) => ({ ...prev, schedule_id: e.target.value || null }))}
													>
														<option value="">S/Marcação</option>
														{scheduleOptions.map((s) => (
															<option key={s.id} value={s.id}># {s.id}</option>
														))}
													</select>
												</td>

												<td data-label="Matrícula"><span className="cell-truncate" title={service.car_plate || "-"}>{service.car_plate || "-"}</span></td>
												<td data-label="Cliente"><span className="cell-truncate" title={service.client_name || "-"}>{service.client_name || "-"}</span></td>
												<td data-label="Telemóvel"><span className="cell-truncate" title={service.client_phone || "-"}>{service.client_phone || "-"}</span></td>

												<td className="actions">
													<Link className="options" to={`/service/${service.id}`}>
														<i className="fa-solid fa-arrow-up-right-from-square" />
													</Link>

													{isEditingRow ? (
														<>
															<button className="confirm" disabled={editLoading} onClick={saveEdit}>
																<i className="fa-solid fa-check" />
															</button>
															<button className="cancel" onClick={cancelEdit}>
																<i className="fa-solid fa-x" />
															</button>
														</>
													) : (
														<>
															<button className="options" onClick={() => startEdit(service)}>
																<i className="fa-solid fa-pencil" />
															</button>
															<button className="cancel" onClick={() => deleteService(service)}>
																<i className="fa-solid fa-trash" />
															</button>
														</>
													)}
												</td>
											</tr>
										);
									})
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

							<span>Página {page} de {totalPages} ({total} serviços)</span>

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
