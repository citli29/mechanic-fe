// Shared cliente pieces, used by the Clientes list (ClientsList) and the
// cliente page (ClientShow) — same idea as Cars/CarCard.jsx:
//   <ClientCard>    avatar + name + contacts + services / cars summary
//   <ClientDetails> every field, read-only (same layout as the form)
//   <ClientForm>    create / edit
// Styling comes from Cars/Style/CarCard.css (car-card, car-form-*...)
// plus Style/ClientCard.css.
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { formatDay } from "../Cars/CarCard";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

import "../Cars/Style/CarCard.css";
import "./Style/ClientCard.css";

// Short fields (Telemóvel, NIF, Código postal) pair up on narrow
// layouts; long ones (Nome, Email, Morada) take a whole row there — see
// .cf-wide in ClientCard.css — so a long address never stretches a
// neighbour.
export const CLIENT_FIELDS = [
	["name", "Nome *"],
	["phone", "Telemóvel *"],
	["tax_nr", "NIF"],
	["email", "Email"],
	["address", "Morada"],
	["zip_code", "Código postal"],
];

const WIDE_FIELDS = new Set(["name", "email", "address"]);
const fieldClass = (key) => `car-form-field cf-${key} ${WIDE_FIELDS.has(key) ? "cf-wide" : ""}`;

function isBlank(value) {
	return value === null || value === undefined || value === "";
}

// "Benjamim Vieira" → "BV".
export function initials(name) {
	const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}


/* ============================= ClientCard ============================= */

// history: { count, carCount, lastDate, lastCarPlate } or null (loading).
// to: whole card links there. actions: buttons on the right. children:
// under the main row (e.g. <ClientDetails>).
export function ClientCard({ client, history, to, actions, className = "", children }) {
	return (
		<div className={`car-card client-card ${className}`}>
			{to && <Link className="car-card-link" to={to} aria-label={`Abrir ${client.name}`} />}

			<div className="client-avatar" aria-hidden="true">{initials(client.name)}</div>

			<div className="car-main">
				<div className="car-title">
					<span className="car-make">{client.name}</span>
				</div>

				<div className="car-specs">
					{client.phone && (
						<a className="car-spec client-contact" href={`tel:${client.phone}`} title="Ligar">
							<i className="fa-solid fa-phone" /> {client.phone}
						</a>
					)}
					{client.email && (
						<a className="car-spec client-contact" href={`mailto:${client.email}`} title="Enviar email">
							<i className="fa-solid fa-envelope" /> {client.email}
						</a>
					)}
					{client.tax_nr && (
						<span className="car-spec" title="NIF">
							<i className="fa-solid fa-id-card" /> {client.tax_nr}
						</span>
					)}
					{!client.phone && !client.email && !client.tax_nr && (
						<span className="car-spec is-empty">Sem contactos</span>
					)}
				</div>
			</div>

			<div className="car-history">
				{history ? (
					<>
						<span className="car-history-count">
							<b>{history.count ?? 0}</b> {Number(history.count) === 1 ? "serviço" : "serviços"}
							{" · "}
							<b>{history.carCount ?? 0}</b> {Number(history.carCount) === 1 ? "viatura" : "viaturas"}
						</span>
						<span className="car-history-last">
							{history.lastDate
								? <>Último: {formatDay(history.lastDate)}{history.lastCarPlate && <> · {history.lastCarPlate}</>}</>
								: "Sem serviços"}
						</span>
					</>
				) : (
					<span className="car-history-last">A carregar...</span>
				)}
			</div>

			{actions && <div className="car-actions">{actions}</div>}

			{children}
		</div>
	);
}


/* ============================ ClientDetails ============================ */

export function ClientDetails({ client, actions }) {
	return (
		<div className="car-details">
			<div className="car-form-grid">
				{CLIENT_FIELDS.map(([key, label]) => (
					<div key={key} className={fieldClass(key)}>
						<span>{label.replace(" *", "")}</span>
						<div className={`car-details-value ${isBlank(client[key]) ? "is-empty" : ""}`}>
							{isBlank(client[key]) ? "—" : client[key]}
						</div>
					</div>
				))}
			</div>

			{actions && <div className="car-form-actions">{actions}</div>}
		</div>
	);
}


/* ============================= ClientForm ============================= */

// client: the one to edit (has an id) or null to create. onSaved(client)
// after a successful save; onCancel closes the form.
export function ClientForm({ client, title, onSaved, onCancel, className = "" }) {
	const isNew = !client?.id;

	const [values, setValues] = useState(() => {
		const start = {};
		CLIENT_FIELDS.forEach(([key]) => { start[key] = client && !isBlank(client[key]) ? String(client[key]) : ""; });
		return start;
	});
	const [saving, setSaving] = useState(false);


	async function save() {
		if (!values.name.trim()) {
			pushErrorToast("O nome do cliente é obrigatório.");
			return;
		}
		if (!values.phone.trim()) {
			pushErrorToast("O telemóvel é obrigatório.");
			return;
		}

		const data = Object.fromEntries(
			Object.entries(values).filter(([_, value]) => value !== "")
		);

		setSaving(true);
		try {
			const res = isNew
				? await api.post("/clients", data)
				: await api.put(`/clients/${client.id}`, data);

			pushSuccessToast(isNew ? "Cliente criado com sucesso." : "Cliente atualizado com sucesso.");
			onSaved?.(res.data.client);
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	}


	return (
		<div className={`car-card car-form client-card ${className}`}>
			<div className="car-form-title">
				<i className={`fa-solid ${isNew ? "fa-plus" : "fa-pen"}`} /> {title}
			</div>

			<div className="car-form-grid">
				{CLIENT_FIELDS.map(([key, label]) => (
					<label key={key} className={fieldClass(key)}>
						<span>{label}</span>
						<input
							name={key}
							value={values[key]}
							autoFocus={key === "name"}
							inputMode={key === "phone" || key === "tax_nr" ? "tel" : key === "email" ? "email" : undefined}
							onChange={(e) => setValues({ ...values, [key]: e.target.value })}
							onKeyDown={(e) => { if (e.key === "Enter") save(); }}
						/>
					</label>
				))}
			</div>

			<div className="car-form-actions">
				<button className="options" onClick={onCancel} disabled={saving}>
					<i className="fa-solid fa-xmark" /> Cancelar
				</button>
				<button className="confirm" onClick={save} disabled={saving}>
					<i className="fa-solid fa-check" /> Guardar
				</button>
			</div>
		</div>
	);
}
