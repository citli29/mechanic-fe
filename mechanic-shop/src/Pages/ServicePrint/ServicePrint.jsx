import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { buildLabSummary } from "../../utils/labSummary";
import { SHOP, TERMS, AUTHORIZATION_TEXTS } from "./printConfig";
import "./Style/ServicePrint.css";

// /services/:id/imprimir?doc=folha|resumo[&auto=1]
//
// A page of its own, made only for paper (A4), outside the app's layout
// (no navbar): the service page's "Imprimir" / "Imprimir Resumo" open it in
// a new tab. It reads everything fresh from the API, so it always prints
// what's saved. It prints when the toolbar's Imprimir is clicked (auto=1
// would open the dialog by itself; the service page doesn't use it, so the
// signing text can be edited first).
//   folha  = Termo de Responsabilidade: what the client signs at drop-off.
//   resumo = Resumo de Serviço: what was done, products, times.
// Shop details and terms: printConfig.js.

const DOCS = {
	folha: "Termo de Responsabilidade",
	resumo: "Resumo de Serviço",
};

const NOTE_SEPARATOR = "\u001E";

// Notas are stored as "<markers>␞<text>" (coloured highlights); only the text prints.
function plainNote(raw) {
	if (typeof raw !== "string") return "";
	const i = raw.indexOf(NOTE_SEPARATOR);
	return (i >= 0 ? raw.slice(i + 1) : raw).trim();
}

// "2026-11-06" → "06/11/2026"
function formatDate(value) {
	if (!value) return "";
	const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
	return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

function formatMinutes(minutes) {
	const m = Math.round(minutes ?? 0);
	const h = Math.floor(m / 60);
	const rest = m % 60;
	return h > 0 ? `${h}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}

function formatKms(kms) {
	if (kms == null || kms === "") return "";
	const n = Number(kms);
	return Number.isFinite(n) ? `${n.toLocaleString("pt-PT")} km` : String(kms);
}

function statusLabel(service) {
	if (service.checkout) return "Entregue";
	if (Number(service.office_check)) return "Validado";
	if (Number(service.is_finished)) return "Terminado";
	return "Por terminar";
}

function joinNonEmpty(values, sep = " ") {
	return values.map((v) => (v == null ? "" : String(v).trim())).filter(Boolean).join(sep);
}

// One label/value row; empty values print as a line to fill in by hand.
function Field({ label, value, wide }) {
	const text = value == null ? "" : String(value).trim();
	return (
		<div className={`sp-field ${wide ? "is-wide" : ""}`}>
			<span className="sp-label">{label}</span>
			<span className={`sp-value ${text ? "" : "is-blank"}`}>{text || " "}</span>
		</div>
	);
}

function Section({ title, children, className = "" }) {
	return (
		<section className={`sp-section ${className}`}>
			<h2>{title}</h2>
			{children}
		</section>
	);
}

// Ruled box to write on (Folha): the text sits on the lines, followed by
// at least 2 empty lines, and the box is at least `lines` lines tall.
// The lines are real elements (borders), not a background image: browsers
// leave backgrounds out when printing / saving as PDF.
const ROW_MM = 7;
const ROW_PX = (ROW_MM * 96) / 25.4;   // CSS px, same on screen and paper

function TextBox({ text, lines = 5 }) {
	const value = (text ?? "").trim();
	const textRef = useRef(null);
	const [textRows, setTextRows] = useState(0);

	// How many lines the text takes once wrapped; again if it changes size.
	useLayoutEffect(() => {
		const el = textRef.current;
		if (!el) return;
		const measure = () => setTextRows(value ? Math.max(1, Math.round(el.getBoundingClientRect().height / ROW_PX)) : 0);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [value]);

	const rows = Math.max(lines, textRows + 2);
	return (
		<div className="sp-ruled" style={{ height: `${rows * ROW_MM}mm` }}>
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="sp-ruled-line" style={{ top: `${(i + 1) * ROW_MM}mm` }} />
			))}
			<div ref={textRef} className="sp-ruled-text">{value}</div>
		</div>
	);
}

// Resumo: each action with a checkbox (✓ = done) and its note.
// Folha (checks / notes false): the actions as dots, no notes.
function LabList({ items, showNotes = true, showChecks = true }) {
	return (
		<ul className="sp-lab">
			{items.map((item) => (
				<li key={item.id}>
					<div className="sp-lab-item">
						<strong>{item.count > 1 && `${item.count}× `}{item.name}</strong>
						{item.properties.length > 0 && (
							<span className="sp-lab-props">{item.properties.map((p) => `${p.name}: ${p.value}`).join(" · ")}</span>
						)}
					</div>
					{item.actions.length > 0 && (
						<ul className={showChecks ? "has-checks" : "has-dots"}>
							{item.actions.map((action, index) => (
								<li key={index}>
									{showChecks && <span className={`sp-check ${action.isDone ? "is-done" : ""}`}>{action.isDone ? "✓" : ""}</span>}
									{action.name}
									{showNotes && action.note && <span className="sp-lab-note"> — {action.note}</span>}
								</li>
							))}
						</ul>
					)}
				</li>
			))}
		</ul>
	);
}

function ShopHeader({ docTitle, service }) {
	const contacts = [SHOP.phone && `Tel. ${SHOP.phone}`, SHOP.email, SHOP.website].filter(Boolean);
	return (
		<header className="sp-header">
			{/* The logo already says "Oficina Lima", so it replaces the name. */}
			<div className="sp-shop">
				<img className="sp-logo" src={SHOP.logo} alt={SHOP.name} />
				<div className="sp-shop-info">
					{SHOP.subtitle && <div className="sp-shop-sub">{SHOP.subtitle}</div>}
					{SHOP.address && <div className="sp-shop-line">{SHOP.address}</div>}
					{contacts.length > 0 && <div className="sp-shop-line">{contacts.join(" · ")}</div>}
					{SHOP.taxNr && <div className="sp-shop-line">NIF {SHOP.taxNr}</div>}
				</div>
			</div>
			<div className="sp-doc">
				<div className="sp-doc-title">{docTitle}</div>
				<div className="sp-doc-number">Nº {service.id}</div>
				<div className="sp-doc-line">Entrada: {formatDate(service.checkin) || "—"}</div>
				{service.service_type_name && <div className="sp-doc-line">{service.service_type_name}</div>}
			</div>
		</header>
	);
}

function ClientCarBlock({ service }) {
	const carName = joinNonEmpty([service.car_make_name, service.car_model_name]);
	const carDate = joinNonEmpty([service.car_month && String(service.car_month).padStart(2, "0"), service.car_year], "/");
	const address = joinNonEmpty([service.client_address, service.client_zip_code], ", ");
	return (
		<div className="sp-two">
			<Section title="Cliente">
				<Field label="Nome" value={service.client_name} wide />
				<Field label="Telemóvel" value={service.client_phone} />
				<Field label="NIF" value={service.client_tax_nr} />
				<Field label="Email" value={service.client_email} wide />
				<Field label="Morada" value={address} wide />
			</Section>
			<Section title="Viatura">
				{service.car_id ? (
					<>
						<div className="sp-plate">{service.car_plate || "—"}</div>
						<Field label="Marca / Modelo" value={carName} wide />
						<Field label="Data" value={carDate} />
						<Field label="Cilindrada" value={service.car_cc ? `${service.car_cc} cc` : ""} />
						<Field label="Nº Chassi" value={service.car_chassi_nr} wide />
						<Field label="Motor" value={service.car_engine_code} />
						<Field label="Cor" value={service.car_color_code} />
					</>
				) : (
					<div className="sp-no-car">Sem viatura associada.</div>
				)}
			</Section>
		</div>
	);
}

function Footer({ docTitle, service }) {
	const printedAt = new Date().toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
	return (
		<footer className="sp-footer">
			<span>{SHOP.name} · {docTitle} Nº {service.id}</span>
			<span>Impresso em {printedAt}</span>
		</footer>
	);
}

const BLANK = "____________________________";

// "\n" = new paragraph, *text* = bold (see printConfig.js).
function RichText({ text }) {
	return text.split("\n").map((line, i) => (
		<p key={i} className="sp-authorization">
			{line.split(/(\*[^*]+\*)/).map((part, j) =>
				/^\*[^*]+\*$/.test(part) ? <strong key={j}>{part.slice(1, -1)}</strong> : part
			)}
		</p>
	));
}

// Predefined text number `index` with the service's values filled in.
function authorizationText(service, index) {
	return (AUTHORIZATION_TEXTS[index]?.text ?? "")
		.replaceAll("{name}", (service.r_name ?? "").trim() || BLANK)
		.replaceAll("{phone}", (service.r_phone ?? "").trim() || BLANK)
		.replaceAll("{client}", (service.client_name ?? "").trim() || BLANK);
}

// The signing sentence. Screen only (none of the controls print): a toggle
// between the predefined texts, "Editar" to change the selected one for
// this print (not saved), "Repor" to go back to the predefined text. Each
// text keeps its own edit while switching. Printed as plain text.
function AuthorizationText({ service }) {
	const [selected, setSelected] = useState(0);
	const [edits, setEdits] = useState({});          // index → edited text
	const [isEditing, setIsEditing] = useState(false);

	const predefined = authorizationText(service, selected);
	const title = AUTHORIZATION_TEXTS[selected]?.title;
	const value = edits[selected] ?? predefined;
	const isChanged = edits[selected] != null && edits[selected] !== predefined;

	const reset = () => {
		setEdits((prev) => { const next = { ...prev }; delete next[selected]; return next; });
		setIsEditing(false);
	};

	return (
		<div className="sp-authorization-wrap">
			<div className="sp-authorization-tools">
				{AUTHORIZATION_TEXTS.length > 1 && (
					<div className="sp-authorization-toggle" role="radiogroup" aria-label="Texto da declaração">
						{AUTHORIZATION_TEXTS.map((t, index) => (
							<button
								key={index}
								type="button"
								role="radio"
								aria-checked={index === selected}
								className={index === selected ? "active" : ""}
								onClick={() => { setSelected(index); setIsEditing(false); }}
							>
								{t.label}
								{edits[index] != null && edits[index] !== authorizationText(service, index) && <span className="sp-edited-dot" title="Alterado" />}
							</button>
						))}
					</div>
				)}
				<button type="button" className={isEditing ? "is-on" : ""} onClick={() => setIsEditing((v) => !v)}>
					<i className={`fa-solid ${isEditing ? "fa-check" : "fa-pen"}`} /> {isEditing ? "Concluir" : "Editar"}
				</button>
				{isChanged && (
					<button type="button" onClick={reset} title="Voltar ao texto predefinido">
						<i className="fa-solid fa-rotate-left" /> Repor
					</button>
				)}
				<span className="sp-authorization-note">Não fica guardado: só para esta impressão.</span>
			</div>
			{title && <h3 className="sp-authorization-title">{title}</h3>}
			{isEditing ? (
				<textarea
					className="sp-authorization-edit"
					value={value}
					rows={2}
					autoFocus
					// Cursor at the end, so typing adds to the text instead of in front.
					onFocus={(e) => { const end = e.target.value.length; e.target.setSelectionRange(end, end); }}
					ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
					onChange={(e) => setEdits((prev) => ({ ...prev, [selected]: e.target.value }))}
					onKeyDown={(e) => { if (e.key === "Escape") setIsEditing(false); }}
					aria-label="Texto da declaração"
				/>
			) : (
				<div className="sp-authorization-text"><RichText text={value} /></div>
			)}
		</div>
	);
}

function FolhaDeServico({ service, labSummary }) {
	return (
		<>
			<ClientCarBlock service={service} />

			<Section title="Receção da viatura">
				<div className="sp-grid-4">
					<Field label="Entrada" value={formatDate(service.checkin)} />
					<Field label="Previsão de saída" value={formatDate(service.checkout_predict)} />
					<Field label="Quilómetros" value={formatKms(service.kms)} />
					<Field label="Tipo de serviço" value={service.service_type_name} />
				</div>
				<div className="sp-grid-2">
					<Field label="Entregue por" value={service.r_name} />
					<Field label="Contacto" value={service.r_phone} />
				</div>
			</Section>

			{/* Same as on the Resumo, without the notes. */}
			{labSummary.length > 0 && (
				<Section title="Laboratório">
					<LabList items={labSummary} showNotes={false} showChecks={false} />
				</Section>
			)}

			<Section title="Descrição da avaria">
				<TextBox text={service.malfunction} />
			</Section>

			<Section title="Serviço a realizar">
				<TextBox text={service.signed_service} />
			</Section>

			{TERMS.length > 0 && (
				<Section title="Condições" className="sp-terms">
					{TERMS.map((t, i) => <p key={i}>{t}</p>)}
				</Section>
			)}

			<section className="sp-sign">
				<AuthorizationText key={service.id} service={service} />
				<div className="sp-sign-row">
					<div className="sp-sign-box">
						<div className="sp-sign-line" />
						<span>Assinatura do cliente</span>
					</div>
					<div className="sp-sign-box">
						<div className="sp-sign-line" />
						<span>Pela oficina</span>
					</div>
					<div className="sp-sign-box is-date">
						<div className="sp-sign-line" />
						<span>Data</span>
					</div>
				</div>
			</section>
		</>
	);
}

function ResumoDoServico({ service, labSummary, products, times }) {
	const total = times.reduce((sum, t) => sum + t.minutes, 0);
	const note = plainNote(service.note);
	return (
		<>
			<ClientCarBlock service={service} />

			<Section title="Serviço">
				<div className="sp-grid-4">
					<Field label="Entrada" value={formatDate(service.checkin)} />
					<Field label="Saída" value={formatDate(service.checkout)} />
					<Field label="Quilómetros" value={formatKms(service.kms)} />
					<Field label="Estado" value={statusLabel(service)} />
				</div>
			</Section>

			{labSummary.length > 0 && (
				<Section title="Laboratório">
					<LabList items={labSummary} />
				</Section>
			)}

			<Section title="Descrição da avaria">
				{(service.malfunction ?? "").trim()
					? <div className="sp-text">{service.malfunction.trim()}</div>
					: <div className="sp-muted">—</div>}
			</Section>

			<Section title="Serviço realizado">
				{(service.service ?? "").trim()
					? <div className="sp-text">{service.service.trim()}</div>
					: <div className="sp-muted">—</div>}
			</Section>

			{note && (
				<Section title="Notas / Observações">
					<div className="sp-text">{note}</div>
				</Section>
			)}

			<Section title="Produtos aplicados">
				{products.length === 0 ? (
					<div className="sp-muted">Sem produtos aplicados.</div>
				) : (
					<table className="sp-table">
						<thead>
							<tr>
								<th>Produto</th>
								<th>Referência</th>
								<th>Tipo</th>
								<th className="is-num">Qt.</th>
								<th className="is-center">Aplicado</th>
							</tr>
						</thead>
						<tbody>
							{products.map((p) => (
								<tr key={p.id}>
									<td>{p.product_name || "—"}</td>
									<td>{p.product_reference || "—"}</td>
									<td>{p.product_type_name || "—"}</td>
									<td className="is-num">{Number(p.quantity).toLocaleString("pt-PT")}</td>
									<td className="is-center">{String(p.is_applied) === "1" ? "✓" : ""}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</Section>

			<Section title="Mão de obra">
				{times.length === 0 ? (
					<div className="sp-muted">Sem tempos registados.</div>
				) : (
					<table className="sp-table sp-table-times">
						<thead>
							<tr>
								<th>Funcionário</th>
								<th className="is-num">Tempo</th>
							</tr>
						</thead>
						<tbody>
							{times.map((t) => (
								<tr key={t.user_id}>
									<td>{t.user_name || "—"}</td>
									<td className="is-num">{formatMinutes(t.minutes)}</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td>Total</td>
								<td className="is-num">{formatMinutes(total)}</td>
							</tr>
						</tfoot>
					</table>
				)}
			</Section>
		</>
	);
}

export default function ServicePrint() {
	const { id } = useParams();
	const [searchParams, setSearchParams] = useSearchParams();
	const doc = DOCS[searchParams.get("doc")] ? searchParams.get("doc") : "folha";
	const auto = searchParams.get("auto") === "1";

	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	// "Alto contraste (P&B)": everything black, for weak B&W printers.
	// On by default; turning it off is remembered in this browser.
	const [isContrast, setIsContrast] = useState(() => {
		try { return localStorage.getItem("oficina-lima-print-contrast") !== "0"; } catch { return true; }
	});
	const toggleContrast = () => setIsContrast((prev) => {
		const next = !prev;
		try { localStorage.setItem("oficina-lima-print-contrast", next ? "1" : "0"); } catch { /* not remembered */ }
		return next;
	});

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const base = `/services/${id}`;
				const [serviceRes, labItemsRes, labActionsRes, labPropsRes, productsRes, timesRes, punchesRes] = await Promise.all([
					api.get(base),
					api.get(`${base}/lab_items`),
					api.get(`${base}/lab_action_values`),
					api.get(`${base}/lab_property_values`),
					api.get(`${base}/applied_products`),
					api.get(`${base}/user_times`),
					api.get(`${base}/user_time_punches`),
				]);
				const service = serviceRes.data.service;

				const labItems = (labItemsRes.data.lab_item_list || []).slice().sort((a, b) => a.t_item_id - b.t_item_id || a.id - b.id);
				const propsByItem = {};
				(labPropsRes.data.slpv_list || []).forEach((lpv) => {
					(propsByItem[lpv.l_item_id] ||= []).push(lpv);
				});
				const labSummary = buildLabSummary(labItems, labActionsRes.data.slav_list || [], propsByItem);

				// Minutes per mechanic, time entries + punches together.
				const byUser = {};
				[...(timesRes.data.sut_list || []), ...(punchesRes.data.sutp_list || [])].forEach(({ user_id, user_name, minutes }) => {
					byUser[user_id] ||= { user_id, user_name, minutes: 0 };
					byUser[user_id].minutes += Number(minutes) || 0;
				});

				if (!cancelled) setData({
					service,
					labSummary,
					products: productsRes.data.sap_list || [],
					times: Object.values(byUser),
				});
			} catch (err) {
				console.error(err);
				if (!cancelled) setError(err?.response?.data?.error || "Não foi possível carregar o serviço.");
			}
		})();
		return () => { cancelled = true; };
	}, [id]);

	const docTitle = DOCS[doc];

	useEffect(() => {
		// Same pattern as the app's pages; also the file name when saved as PDF.
		document.title = data ? `${SHOP.name} - ${docTitle} #${data.service.id}` : SHOP.name;
	}, [data, docTitle]);

	// auto=1: open the print dialog once, after the page has painted.
	useEffect(() => {
		if (!data || !auto) return;
		const timer = setTimeout(() => {
			window.print();
			setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("auto"); return next; }, { replace: true });
		}, 300);
		return () => clearTimeout(timer);
	}, [data, auto]);

	const switchDoc = (key) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("doc", key); return next; }, { replace: true });

	return (
		<div className={`sp-screen ${isContrast ? "is-contrast" : ""}`}>
			{/* Screen only: never printed. */}
			<div className="sp-toolbar">
				<div className="sp-toolbar-tabs">
					{Object.entries(DOCS).map(([key, label]) => (
						<button key={key} type="button" className={key === doc ? "active" : ""} onClick={() => switchDoc(key)}>{label}</button>
					))}
				</div>
				<div className="sp-toolbar-actions">
					<button
						type="button"
						role="switch"
						aria-checked={isContrast}
						className={isContrast ? "active" : ""}
						title="Tudo a preto, para impressoras a preto e branco fracas"
						onClick={toggleContrast}
					>
						<i className="fa-solid fa-circle-half-stroke" /> Alto contraste (P&amp;B)
					</button>
					<button type="button" className="is-primary" disabled={!data} onClick={() => window.print()}>
						<i className="fa-solid fa-print" /> Imprimir
					</button>
					<button type="button" onClick={() => window.close()}>
						<i className="fa-solid fa-xmark" /> Fechar
					</button>
				</div>
			</div>

			<div className="sp-page">
				{error ? (
					<div className="sp-message is-error">{error}</div>
				) : !data ? (
					<div className="sp-message"><i className="fa-solid fa-spinner fa-spin" /> A carregar…</div>
				) : (
					<>
						<ShopHeader docTitle={docTitle} service={data.service} />
						<main className="sp-body">
							{doc === "folha"
								? <FolhaDeServico service={data.service} labSummary={data.labSummary} />
								: <ResumoDoServico {...data} />}
						</main>
						<Footer docTitle={docTitle} service={data.service} />
					</>
				)}
			</div>
		</div>
	);
}
