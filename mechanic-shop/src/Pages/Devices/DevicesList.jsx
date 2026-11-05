import { useEffect, useState } from "react";
import api from "../../api/axios";
import { clearAuthToken } from "../../api/auth";
import { getIsAdmin, onAccountChanged } from "../../api/account";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/DevicesList.css";
import { confirmDialog } from "../../utils/confirmDialog";

const NAME_MAX = 60;

// Admin only (the API refuses everyone else): every PC/tablet/phone logged
// in with any shop account, with the account it uses. Removing one logs it
// out at its next request; removing this one is the same as "Terminar sessão".
// A lost or stolen device can be cut off here without changing the password.

// Dates come from SQLite's CURRENT_TIMESTAMP (UTC, "YYYY-MM-DD HH:MM:SS").
function formatDateTime(value) {
	if (!value) return "-";

	const date = new Date(String(value).replace(" ", "T") + "Z");
	if (isNaN(date)) return value;

	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The server only refreshes last_used_at once an hour, so anything inside
// that hour is "Agora".
function lastUsedLabel(value) {
	const date = new Date(String(value).replace(" ", "T") + "Z");
	if (isNaN(date)) return formatDateTime(value);

	const hours = (Date.now() - date.getTime()) / 3600000;
	if (hours < 1.05) return "Agora";
	if (hours < 24) return `Há ${Math.floor(hours)} h`;

	const days = Math.floor(hours / 24);
	if (days < 30) return days === 1 ? "Há 1 dia" : `Há ${days} dias`;

	return formatDateTime(value);
}

// "Chrome · Windows", "Safari · iPhone", ... from the browser's user agent.
function describeUserAgent(ua) {
	if (!ua) return { label: "Dispositivo desconhecido", icon: "fa-question" };

	let os = "";
	let icon = "fa-desktop";

	if (/iPad/.test(ua)) { os = "iPad"; icon = "fa-tablet-screen-button"; }
	else if (/iPhone/.test(ua)) { os = "iPhone"; icon = "fa-mobile-screen-button"; }
	else if (/Android/.test(ua)) {
		const mobile = /Mobile/.test(ua);
		os = mobile ? "Telemóvel Android" : "Tablet Android";
		icon = mobile ? "fa-mobile-screen-button" : "fa-tablet-screen-button";
	}
	else if (/Windows/.test(ua)) os = "Windows";
	else if (/Mac OS X|Macintosh/.test(ua)) os = "Mac";
	else if (/CrOS/.test(ua)) os = "Chromebook";
	else if (/Linux/.test(ua)) os = "Linux";

	let browser = "";
	if (/Edg\//.test(ua)) browser = "Edge";
	else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
	else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
	else if (/Firefox\/|FxiOS/.test(ua)) browser = "Firefox";
	else if (/Chrome\/|CriOS/.test(ua)) browser = "Chrome";
	else if (/Safari\//.test(ua)) browser = "Safari";

	const label = [browser, os].filter(Boolean).join(" · ") || "Navegador desconhecido";
	return { label, icon };
}

export default function DevicesList() {

	const [devices, setDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(null); // { id, name }
	const [isAdmin, setIsAdminState] = useState(getIsAdmin);

	useEffect(() => onAccountChanged(() => setIsAdminState(getIsAdmin())), []);

	useEffect(() => {
		if (isAdmin) loadDevices();
		else setLoading(false);
	}, [isAdmin]);

	async function loadDevices() {
		try {
			const res = await api.get("/auth/devices");
			setDevices(res.data.devices || []);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	async function saveName() {
		const name = editing.name.trim();
		if (name.length > NAME_MAX) {
			pushErrorToast(`O nome pode ter no máximo ${NAME_MAX} caracteres.`);
			return;
		}

		try {
			await api.patch(`/auth/devices/${editing.id}`, { name: name || null });
			pushSuccessToast("Nome do dispositivo guardado.");
			setEditing(null);
			loadDevices();
		} catch (err) {
			console.error(err);
		}
	}

	async function removeDevice(device) {
		const message = device.is_current
			? "Este é o dispositivo que está a usar. Terminar sessão aqui?"
			: "Terminar a sessão deste dispositivo? Vai ter de iniciar sessão outra vez nele.";
		if (!await confirmDialog(message, { confirmLabel: "Terminar sessão" })) return;

		try {
			const res = await api.delete(`/auth/devices/${device.id}`);
			if (res.data.was_current) {
				clearAuthToken();
				return;
			}
			pushSuccessToast("Sessão do dispositivo terminada.");
			loadDevices();
		} catch (err) {
			console.error(err);
		}
	}

	function renderDevice(device) {
		const { label, icon } = describeUserAgent(device.user_agent);

		return (
			<span className="device-name">
				<i className={`fa-solid ${icon} device-icon`} />
				<span className="device-text">
					<span className="cell-truncate" title={device.name || label}>
						{device.name || label}
					</span>
					{device.name && <span className="device-ua cell-truncate" title={device.user_agent || ""}>{label}</span>}
				</span>
				{device.is_current && <span className="device-current">Este dispositivo</span>}
			</span>
		);
	}

	if (!isAdmin) {
		return (
			<div className="page devices-page">
				<div className="content">
					<div className="card">
						<div className="header">
							<i className="fa-solid fa-lock" />
							<h1>Dispositivos</h1>
						</div>
						<div className="body">
							<p className="devices-hint">Só a conta de administrador tem acesso a esta página.</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="page devices-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-laptop" />
						<h1>Dispositivos com sessão iniciada</h1>
					</div>

					<div className="body">

						<p className="devices-hint">
							<i className="fa-solid fa-circle-info" /> Se um dispositivo se perder ou já não for
							usado, termine a sessão dele aqui. Dê um nome a cada um (ex.: <b>Balcão</b>,{" "}
							<b>Tablet oficina</b>) para os distinguir.
						</p>

						<table>
							<thead>
								<tr>
									<th>Dispositivo</th>
									<th>Conta</th>
									<th>IP</th>
									<th>Sessão iniciada</th>
									<th>Último uso</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{!loading && devices.length === 0 && (
									<tr><td data-label="">Nenhum dispositivo.</td></tr>
								)}

								{devices.map((device) => (
									editing?.id === device.id ? (
										<tr key={device.id} className="editing">
											<td data-label="Nome">
												<input
													value={editing.name}
													maxLength={NAME_MAX}
													placeholder={describeUserAgent(device.user_agent).label}
													autoFocus
													onChange={(e) => setEditing({ ...editing, name: e.target.value })}
													onKeyDown={(e) => {
														if (e.key === "Enter") saveName();
														if (e.key === "Escape") setEditing(null);
													}}
												/>
											</td>
											<td data-label="Conta">{device.username}</td>
											<td data-label="IP">{device.ip || "-"}</td>
											<td data-label="Sessão iniciada">{formatDateTime(device.created_at)}</td>
											<td data-label="Último uso">{lastUsedLabel(device.last_used_at)}</td>
											<td className="actions">
												<button className="confirm" title="Guardar" aria-label="Guardar" onClick={saveName}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" title="Cancelar" aria-label="Cancelar" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={device.id} className={device.is_current ? "is-current" : ""}>
											<td data-label="Dispositivo">{renderDevice(device)}</td>
											<td data-label="Conta">{device.username}</td>
											<td data-label="IP">{device.ip || "-"}</td>
											<td data-label="Sessão iniciada">{formatDateTime(device.created_at)}</td>
											<td data-label="Último uso">{lastUsedLabel(device.last_used_at)}</td>
											<td className="actions">
												<button
													className="options"
													title="Mudar nome"
													aria-label="Mudar nome"
													onClick={() => setEditing({ id: device.id, name: device.name || "" })}
												>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													title="Terminar sessão deste dispositivo"
													aria-label="Terminar sessão deste dispositivo"
													onClick={() => removeDevice(device)}
												>
													<i className="fa-solid fa-right-from-bracket" />
												</button>
											</td>
										</tr>
									)
								))}
							</tbody>
						</table>

					</div>
				</div>

			</div>
		</div>
	);
}
