import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useFilterChange, useUrlParam } from "../../utils/useUrlState";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Services/Style/ServicesManageList.css";
import "./Style/BudgetsManageList.css";
import { pushSuccessToast } from "../../utils/errorToast";
import { confirmDialog } from "../../utils/confirmDialog";

// Gestão de Orçamentos: every orçamento of every service in one table, like
// Gestão de Serviços. Edit a row's title / note / Orçamentado in place, or
// delete it. Products are still edited on the service page (the link
// opens that orçamento there). The DB rules apply: while Orçamentado only
// the note can change, and it can't be deleted until un-marked.

const PER_PAGE = 15;
const TITLE_MAX_LENGTH = 96;

const STATUS_FILTERS = [
	{ value: "", label: "Todos os estados" },
	{ value: "false", label: "Por orçamentar" },
	{ value: "true", label: "Orçamentados" },
];

const SERVICE_FILTERS = [
	{ value: "", label: "Todos os serviços" },
	{ value: "false", label: "Serviço por terminar" },
	{ value: "true", label: "Serviço finalizado" },
];

const isDone = (budget) => Number(budget.done) === 1;

export default function BudgetsManageList() {

	const requestIdRef = useRef(0);

	const [budgets, setBudgets] = useState([]);
	const [search, setSearch] = useUrlParam("q", "");
	const [statusFilter, setStatusFilter] = useUrlParam("status", "");
	const [serviceFilter, setServiceFilter] = useUrlParam("service", "");

	const [page, setPage] = useUrlParam("p", 1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [sortColumn, setSortColumn] = useUrlParam("sort", null);
	const [sortDirection, setSortDirection] = useUrlParam("dir", "asc");

	const [loading, setLoading] = useState(true);

	// { id, service_id, title, note, done } of the row being edited, and
	// the row as it was, so only what changed is sent.
	const [editing, setEditing] = useState(null);
	const editingOriginalRef = useRef(null);
	const [editLoading, setEditLoading] = useState(false);


	async function loadBudgets() {
		const requestId = ++requestIdRef.current;
		setLoading(true);

		try {
			const params = { p: page, u: PER_PAGE };

			// "#12" looks up orçamento nº 12; anything else is a text search.
			const idMatch = search.trim().match(/^#\s*(\d+)$/);
			if (idMatch) params.id = idMatch[1];
			else if (search.trim() && search.trim() !== "#") params.q = search.trim();

			if (statusFilter) params.done = statusFilter;
			if (serviceFilter) params.service_finished = serviceFilter;

			if (sortColumn) {
				params.sort = sortColumn;
				params.dir = sortDirection;
			}

			const res = await api.get("/budgets", { params });
			if (requestId !== requestIdRef.current) return;

			setBudgets(res.data.budget_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			console.error(err);
			setBudgets([]);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	// Back to page 1 whenever what's listed changes (the search waits a bit
	// for typing to stop).
	function reloadFromFirstPage() {
		if (page !== 1) setPage(1);
		else loadBudgets();
	}

	useEffect(() => { loadBudgets(); }, [page]);

	// Only on a real change (not on load): what came from the URL stays.
	useFilterChange({ sortColumn, sortDirection, statusFilter, serviceFilter }, reloadFromFirstPage, 0);

	useFilterChange(search, reloadFromFirstPage);


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
				<i className={`fa-solid ${isActive && sortDirection === "desc" ? "fa-sort-down" : isActive ? "fa-sort-up" : "fa-sort"}`} />
			</th>
		);
	}


	function startEdit(budget) {
		const row = {
			id: budget.id,
			service_id: budget.service_id,
			title: budget.title ?? "",
			note: budget.note ?? "",
			done: isDone(budget),
		};
		editingOriginalRef.current = row;
		setEditing(row);
	}


	function cancelEdit() {
		setEditing(null);
		editingOriginalRef.current = null;
	}


	async function saveEdit() {
		const original = editingOriginalRef.current;
		const changes = {};

		if (editing.title.trim() !== original.title) changes.title = editing.title;
		if (editing.note !== original.note) changes.note = editing.note;
		if (editing.done !== original.done) changes.done = editing.done;

		if (Object.keys(changes).length === 0) {
			cancelEdit();
			return;
		}

		setEditLoading(true);

		try {
			await api.patch(`services/${editing.service_id}/budgets/${editing.id}`, changes);
			pushSuccessToast("Orçamento atualizado com sucesso.");
			cancelEdit();
			loadBudgets();
		} catch (err) {
			console.error(err, err?.response?.data?.error);
		} finally {
			setEditLoading(false);
		}
	}


	async function deleteBudget(budget) {
		if (isDone(budget)) return;

		const products = Number(budget.product_count) || 0;
		const confirmed = await confirmDialog(
			`Apagar o orçamento nº ${budget.id} "${budget.title || "Sem título"}" (serviço #${budget.service_id})` +
			(products > 0 ? ` e os seus ${products} produto(s)` : "") +
			"? Esta ação não pode ser desfeita."
		);

		if (!confirmed) return;

		try {
			await api.delete(`services/${budget.service_id}/budgets/${budget.id}`);
			pushSuccessToast("Orçamento apagado com sucesso.");
			if (editing?.id === budget.id) cancelEdit();
			loadBudgets();
		} catch (err) {
			console.error(err, err?.response?.data?.error);
		}
	}


	return (
		<div className="page services-manage-page budgets-manage-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-file-invoice" />
						<h1>Gestão de Orçamentos</h1>
					</div>

					<div className="body">

						<div className="filters budgets-manage-filters">
							<input
								placeholder="Pesquisar título, matrícula, cliente, nº de serviço ou #nº do orçamento..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
								{STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
							</select>
							<select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
								{SERVICE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
							</select>
						</div>

						<table>
							<thead>
								<tr>
									{renderSortableHeader("id", "Nº")}
									{renderSortableHeader("title", "Título")}
									{renderSortableHeader("service_id", "Serviço")}
									{renderSortableHeader("car_plate", "Matrícula")}
									{renderSortableHeader("client_name", "Cliente")}
									{renderSortableHeader("product_count", "Produtos")}
									<th>Nota</th>
									{renderSortableHeader("done", "Estado")}
									<th></th>
								</tr>
							</thead>

							<tbody>
								{loading && budgets.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
									</tr>
								) : !loading && budgets.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem orçamentos.</td>
									</tr>
								) : (
									budgets.map((budget) => {
										const isEditingRow = editing?.id === budget.id;
										const row = isEditingRow ? editing : { title: budget.title ?? "", note: budget.note ?? "", done: isDone(budget) };
										const rowDisabled = !isEditingRow || editLoading;
										// The DB locks the title while it stays Orçamentado.
										const titleLocked = isEditingRow && editingOriginalRef.current?.done && editing.done;
										const serviceFinished = Number(budget.service_is_finished) === 1;

										return (
											<tr key={budget.id} className={isEditingRow ? "editing" : ""}>
												<td data-label="Nº"><span className="cell-truncate">{budget.id}</span></td>

												<td data-label="Título">
													<input
														type="text"
														maxLength={TITLE_MAX_LENGTH}
														disabled={rowDisabled || titleLocked}
														title={titleLocked ? "Desmarque Orçamentado para mudar o título" : row.title}
														placeholder="Sem título"
														value={row.title}
														onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))}
													/>
												</td>

												<td data-label="Serviço">
													<span className="cell-truncate" title={serviceFinished ? "Serviço finalizado" : "Serviço por terminar"}>
														#{budget.service_id}
														{serviceFinished && <i className="fa-solid fa-flag-checkered budgets-manage-finished" />}
													</span>
												</td>

												<td data-label="Matrícula"><span className="cell-truncate" title={budget.car_plate || "-"}>{budget.car_plate || "-"}</span></td>
												<td data-label="Cliente"><span className="cell-truncate" title={budget.client_name || "-"}>{budget.client_name || "-"}</span></td>
												<td data-label="Produtos"><span className="cell-truncate">{budget.product_count ?? 0}</span></td>

												<td data-label="Nota">
													<input
														type="text"
														disabled={rowDisabled}
														title={row.note}
														placeholder="-"
														value={row.note}
														onChange={(e) => setEditing((prev) => ({ ...prev, note: e.target.value }))}
													/>
												</td>

												<td data-label="Estado">
													<button
														type="button"
														className={`budgets-manage-status ${row.done ? "is-done" : ""}`}
														disabled={rowDisabled}
														onClick={() => setEditing((prev) => ({ ...prev, done: !prev.done }))}
													>
														<i className={`fa-fw ${row.done ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`} />
														{row.done ? "Orçamentado" : "Por orçamentar"}
													</button>
												</td>

												<td className="actions">
													<Link className="options" to={`/services/${budget.service_id}?orcamento=${budget.id}`} title="Abrir na folha de serviço">
														<i className="fa-solid fa-arrow-up-right-from-square" />
													</Link>

													{isEditingRow ? (
														<>
															<button className="confirm" disabled={editLoading} onClick={saveEdit} title="Guardar">
																<i className="fa-solid fa-check" />
															</button>
															<button className="cancel" onClick={cancelEdit} title="Cancelar">
																<i className="fa-solid fa-x" />
															</button>
														</>
													) : (
														<>
															<button className="options" disabled={!!editing} onClick={() => startEdit(budget)} title="Editar">
																<i className="fa-solid fa-pencil" />
															</button>
															<button
																className="cancel"
																disabled={isDone(budget) || !!editing}
																title={isDone(budget) ? "Desmarque Orçamentado para poder apagar" : "Apagar"}
																onClick={() => deleteBudget(budget)}
															>
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
							<button className="options" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} orçamentos)</span>

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
