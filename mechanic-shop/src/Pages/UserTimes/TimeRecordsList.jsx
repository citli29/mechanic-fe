import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./TimeRecordsList.css";
import ServiceTypeBadge from "../../components/ServiceTypeBadge/ServiceTypeBadge";
import { pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 20;

// Time entries (minutes on a day) and punches (start/end clock) of every
// service, with filters, sorting and inline editing. Rows are edited and
// deleted by their real id (/user_times/:id, /user_time_punches/:id) — not
// by their position inside a service like the service page does.
const TABS = [
	{ key: "times", label: "Tempos", icon: "fa-hourglass-half", endpoint: "/user_times", listKey: "time_list" },
	{ key: "punches", label: "Pontos", icon: "fa-stopwatch", endpoint: "/user_time_punches", listKey: "punch_list" },
	// Started and never stopped — someone forgot to end them.
	{ key: "open", label: "Pontos em Aberto", icon: "fa-triangle-exclamation", endpoint: "/user_time_punches", listKey: "punch_list", params: { open: "1" } },
];

const EMPTY_FILTERS = { user_id: "", service_id: "", date_from: "", date_to: "", car_plate: "", client_name: "" };

function today() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(value) {
	const [y, m, d] = String(value || "").split("-");
	return y && m && d ? `${d}/${m}/${y}` : "-";
}

// 135 → "2h 15m"
function formatMinutes(minutes) {
	if (minutes === null || minutes === undefined || minutes === "") return "-";
	const m = Number(minutes);
	const h = Math.floor(m / 60);
	return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

function newRow(tab) {
	return tab === "times"
		? { id: null, service_id: "", user_id: "", date: today(), minutes: "" }
		: { id: null, service_id: "", user_id: "", date: today(), start: "", end: "" };
}

export default function TimeRecordsList() {

	const requestIdRef = useRef(0);

	const [tab, setTab] = useState("times");
	const [rows, setRows] = useState([]);
	const [counts, setCounts] = useState({});
	const [users, setUsers] = useState([]);

	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [debouncedFilters, setDebouncedFilters] = useState(EMPTY_FILTERS);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [sortColumn, setSortColumn] = useState(null);
	const [sortDirection, setSortDirection] = useState("desc");

	const [loading, setLoading] = useState(true);

	// The row being edited, or a new one (id null) shown at the top.
	const [editing, setEditing] = useState(null);
	const [saving, setSaving] = useState(false);

	const activeTab = TABS.find((t) => t.key === tab);
	const isTimes = tab === "times";

	function activeParams() {
		const params = {};
		Object.entries(debouncedFilters).forEach(([key, value]) => {
			if (value !== "") params[key] = value;
		});
		return params;
	}


	async function loadUsers() {
		try {
			const res = await api.get("/users");
			setUsers(res.data.user_list || []);
		} catch (err) {
			console.error(err);
		}
	}


	async function loadCounts() {
		try {
			const base = activeParams();
			const results = await Promise.all(
				TABS.map((t) => api.get(t.endpoint, { params: { ...base, ...t.params, p: 1, u: 1 } }))
			);
			const next = {};
			TABS.forEach((t, i) => { next[t.key] = results[i].data.pagination?.total ?? 0; });
			setCounts(next);
		} catch (err) {
			console.error(err);
		}
	}


	async function loadRows() {
		const requestId = ++requestIdRef.current;
		setLoading(true);

		try {
			const params = { ...activeParams(), ...activeTab.params, p: page, u: PER_PAGE };

			if (sortColumn) {
				params.sort = sortColumn;
				params.dir = sortDirection;
			}

			const res = await api.get(activeTab.endpoint, { params });
			if (requestId !== requestIdRef.current) return;

			setRows(res.data[activeTab.listKey] || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			console.error(err);
			setRows([]);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	function reload() {
		loadRows();
		loadCounts();
	}


	useEffect(() => { loadUsers(); }, []);

	// Anything that changes which rows match goes back to page 1 (here and
	// in selectTab / handleSort).
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedFilters(filters);
			setPage(1);
		}, 400);
		return () => clearTimeout(timer);
	}, [filters]);

	useEffect(() => { loadRows(); }, [page, tab, debouncedFilters, sortColumn, sortDirection]);

	useEffect(() => { loadCounts(); }, [debouncedFilters]);


	function selectTab(key) {
		setEditing(null);
		setTab(key);
		setPage(1);
	}


	function handleSort(column) {
		setPage(1);
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortColumn(column);
			setSortDirection(column === "date" || column === "minutes" ? "desc" : "asc");
		}
	}


	function renderSortableHeader(column, label) {
		const isActive = sortColumn === column;

		return (
			<th className="sortable" onClick={() => handleSort(column)}>
				{label}
				<i className={`fa-solid ${isActive && sortDirection === "desc" ? "fa-sort-down" : isActive ? "fa-sort-up" : "fa-sort"}`} />
			</th>
		);
	}


	function setFilter(key, value) {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}


	function startEdit(row) {
		setEditing(isTimes
			? { id: row.id, service_id: row.service_id, user_id: row.user_id, date: row.date, minutes: row.minutes }
			: { id: row.id, service_id: row.service_id, user_id: row.user_id, date: row.date, start: row.start || "", end: row.end || "" });
	}


	function startAdd() {
		const row = newRow(isTimes ? "times" : "punches");
		// Filtering by one service / employee: the new row starts with them.
		if (filters.service_id) row.service_id = filters.service_id;
		if (filters.user_id) row.user_id = filters.user_id;
		setEditing(row);
	}


	async function saveEdit() {
		if (!editing || saving) return;

		setSaving(true);
		try {
			const body = isTimes
				? { service_id: editing.service_id, user_id: editing.user_id, date: editing.date, minutes: editing.minutes }
				: { service_id: editing.service_id, user_id: editing.user_id, date: editing.date, start: editing.start, end: editing.end };

			if (editing.id) {
				await api.put(`${activeTab.endpoint}/${editing.id}`, body);
				pushSuccessToast(isTimes ? "Tempo atualizado com sucesso." : "Ponto atualizado com sucesso.");
			} else {
				await api.post(activeTab.endpoint, body);
				pushSuccessToast(isTimes ? "Tempo adicionado com sucesso." : "Ponto adicionado com sucesso.");
			}

			setEditing(null);
			reload();
		} catch (err) {
			// console.error shows the backend's message as a toast.
			console.error(err, err?.response?.data?.error);

			// Deleted by someone else meanwhile: nothing left to edit here.
			if (err?.response?.status === 404) {
				setEditing(null);
				reload();
			}
		} finally {
			setSaving(false);
		}
	}


	async function deleteRow(row) {
		const what = isTimes
			? `o tempo de ${row.user_name} (${formatMinutes(row.minutes)}) de ${formatDate(row.date)}`
			: `o ponto de ${row.user_name} de ${formatDate(row.date)}`;

		if (!window.confirm(`Apagar ${what} do serviço #${row.service_id}?`)) return;

		try {
			await api.delete(`${activeTab.endpoint}/${row.id}`);
			pushSuccessToast(isTimes ? "Tempo apagado com sucesso." : "Ponto apagado com sucesso.");
			reload();
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			if (err?.response?.status === 404) reload();
		}
	}


	// row: the row being edited (undefined for a new one) — its matrícula
	// and cliente stay visible while editing.
	function renderEditCells(row) {
		const set = (key) => (e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }));

		return (
			<>
				<td data-label="Data"><input type="date" value={editing.date || ""} onChange={set("date")} /></td>
				<td data-label="Serviço">
					<input type="number" min="1" placeholder="Nº serviço" value={editing.service_id || ""} onChange={set("service_id")} />
				</td>
				<td data-label="Matrícula" className="tr-muted"><span className="cell-truncate">{row?.car_plate || "-"}</span></td>
				<td data-label="Cliente" className="tr-muted"><span className="cell-truncate">{row?.client_name || "-"}</span></td>
				<td data-label="Funcionário">
					<select value={editing.user_id || ""} onChange={set("user_id")}>
						<option value="">Funcionário</option>
						{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
					</select>
				</td>
				{isTimes ? (
					<td data-label="Minutos">
						<input type="number" min="1" max="1440" placeholder="Minutos" value={editing.minutes ?? ""} onChange={set("minutes")} />
					</td>
				) : (
					<>
						<td data-label="Início"><input type="time" value={editing.start || ""} onChange={set("start")} /></td>
						<td data-label="Fim"><input type="time" value={editing.end || ""} onChange={set("end")} /></td>
						<td data-label="Minutos" className="tr-muted">-</td>
					</>
				)}
				<td className="actions">
					<span />
					<button className="confirm" title="Guardar" disabled={saving} onClick={saveEdit}>
						<i className="fa-solid fa-check" />
					</button>
					<button className="cancel" title="Cancelar" onClick={() => setEditing(null)}>
						<i className="fa-solid fa-x" />
					</button>
				</td>
			</>
		);
	}


	function renderRow(row) {
		if (editing?.id === row.id) {
			return <tr key={row.id} className="editing">{renderEditCells(row)}</tr>;
		}

		const isOpen = !isTimes && row.start && !row.end;

		return (
			<tr key={row.id} className={isOpen ? "tr-open" : ""}>
				<td data-label="Data">{formatDate(row.date)}</td>
				<td data-label="Serviço">
					<span className="tr-service">
						#{row.service_id}
						<ServiceTypeBadge serviceTypeId={row.service_type_id} label={row.service_type_name} />
					</span>
				</td>
				<td data-label="Matrícula"><span className="cell-truncate" title={row.car_plate || "-"}>{row.car_plate || "-"}</span></td>
				<td data-label="Cliente"><span className="cell-truncate" title={row.client_name || "-"}>{row.client_name || "-"}</span></td>
				<td data-label="Funcionário"><span className="cell-truncate" title={row.user_name || "-"}>{row.user_name || "-"}</span></td>
				{isTimes ? (
					<td data-label="Minutos" title={`${row.minutes} minutos`}>{formatMinutes(row.minutes)}</td>
				) : (
					<>
						<td data-label="Início">{row.start || "-"}</td>
						<td data-label="Fim">{row.end || (row.start ? <span className="tr-open-badge">Em curso</span> : "-")}</td>
						<td data-label="Minutos">{formatMinutes(row.minutes)}</td>
					</>
				)}
				<td className="actions">
					<Link className="options" to={`/services/${row.service_id}#section-times`} title="Abrir serviço">
						<i className="fa-solid fa-arrow-up-right-from-square" />
					</Link>
					<button className="options" title="Editar" disabled={!!editing} onClick={() => startEdit(row)}>
						<i className="fa-solid fa-pencil" />
					</button>
					<button className="cancel" title="Apagar" disabled={!!editing} onClick={() => deleteRow(row)}>
						<i className="fa-solid fa-trash" />
					</button>
				</td>
			</tr>
		);
	}


	const columnCount = isTimes ? 7 : 9;

	return (
		<div className={`page time-records-page ${isTimes ? "tr-times" : "tr-punches"}`}>
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-business-time" />
						<h1>Registos de Tempo</h1>
					</div>

					<div className="body">

						<div className="tr-tabs">
							{TABS.map((t) => (
								<button
									key={t.key}
									className={`${tab === t.key ? "active" : ""} ${t.key === "open" && counts.open ? "tr-tab-warn" : ""}`}
									onClick={() => selectTab(t.key)}
								>
									<i className={`fa-solid ${t.icon}`} />
									{t.label}
									<span className="tr-tab-count">{counts[t.key] ?? 0}</span>
								</button>
							))}
						</div>

						<div className="filters">
							<select value={filters.user_id} onChange={(e) => setFilter("user_id", e.target.value)}>
								<option value="">Funcionário</option>
								{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
							</select>
							<input type="number" min="1" placeholder="Nº serviço" value={filters.service_id} onChange={(e) => setFilter("service_id", e.target.value)} />
							<input placeholder="Matrícula" value={filters.car_plate} onChange={(e) => setFilter("car_plate", e.target.value)} />
							<input placeholder="Cliente" value={filters.client_name} onChange={(e) => setFilter("client_name", e.target.value)} />
							<label className="tr-date-filter">
								De
								<input type="date" value={filters.date_from} onChange={(e) => setFilter("date_from", e.target.value)} />
							</label>
							<label className="tr-date-filter">
								Até
								<input type="date" value={filters.date_to} onChange={(e) => setFilter("date_to", e.target.value)} />
							</label>
							<button className="options" onClick={() => setFilters(EMPTY_FILTERS)}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>
							<button className="confirm" disabled={!!editing} onClick={startAdd}>
								<i className="fa-solid fa-plus" /> {isTimes ? "Adicionar Tempo" : "Adicionar Ponto"}
							</button>
						</div>

						<table>
							<thead>
								<tr>
									{renderSortableHeader("date", "Data")}
									{renderSortableHeader("service", "Serviço")}
									{renderSortableHeader("car_plate", "Matrícula")}
									{renderSortableHeader("client", "Cliente")}
									{renderSortableHeader("user", "Funcionário")}
									{isTimes ? (
										renderSortableHeader("minutes", "Minutos")
									) : (
										<>
											<th>Início</th>
											<th>Fim</th>
											{renderSortableHeader("minutes", "Minutos")}
										</>
									)}
									<th></th>
								</tr>
							</thead>

							<tbody>
								{editing && !editing.id && (
									<tr className="editing tr-new">{renderEditCells()}</tr>
								)}

								{loading && rows.length === 0 ? (
									<tr><td data-label="" style={{ gridColumn: `1 / span ${columnCount}` }}>A Carregar...</td></tr>
								) : !loading && rows.length === 0 ? (
									<tr><td data-label="" style={{ gridColumn: `1 / span ${columnCount}` }}>
										{tab === "open" ? "Nenhum ponto em aberto." : "Sem registos."}
									</td></tr>
								) : (
									rows.map(renderRow)
								)}
							</tbody>
						</table>

						<div className="pagination">
							<button className="options" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} registos)</span>

							<button className="options" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
