import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useFilterChange, useUrlParam } from "../../utils/useUrlState";
import { useVisiblePoll } from "../../utils/useVisiblePoll";

import "../Style/Page.css";
import "../Style/Card.css";
import "../ProductRequests/Style/ProductRequestsDashboard.css";
import "./Style/BudgetsDashboard.css";

// Orçamentos of every service, for the escritório, newest first and grouped
// by the day they were created (Hoje, Ontem, ...), with filters. Built like
// Encomendas (ProductRequestsDashboard) and reuses its group / table styling
// (.product-requests-page). The orçamentos themselves are created and edited
// on the service page; here they're read-only apart from the Orçamentado
// status.

const PER_PAGE = 20;

const STATUS_FILTERS = [
	{ value: "", label: "Todos os estados" },
	{ value: "false", label: "Por orçamentar" },
	{ value: "true", label: "Orçamentados" },
];

// days: how many days back from today's midnight (0 = only today).
const PERIOD_FILTERS = [
	{ value: "", label: "Qualquer data" },
	{ value: "0", label: "Hoje" },
	{ value: "6", label: "Últimos 7 dias" },
	{ value: "29", label: "Últimos 30 dias" },
];

const SERVICE_FILTERS = [
	{ value: "", label: "Todos os serviços" },
	{ value: "false", label: "Serviço por terminar" },
	{ value: "true", label: "Serviço finalizado" },
];

// created_at is stored in UTC ("YYYY-MM-DD HH:MM:SS").
const parseUtc = (value) => (value ? new Date(value.replace(" ", "T") + "Z") : null);

const toUtcSql = (date) => date.toISOString().slice(0, 19).replace("T", " ");

// Local midnight `days` days ago, as the API's UTC `from`.
function periodStart(days) {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - Number(days));
	return toUtcSql(date);
}

const localDayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function dayLabel(date) {
	if (!date) return "Sem data";

	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	if (localDayKey(date) === localDayKey(today)) return "Hoje";
	if (localDayKey(date) === localDayKey(yesterday)) return "Ontem";

	const label = date.toLocaleDateString("pt-PT", {
		weekday: "long",
		day: "numeric",
		month: "long",
		...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
	});
	return label.charAt(0).toUpperCase() + label.slice(1);
}

const timeLabel = (date) => (date ? date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "");

// Consecutive orçamentos of the same local day, in list order.
function groupByDay(budgets) {
	const groups = [];

	budgets.forEach((budget) => {
		const date = parseUtc(budget.created_at);
		const key = date ? localDayKey(date) : "none";
		const last = groups[groups.length - 1];

		if (last && last.key === key) last.items.push(budget);
		else groups.push({ key, label: dayLabel(date), items: [budget] });
	});

	return groups;
}

function budgetContext(budget) {
	const carLabel = [
		budget.car_plate,
		[budget.car_make, budget.car_model].filter(Boolean).join(" "),
	].filter(Boolean).join(" - ");

	const label = [carLabel, budget.client_name].filter(Boolean).join(" · ");

	return label ? `${label} (#${budget.service_id})` : `Serviço #${budget.service_id}`;
}


export default function BudgetsDashboard() {

	const [searchParams] = useSearchParams();
	const requestIdRef = useRef(0);

	// Filters, search and page live in the URL: ← back keeps them.
	const [statusFilter, setStatusFilter] = useUrlParam("status", "");
	const [periodFilter, setPeriodFilter] = useUrlParam("period", "");
	const [serviceFilter, setServiceFilter] = useUrlParam("service", "");
	const [toQuoteCount, setToQuoteCount] = useState(null);

	// ?highlight={budget id} (the orçamento notification's link): briefly
	// outline it. Newest come first, so a fresh one is on page 1.
	const [highlightId, setHighlightId] = useState(() => Number(searchParams.get("highlight")) || null);

	const [items, setItems] = useState([]);
	const [page, setPage] = useUrlParam("p", 1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useUrlParam("q", "");
	const [loading, setLoading] = useState(true);

	const [savingId, setSavingId] = useState(null);

	// Title / note being edited, one at a time:
	// { budget, field: "title" | "note", value } or null.
	const [fieldEdit, setFieldEdit] = useState(null);
	const [isSavingField, setIsSavingField] = useState(false);
	const [budgetToUnmark, setBudgetToUnmark] = useState(null);


	useEffect(() => {
		if (!highlightId) return;

		// Drop just ?highlight (the filters in the URL stay).
		const params = new URLSearchParams(window.location.search);
		if (params.has("highlight")) {
			params.delete("highlight");
			const rest = params.toString();
			window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
		}

		const timer = setTimeout(() => setHighlightId(null), 4000);
		return () => clearTimeout(timer);
	}, []);


	// How many are still waiting, whatever the filters say.
	async function loadCounts() {
		try {
			const res = await api.get("/budgets", { params: { done: "false", p: 1, u: 1 } });
			setToQuoteCount(res.data.pagination?.total ?? 0);
		} catch (err) {
			console.error(err);
		}
	}


	async function loadItems() {
		const requestId = ++requestIdRef.current;
		setLoading(true);

		try {
			const params = { p: page, u: PER_PAGE };
			if (search.trim()) params.q = search.trim();
			if (statusFilter) params.done = statusFilter;
			if (periodFilter) params.from = periodStart(periodFilter);
			if (serviceFilter) params.service_finished = serviceFilter;

			const res = await api.get("/budgets", { params });
			if (requestId !== requestIdRef.current) return;

			setItems(res.data.budget_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId === requestIdRef.current) console.error(err);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	useEffect(() => { loadCounts(); }, []);

	// Picks up orçamentos created / marked / deleted elsewhere, keeping the
	// current filters and page.
	// Paused while a title / note is being edited, so it can't replace it.
	useVisiblePoll(() => { loadItems(); loadCounts(); }, 30000, !fieldEdit);

	useEffect(() => { loadItems(); }, [page]);

	// Back to page 1 whenever what's listed changes (the search waits a bit
	// for typing to stop).
	function reloadFromFirstPage() {
		if (page !== 1) setPage(1);
		else loadItems();
	}

	// Only on a real change (not on load): what came from the URL stays.
	useFilterChange({ statusFilter, periodFilter, serviceFilter }, reloadFromFirstPage, 0);

	useFilterChange(search, reloadFromFirstPage);

	useEffect(() => {
		if (!budgetToUnmark) return;
		const onKey = (e) => { if (e.key === "Escape") setBudgetToUnmark(null); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [budgetToUnmark]);


	const isEditingField = (budget, field) => fieldEdit?.budget.id === budget.id && fieldEdit.field === field;

	function startFieldEdit(budget, field) {
		setFieldEdit({ budget, field, value: budget[field] ?? "" });
	}

	function cancelFieldEdit() {
		if (!isSavingField) setFieldEdit(null);
	}

	// PATCHes just that field; on success the row is updated in place. On
	// failure (e.g. it was marked Orçamentado meanwhile) the error toast
	// shows and the edit stays open.
	async function saveFieldEdit() {
		if (!fieldEdit || isSavingField) return;

		const { budget, field } = fieldEdit;
		const value = field === "title" ? fieldEdit.value.trim() : fieldEdit.value;

		if (value === (budget[field] ?? "")) {
			setFieldEdit(null);
			return;
		}

		setIsSavingField(true);

		try {
			const res = await api.patch(`services/${budget.service_id}/budgets/${budget.id}`, { [field]: value });
			const saved = res.data.budget;
			setItems((prev) => prev.map((b) => (b.id === budget.id ? { ...b, [field]: saved[field] } : b)));
			setFieldEdit(null);
		} catch (err) {
			console.error(err, err?.response?.data?.error);
		} finally {
			setIsSavingField(false);
		}
	}

	function handleFieldKeyDown(e) {
		if (e.key === "Escape") {
			e.preventDefault();
			cancelFieldEdit();
		} else if (e.key === "Enter" && (fieldEdit?.field === "title" || e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			saveFieldEdit();
		}
	}

	function renderFieldButtons() {
		return (
			<span className="budget-edit-btns">
				<button type="button" className="is-confirm" title="Guardar" disabled={isSavingField} onClick={saveFieldEdit}>
					<i className={`fa-solid ${isSavingField ? "fa-spinner fa-spin" : "fa-check"}`} />
				</button>
				<button type="button" className="is-cancel" title="Cancelar (Esc)" disabled={isSavingField} onClick={cancelFieldEdit}>
					<i className="fa-solid fa-xmark" />
				</button>
			</span>
		);
	}


	// Marking is immediate; un-marking asks first (same as the service page).
	function handleClickStatus(budget) {
		if (Number(budget.done) === 1) setBudgetToUnmark(budget);
		else saveStatus(budget, true);
	}


	async function saveStatus(budget, done) {
		setBudgetToUnmark(null);
		setSavingId(budget.id);

		try {
			await api.patch(`services/${budget.service_id}/budgets/${budget.id}`, { done });
			await Promise.all([loadItems(), loadCounts()]);
		} catch (err) {
			console.error(err, err?.response?.data?.error);
		} finally {
			setSavingId(null);
		}
	}


	function renderBudgets() {
		if (loading && items.length === 0) return <p className="pr-empty">A carregar...</p>;
		if (!loading && items.length === 0) return <p className="pr-empty">Sem orçamentos com estes filtros.</p>;

		return (
			<div className="budget-days">
				{groupByDay(items).map((day) => (
					<section key={day.key} className="budget-day">
						<h2 className="budget-day-title">
							{day.label}
							<span className="pr-tab-count">{day.items.length}</span>
						</h2>

						<div className="pr-groups">
							{day.items.map(renderBudget)}
						</div>
					</section>
				))}
			</div>
		);
	}


	function renderBudget(budget) {
		const isDone = Number(budget.done) === 1;

		return (
			<div
				key={budget.id}
				ref={budget.id === highlightId ? (el) => el?.scrollIntoView({ behavior: "smooth", block: "center" }) : undefined}
				className={`pr-group budget-group ${isDone ? "is-done" : ""} ${budget.id === highlightId ? "is-highlighted" : ""}`}
			>
				<div className="pr-group-header budget-header">
					{/* Grid: status icon | title, with the car line under the title. */}
					<div className="budget-header-text">
						<i className={`budget-status-icon fa-fw ${isDone ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`} />
						<span className="budget-title">
							{isEditingField(budget, "title") ? (
								<>
									<input
										type="text"
										className="budget-title-input"
										autoFocus
										maxLength={96}
										placeholder="Sem título"
										value={fieldEdit.value}
										disabled={isSavingField}
										onChange={(e) => setFieldEdit((prev) => ({ ...prev, value: e.target.value }))}
										onKeyDown={handleFieldKeyDown}
									/>
									{renderFieldButtons()}
								</>
							) : (
								<>
									<span className="budget-title-text">{budget.title || "Sem título"}</span>
									{/* Locked while Orçamentado (DB rule): no pen then. */}
									{!isDone && (
										<button
											type="button"
											className="budget-pen"
											title="Mudar título"
											disabled={!!fieldEdit}
											onClick={() => startFieldEdit(budget, "title")}
										>
											<i className="fa-solid fa-pen" />
										</button>
									)}
								</>
							)}
						</span>
						<span className="budget-context">
							{timeLabel(parseUtc(budget.created_at))}
							{budget.created_at && " · "}
							{budgetContext(budget)}
						</span>
					</div>

					<div className="budget-header-actions">
						<button
							type="button"
							className={`budget-status ${isDone ? "is-done" : ""}`}
							disabled={savingId === budget.id || isEditingField(budget, "title")}
							title={isEditingField(budget, "title") ? "Guarde ou cancele o título primeiro" : undefined}
							onClick={() => handleClickStatus(budget)}
						>
							<i className={`fa-fw ${savingId === budget.id ? "fa-solid fa-spinner fa-spin" : isDone ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`} />
							{/* Both labels share one grid cell so the width never changes. */}
							<span className="budget-status-labels">
								<span className={isDone ? "hidden" : ""}>Não orçamentado</span>
								<span className={isDone ? "" : "hidden"}>Orçamentado</span>
							</span>
						</button>

						<Link
							className="options budget-open"
							to={`/services/${budget.service_id}?orcamento=${budget.id}`}
							title="Abrir na folha de serviço"
						>
							<i className="fa-solid fa-arrow-up-right-from-square" />
						</Link>
					</div>
				</div>

				{budget.products.length > 0 ? (
					<table>
						<thead>
							<tr>
								<th>Nome</th>
								<th>Referência</th>
								<th>Tipo</th>
								<th>Qt.</th>
							</tr>
						</thead>
						<tbody>
							{budget.products.map((p) => (
								<tr key={p.id}>
									<td data-label="Nome">{p.product_name || "-"}</td>
									<td data-label="Referência">{p.product_reference || "-"}</td>
									<td data-label="Tipo">{p.product_type_name || "-"}</td>
									<td data-label="Qt." className="budget-qty">{p.quantity}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p className="budget-no-products">Sem produtos.</p>
				)}

				{/* Note, on the same grid as the header (icon | text) so it lines
				   up with the title. Editable even when Orçamentado (same as
				   the service page). */}
				{isEditingField(budget, "note") ? (
					<div className="budget-note is-editing">
						<i className="budget-note-icon fa-regular fa-note-sticky" />
						<div className="budget-note-body">
							<span className="budget-note-label">Nota</span>
							<textarea
								autoFocus
								rows={3}
								placeholder="Escreva uma nota..."
								value={fieldEdit.value}
								disabled={isSavingField}
								onChange={(e) => setFieldEdit((prev) => ({ ...prev, value: e.target.value }))}
								onKeyDown={handleFieldKeyDown}
								onFocus={(e) => { const end = e.target.value.length; e.target.setSelectionRange(end, end); }}
							/>
							<div className="budget-note-actions">
								<span className="budget-note-hint">Ctrl+Enter guarda · Esc cancela</span>
								<button type="button" className="is-cancel" disabled={isSavingField} onClick={cancelFieldEdit}>
									Cancelar
								</button>
								<button type="button" className="is-confirm" disabled={isSavingField} onClick={saveFieldEdit}>
									<i className={`fa-solid ${isSavingField ? "fa-spinner fa-spin" : "fa-check"}`} /> Guardar
								</button>
							</div>
						</div>
					</div>
				) : budget.note ? (
					<div className="budget-note">
						<i className="budget-note-icon fa-regular fa-note-sticky" />
						<div className="budget-note-body">
							<span className="budget-note-label">Nota</span>
							<p className="budget-note-text">{budget.note}</p>
						</div>
						<button
							type="button"
							className="budget-note-edit"
							disabled={!!fieldEdit}
							onClick={() => startFieldEdit(budget, "note")}
						>
							<i className="fa-solid fa-pen" /> Editar
						</button>
					</div>
				) : (
					<button
						type="button"
						className="budget-note is-empty"
						disabled={!!fieldEdit}
						onClick={() => startFieldEdit(budget, "note")}
					>
						<i className="budget-note-icon fa-solid fa-plus" />
						<span>Adicionar nota</span>
					</button>
				)}
			</div>
		);
	}


	return (
		<div className="page product-requests-page budgets-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-file-invoice" />
						<h1>Orçamentos</h1>
					</div>

					<div className="body">

						<div className="filters budget-filters">
							<input
								placeholder="Pesquisar título, matrícula, cliente ou nº de serviço..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
							<select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
								{PERIOD_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
							</select>
							<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
								{STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
							</select>
							<select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
								{SERVICE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
							</select>

							{/* Switch: same filter as Estado → "Por orçamentar"; the count
							   is of all that are waiting, whatever else is filtered. */}
							<label className={`budget-waiting ${statusFilter === "false" ? "is-checked" : ""}`}>
								<input
									type="checkbox"
									checked={statusFilter === "false"}
									onChange={(e) => setStatusFilter(e.target.checked ? "false" : "")}
								/>
								<span className="budget-switch" aria-hidden="true" />
								<span className="budget-waiting-text">Por orçamentar</span>
								{toQuoteCount != null && (
									<span className={`budget-waiting-count ${toQuoteCount > 0 ? "has-waiting" : ""}`}>{toQuoteCount}</span>
								)}
							</label>
						</div>



						{renderBudgets()}

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} orçamentos)</span>

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

			{budgetToUnmark && (
				<div className="budget-modal-backdrop" onClick={() => setBudgetToUnmark(null)}>
					<div className="budget-modal" onClick={(e) => e.stopPropagation()}>
						<h2>Desmarcar orçamento?</h2>
						<p>
							"{budgetToUnmark.title || "Sem título"}" volta a <b>Não orçamentado</b> e pode
							voltar a ser editado na folha de serviço.
						</p>
						<div className="budget-modal-buttons">
							<button type="button" className="cancel" onClick={() => setBudgetToUnmark(null)}>Cancelar</button>
							<button type="button" className="primary" onClick={() => saveStatus(budgetToUnmark, false)}>Desmarcar</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
