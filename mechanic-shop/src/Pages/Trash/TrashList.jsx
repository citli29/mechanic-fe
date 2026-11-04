import { useEffect, useState } from "react";
import api from "../../api/axios";
import { getIsAdmin, onAccountChanged } from "../../api/account";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";
import { confirmDialog } from "../../utils/confirmDialog";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/TrashList.css";

// Lixo (admin only — the API refuses everyone else).
// Every delete on the main tables is saved for 90 days by the database
// (deleted_rows, see utils/trash_triggers.php). From here a row can be put
// back with its original id. Several can be restored together (e.g. an
// orçamento and its products); the server puts parents back first, and a
// row whose parent is still deleted is refused with nothing changed.

const PER_PAGE = 50;

const TABLE_LABELS = {
	services: "Serviço",
	clients: "Cliente",
	cars: "Viatura",
	schedules: "Marcação",
	events: "Evento",
	products: "Produto",
	makes: "Marca",
	models: "Modelo",
	product_types: "Tipo de produto",
	service_types: "Tipo de serviço",
	users: "Utilizador",
	budgets: "Orçamento",
	budget_products: "Produto de orçamento",
	services_user_time: "Registo de tempo",
	services_user_time_punches: "Ponto",
	services_applied_products: "Produto aplicado",
	services_products_requested: "Pedido de produto",
	service_associations: "Associação de serviços",
	lab_items: "Item de laboratório",
	lab_action_values: "Ação de laboratório",
	lab_property_values: "Propriedade de laboratório",
	schedule_lab_items: "Item de laboratório (marcação)",
	schedule_lab_action_values: "Ação de laboratório (marcação)",
	tabled_items: "Item (Gestão de Laboratório)",
	tabled_properties: "Propriedade (Gestão de Laboratório)",
	tabled_actions: "Ação (Gestão de Laboratório)",
	tabled_action_values: "Nota predefinida (Gestão de Laboratório)",
};

function tableLabel(table) {
	return TABLE_LABELS[table] || table;
}

// deleted_at / restored_at are UTC ("YYYY-MM-DD HH:MM:SS").
function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(String(value).replace(" ", "T") + "Z");
	if (isNaN(date)) return value;
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "2026-11-04" → "04/11/2026"
function formatDate(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
	return match ? `${match[3]}/${match[2]}/${match[1]}` : (value ?? "");
}

function hhmm(h, m) {
	if (h === null || h === undefined) return "--:--";
	return `${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

function short(text, max = 60) {
	const value = String(text ?? "").replace(/\s+/g, " ").trim();
	return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

// One line saying what was deleted, in words.
function describe(row) {
	const d = row.data || {};
	const n = row.names || {};
	const product = n.product_id || (d.product_id ? `Produto #${d.product_id}` : "Produto");
	const user = n.user_id || (d.user_id ? `Funcionário #${d.user_id}` : "");
	const service = d.service_id ? `serviço #${d.service_id}` : "";
	const join = (...parts) => parts.filter(Boolean).join(" — ");

	switch (row.table_name) {
		case "services":
			return join(`#${d.id}`, n.client_id, n.car_id, d.checkin_date && `entrada ${formatDate(d.checkin_date)}`, short(d.malfunction_description, 40));
		case "clients":
			return join(d.name, d.phone);
		case "cars":
			return join(d.plate, [n.make_id, n.model_id].filter(Boolean).join(" "));
		case "schedules":
			return join(formatDate(d.date), n.client_id, short(d.description, 40));
		case "events":
			return join(d.title, formatDate(d.start_date));
		case "products":
			return join(d.name, d.reference && `ref. ${d.reference}`, n.product_type_id);
		case "makes":
		case "product_types":
		case "service_types":
		case "users":
		case "tabled_items":
		case "tabled_properties":
		case "tabled_actions":
			return d.name;
		case "models":
			return join(d.name, n.make_id);
		case "tabled_action_values":
			return short(d.value);
		case "budgets":
			return join(`"${d.title || "Sem título"}"`, service);
		case "budget_products":
			return join(`${product} ×${d.quantity}`, `orçamento #${d.budget_id}`);
		case "services_user_time":
			return join(user, `${d.minutes} min em ${formatDate(d.ut_date)}`, service);
		case "services_user_time_punches":
			return join(user, `${formatDate(d.ut_date)} ${hhmm(d.hours_s, d.minutes_s)}–${hhmm(d.hours_f, d.minutes_f)}`, service);
		case "services_applied_products":
		case "services_products_requested":
			return join(`${product} ×${d.quantity}`, service);
		case "service_associations":
			return `Serviço #${d.service_id} (grupo ${d.cluster_nr})`;
		case "lab_items":
			return join(n.t_item_id, service);
		case "lab_action_values":
			return join(n.t_action_id, short(d.note, 40));
		case "lab_property_values":
			return join(n.property_id, d.value);
		case "schedule_lab_items":
			return join(n.t_item_id, `marcação #${d.schedule_id}`);
		case "schedule_lab_action_values":
			return n.t_action_id || `Ação #${d.t_action_id}`;
		default:
			return short(JSON.stringify(d), 80);
	}
}

// Field names → what the details window shows. Fields not listed keep
// their column name.
const FIELD_LABELS = {
	id: "Id", name: "Nome", title: "Título", reference: "Referência",
	plate: "Matrícula", phone: "Telemóvel", email: "Email", address: "Morada",
	zip_code: "Código postal", tax_nr: "NIF",
	service_id: "Serviço", client_id: "Cliente", car_id: "Viatura",
	product_id: "Produto", user_id: "Funcionário", schedule_id: "Marcação",
	budget_id: "Orçamento", make_id: "Marca", model_id: "Modelo",
	product_type_id: "Tipo de produto", service_type_id: "Tipo de serviço",
	user_type_id: "Tipo de utilizador",
	quantity: "Quantidade", minutes: "Minutos", ut_date: "Data", date: "Data",
	description: "Descrição", note: "Nota", value: "Valor",
	done: "Concluído", is_applied: "Aplicado", is_ordered: "Encomendado",
	is_delivered: "Entregue", is_finished: "Finalizado", office_check: "Validado",
	is_locked: "Bloqueado", is_primary: "Principal", is_done: "Feito", nullified: "Desativado",
	checkin_date: "Entrada", checkout_date: "Saída", checkout_predict: "Prev. Saída",
	kms: "Kms", malfunction_description: "Descrição de avaria",
	service_description: "Serviço realizado", r_name: "Nome (quem entrega)",
	r_phone: "Telemóvel (quem entrega)", signed_service: "Assinatura",
	hours_s: "Hora de início", minutes_s: "Minuto de início",
	hours_f: "Hora de fim", minutes_f: "Minuto de fim",
	created_at: "Criado em", start_date: "Início", start_time: "Hora de início",
	end_date: "Fim", end_time: "Hora de fim", color: "Cor",
	t_item_id: "Item", t_action_id: "Ação", property_id: "Propriedade",
	l_item_id: "Item de laboratório", cluster_nr: "Grupo",
	month: "Mês", year: "Ano", chassi_nr: "Nº de chassis", cc: "Cilindrada",
	engine_code: "Código do motor", color_code: "Código da cor", logo: "Logótipo",
	i_class: "Ícone", profile_pic: "Foto",
};

// Internal fields, not worth showing.
const HIDDEN_FIELDS = new Set(["search_name", "search_plate", "version"]);

const BOOLEAN_FIELDS = new Set([
	"done", "is_applied", "is_ordered", "is_delivered", "is_finished",
	"office_check", "is_locked", "is_primary", "is_done", "nullified",
]);

// Long texts get the full width of the details window.
const WIDE_FIELDS = new Set([
	"description", "note", "malfunction_description", "service_description",
	"address", "value", "signed_service",
]);

function fieldLabel(key) {
	return FIELD_LABELS[key] || key;
}

// A saved value as text, or null when empty.
function formatValue(key, value, names) {
	if (value === null || value === undefined || value === "") return null;
	if (BOOLEAN_FIELDS.has(key)) return Number(value) ? "Sim" : "Não";
	if (key === "created_at") return formatDateTime(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return formatDate(value);
	if (names?.[key]) return `${names[key]} (#${value})`;
	if (key.endsWith("_id") && key !== "id") return `#${value}`;
	return String(value);
}

function errorMessage(err, fallback) {
	return err?.response?.data?.error || (err?.response ? fallback : "Sem ligação ao servidor.");
}

export default function TrashList() {

	const [isAdmin, setIsAdminState] = useState(getIsAdmin);
	const [rows, setRows] = useState([]);
	const [tables, setTables] = useState([]);
	const [total, setTotal] = useState(0);
	const [pages, setPages] = useState(1);
	const [page, setPage] = useState(1);
	const [table, setTable] = useState("");
	const [status, setStatus] = useState("deleted");
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState([]); // deleted_rows ids
	const [expanded, setExpanded] = useState(null);
	const [loading, setLoading] = useState(true);
	const [restoring, setRestoring] = useState(false);

	useEffect(() => onAccountChanged(() => setIsAdminState(getIsAdmin())), []);

	// Escape closes the details window.
	useEffect(() => {
		if (expanded === null) return;
		const onKey = (e) => { if (e.key === "Escape") setExpanded(null); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [expanded]);

	// Search as you type, without a request per key.
	useEffect(() => {
		const timer = setTimeout(() => setQuery(search), 300);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => { setPage(1); }, [table, status, query]);

	useEffect(() => {
		if (!isAdmin) {
			setLoading(false);
			return;
		}
		load();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAdmin, table, status, query, page]);

	async function load() {
		setLoading(true);
		try {
			const res = await api.get("/trash", {
				params: { table: table || undefined, status, q: query || undefined, p: page, u: PER_PAGE },
			});
			setRows(res.data.trash_list || []);
			setTables(res.data.tables || []);
			setTotal(res.data.total || 0);
			setPages(res.data.pages || 1);
			setSelected([]);
		} catch (err) {
			pushErrorToast(errorMessage(err, "Não foi possível carregar o lixo."));
		} finally {
			setLoading(false);
		}
	}

	async function restore(ids, question) {
		if (restoring || ids.length === 0) return;
		if (!await confirmDialog(question, { confirmLabel: "Repor", danger: false })) return;

		setRestoring(true);
		try {
			const res = await api.post("/trash/restore", { ids });
			const count = res.data.restored?.length ?? ids.length;
			pushSuccessToast(count === 1 ? "Registo reposto." : `${count} registos repostos.`);
			setExpanded(null);
			await load();
		} catch (err) {
			pushErrorToast(errorMessage(err, "Não foi possível repor."));
		} finally {
			setRestoring(false);
		}
	}

	function toggle(id) {
		setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
	}

	const restorable = rows.filter((r) => !r.restored_at);
	const allSelected = restorable.length > 0 && restorable.every((r) => selected.includes(r.id));
	const expandedRow = rows.find((r) => r.id === expanded) ?? null;

	function toggleAll() {
		setSelected(allSelected ? [] : restorable.map((r) => r.id));
	}

	if (!isAdmin) {
		return (
			<div className="page trash-page">
				<div className="content">
					<div className="card">
						<div className="header">
							<i className="fa-solid fa-lock" />
							<h1>Lixo</h1>
						</div>
						<div className="body">
							<p className="trash-hint">Só a conta de administrador tem acesso a esta página.</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="page trash-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-trash-can-arrow-up" />
						<h1>Lixo</h1>
					</div>

					<div className="body">

						<p className="trash-hint">
							<i className="fa-solid fa-circle-info" /> Tudo o que é apagado fica aqui durante 90 dias e
							pode ser reposto como estava. Para repor algo que pertence a outra coisa também apagada
							(ex.: os produtos de um orçamento), selecione os dois e reponha-os juntos.
						</p>

						<div className="trash-filters">
							<select value={table} onChange={(e) => setTable(e.target.value)} aria-label="Tipo">
								<option value="">Tudo</option>
								{tables.map((t) => (
									<option key={t.table_name} value={t.table_name}>
										{tableLabel(t.table_name)} ({t.count})
									</option>
								))}
							</select>

							<select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
								<option value="deleted">Por repor</option>
								<option value="restored">Já repostos</option>
								<option value="all">Todos</option>
							</select>

							<input
								type="search"
								placeholder="Pesquisar…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>

							<button
								className="confirm trash-restore-selected"
								disabled={selected.length === 0 || restoring}
								onClick={() => restore(selected, selected.length === 1
									? "Repor o registo selecionado?"
									: `Repor os ${selected.length} registos selecionados?`)}
							>
								<i className="fa-solid fa-rotate-left" />
								Repor selecionados{selected.length > 0 ? ` (${selected.length})` : ""}
							</button>
						</div>

						{rows.length === 0 && loading ? (
							<div className="trash-empty-state is-loading">
								<i className="fa-solid fa-spinner fa-spin" />
								<p>A carregar…</p>
							</div>
						) : rows.length === 0 ? (
							<div className="trash-empty-state">
								<i className={`fa-solid ${status === "deleted" && !table && !query ? "fa-trash-can" : "fa-magnifying-glass"}`} />
								<h2>{status === "deleted" && !table && !query ? "O lixo está vazio" : "Nada encontrado"}</h2>
								<p>
									{status === "deleted" && !table && !query
										? "Quando alguma coisa for apagada, aparece aqui durante 90 dias."
										: "Experimente outro tipo, estado ou pesquisa."}
								</p>
							</div>
						) : (
						<table>
							<thead>
								<tr>
									<th>
										<input
											type="checkbox"
											checked={allSelected}
											disabled={restorable.length === 0}
											onChange={toggleAll}
											aria-label="Selecionar todos"
										/>
									</th>
									<th>Tipo</th>
									<th>O quê</th>
									<th>Apagado</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{rows.map((row) => (
									<tr key={row.id} className={row.restored_at ? "is-restored" : ""}>
										<td data-label="">
											<input
												type="checkbox"
												checked={selected.includes(row.id)}
												disabled={Boolean(row.restored_at)}
												onChange={() => toggle(row.id)}
												aria-label="Selecionar"
											/>
										</td>
										<td data-label="Tipo">
											<span className="trash-type" title={tableLabel(row.table_name)}>{tableLabel(row.table_name)}</span>
										</td>
										<td data-label="O quê">
											<span className="cell-truncate" title={describe(row)}>{describe(row)}</span>
										</td>
										<td data-label="Apagado" className="trash-when">
											<span>{formatDateTime(row.deleted_at)}</span>
											{row.restored_at && <span className="trash-restored">Reposto</span>}
										</td>
										<td className="actions">
											<button
												className="options"
												title="Ver detalhes"
												aria-label="Ver detalhes"
												onClick={() => setExpanded(row.id)}
											>
												<i className="fa-solid fa-eye" />
											</button>
											{!row.restored_at && (
												<button
													className="confirm"
													title="Repor"
													aria-label="Repor"
													disabled={restoring}
													onClick={() => restore([row.id], `Repor ${tableLabel(row.table_name).toLowerCase()}: ${describe(row)}?`)}
												>
													<i className="fa-solid fa-rotate-left" />
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						)}

						{pages > 1 && (
							<div className="trash-pages">
								<button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Página anterior">
									<i className="fa-solid fa-chevron-left" />
								</button>
								<span>Página {page} de {pages} · {total} registos</span>
								<button disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Página seguinte">
									<i className="fa-solid fa-chevron-right" />
								</button>
							</div>
						)}

					</div>
				</div>

			</div>

			{expandedRow && (
				<div className="trash-modal-backdrop" onClick={() => setExpanded(null)}>
					<div
						className="trash-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="trash-modal-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="trash-modal-header">
							<div>
								<span className="trash-type">{tableLabel(expandedRow.table_name)}</span>
								<h2 id="trash-modal-title">{describe(expandedRow)}</h2>
							</div>
							<button className="cancel" title="Fechar" aria-label="Fechar" onClick={() => setExpanded(null)}>
								<i className="fa-solid fa-x" />
							</button>
						</div>

						<p className="trash-modal-meta">
							<i className="fa-solid fa-trash-can" /> Apagado a {formatDateTime(expandedRow.deleted_at)}
							{expandedRow.restored_at && (
								<span className="trash-restored">
									<i className="fa-solid fa-rotate-left" /> Reposto a {formatDateTime(expandedRow.restored_at)}
								</span>
							)}
						</p>

						<dl className="trash-fields">
							{Object.entries(expandedRow.data || {})
								.filter(([key]) => !HIDDEN_FIELDS.has(key))
								.map(([key, value]) => {
									const text = formatValue(key, value, expandedRow.names);
									return (
										<div key={key} className={`trash-field ${WIDE_FIELDS.has(key) ? "is-wide" : ""}`}>
											<dt>{fieldLabel(key)}</dt>
											<dd className={text === null ? "is-empty" : ""}>{text ?? "—"}</dd>
										</div>
									);
								})}
						</dl>

						<div className="trash-modal-actions">
							<button onClick={() => setExpanded(null)}>Fechar</button>
							{!expandedRow.restored_at && (
								<button
									className="confirm"
									disabled={restoring}
									onClick={() => restore([expandedRow.id], `Repor ${tableLabel(expandedRow.table_name).toLowerCase()}: ${describe(expandedRow)}?`)}
								>
									<i className="fa-solid fa-rotate-left" /> Repor
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
