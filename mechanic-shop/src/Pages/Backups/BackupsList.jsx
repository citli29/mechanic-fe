import { useEffect, useState } from "react";
import api from "../../api/axios";
import { getIsAdmin, onAccountChanged } from "../../api/account";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/BackupsList.css";

// Cópias de Segurança (admin only — the API refuses everyone else).
// Shows the copies in BACKUP_PATH, makes one on demand and downloads one to
// this computer. There's deliberately no restore button: restoring
// overwrites everyone's data, so it's done on the server (utils/restore.php).

// The daily cron copy should never be older than this.
const STALE_HOURS = 26;

function formatDateTime(value) {
	const date = new Date(value);
	if (isNaN(date)) return value || "-";
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ageLabel(value) {
	const hours = (Date.now() - new Date(value).getTime()) / 3600000;
	if (isNaN(hours)) return "";
	if (hours < 1) return "há menos de 1 h";
	if (hours < 24) return `há ${Math.floor(hours)} h`;
	const days = Math.floor(hours / 24);
	return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function formatSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(err, fallback) {
	return err?.response?.data?.error || (err?.response ? fallback : "Sem ligação ao servidor.");
}

export default function BackupsList() {

	const [isAdmin, setIsAdminState] = useState(getIsAdmin);
	const [backups, setBackups] = useState([]);
	const [latestIntegrity, setLatestIntegrity] = useState(null);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [downloading, setDownloading] = useState(null); // name

	useEffect(() => onAccountChanged(() => setIsAdminState(getIsAdmin())), []);

	useEffect(() => {
		if (isAdmin) loadBackups();
		else setLoading(false);
	}, [isAdmin]);

	async function loadBackups() {
		try {
			const res = await api.get("/backups");
			setBackups(res.data.backups || []);
			setLatestIntegrity(res.data.latest_integrity ?? null);
		} catch (err) {
			pushErrorToast(errorMessage(err, "Não foi possível carregar as cópias."));
		} finally {
			setLoading(false);
		}
	}

	async function createBackup() {
		if (creating) return;
		setCreating(true);
		try {
			const res = await api.post("/backups");
			const backup = res.data.backup;
			if (backup?.integrity === "ok") pushSuccessToast("Cópia de segurança criada.");
			else pushErrorToast(`A cópia foi criada mas a verificação falhou: ${backup?.integrity}`);
			await loadBackups();
		} catch (err) {
			pushErrorToast(errorMessage(err, "Não foi possível criar a cópia."));
		} finally {
			setCreating(false);
		}
	}

	// Goes through axios (not a plain link) so the login token is sent.
	async function downloadBackup(name) {
		if (downloading) return;
		setDownloading(name);
		try {
			const res = await api.get(`/backups/${encodeURIComponent(name)}/download`, {
				responseType: "blob",
				timeout: 120000,
			});
			const url = URL.createObjectURL(res.data);
			const link = document.createElement("a");
			link.href = url;
			link.download = `oficina_lima_${name}`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		} catch (err) {
			// A blob error body has to be read before it can be shown.
			let message = "Não foi possível descarregar a cópia.";
			try {
				const text = await err?.response?.data?.text?.();
				message = JSON.parse(text).error || message;
			} catch { /* keep the generic message */ }
			pushErrorToast(err?.response ? message : "Sem ligação ao servidor.");
		} finally {
			setDownloading(null);
		}
	}

	if (!isAdmin) {
		return (
			<div className="page backups-page">
				<div className="content">
					<div className="card">
						<div className="header">
							<i className="fa-solid fa-lock" />
							<h1>Cópias de Segurança</h1>
						</div>
						<div className="body">
							<p className="backups-hint">Só a conta de administrador tem acesso a esta página.</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const latest = backups[0] ?? null;
	const latestAgeHours = latest ? (Date.now() - new Date(latest.modified_at).getTime()) / 3600000 : null;
	const isStale = latest !== null && latestAgeHours > STALE_HOURS;
	const isBroken = latest !== null && latestIntegrity !== null && latestIntegrity !== "ok";

	let statusClass = "is-ok";
	let statusIcon = "fa-circle-check";
	let statusText = latest
		? `Última cópia ${ageLabel(latest.modified_at)} (${formatDateTime(latest.modified_at)}) — Verificada e Validada.`
		: "";

	if (!loading && !latest) {
		statusClass = "is-bad";
		statusIcon = "fa-triangle-exclamation";
		statusText = "Ainda não há nenhuma cópia de segurança.";
	} else if (isBroken) {
		statusClass = "is-bad";
		statusIcon = "fa-triangle-exclamation";
		statusText = `A última cópia (${formatDateTime(latest.modified_at)}) falhou a verificação: ${latestIntegrity}. Faça uma cópia nova.`;
	} else if (isStale) {
		statusClass = "is-warn";
		statusIcon = "fa-clock";
		statusText = `A última cópia é de ${formatDateTime(latest.modified_at)} (${ageLabel(latest.modified_at)}). A cópia automática diária pode não estar a correr.`;
	}

	return (
		<div className="page backups-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-database" />
						<h1>Cópias de Segurança</h1>
					</div>

					<div className="body">

						{!loading && (
							<div className={`backups-status ${statusClass}`}>
								<i className={`fa-solid ${statusIcon}`} />
								<span>{statusText}</span>
							</div>
						)}

						<div className="backups-toolbar">
							<p className="backups-hint">
								<i className="fa-solid fa-circle-info" /> As cópias ficam no servidor. Descarregue
								uma de vez em quando para guardar fora da oficina. Para repor uma cópia, fale com
								quem gere o servidor.
							</p>
							<button className="confirm backups-create" disabled={creating} onClick={createBackup}>
								<i className={`fa-solid ${creating ? "fa-spinner fa-spin" : "fa-plus"}`} />
								{creating ? "A criar…" : "Fazer cópia agora"}
							</button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Cópia</th>
									<th>Data</th>
									<th>Tamanho</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{loading && (
									<tr><td data-label="">A carregar…</td></tr>
								)}

								{!loading && backups.length === 0 && (
									<tr><td data-label="">Nenhuma cópia.</td></tr>
								)}

								{backups.map((backup, index) => (
									<tr key={backup.name} className={index === 0 ? "is-latest" : ""}>
										<td data-label="Cópia">
											<span className="backup-name cell-truncate" title={backup.name}>{backup.name}</span>
											{index === 0 && <span className="backup-latest">Mais recente</span>}
										</td>
										<td data-label="Data">{formatDateTime(backup.modified_at)}</td>
										<td data-label="Tamanho">{formatSize(backup.size)}</td>
										<td className="actions">
											<button
												className="options"
												title="Descarregar para este computador"
												aria-label={`Descarregar ${backup.name}`}
												disabled={downloading !== null}
												onClick={() => downloadBackup(backup.name)}
											>
												<i className={`fa-solid ${downloading === backup.name ? "fa-spinner fa-spin" : "fa-download"}`} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>

					</div>
				</div>

			</div>
		</div>
	);
}
