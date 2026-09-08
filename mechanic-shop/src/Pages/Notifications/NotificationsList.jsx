import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/NotificationsList.css";

const PER_PAGE = 20;

function formatDateTime(value) {
	if (!value) return "-";

	const [datePart, timePart] = String(value).split(" ");
	const [year, month, day] = (datePart || "").split("-");

	if (!year || !month || !day) return value;

	return `${day}/${month}/${year}${timePart ? " " + timePart.slice(0, 5) : ""}`;
}

export default function NotificationsList() {

	const navigate = useNavigate();

	const [notifications, setNotifications] = useState([]);
	const [onlyUnread, setOnlyUnread] = useState(true);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [loading, setLoading] = useState(true);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


	function showMessage(type, text) {
		setMessage({ type, text });

		setTimeout(() => {
			setMessage({ type: "", text: "" });
		}, 4000);
	}


	function handleApiError(err) {
		if (err.response?.data?.error) {
			showMessage("error", err.response.data.error);
		} else {
			showMessage("error", "Something went wrong.");
		}

		console.error(err);
	}


	async function loadNotifications() {
		setLoading(true);

		try {
			const params = { p: page, u: PER_PAGE };

			if (onlyUnread) params.is_checked = "false";

			const res = await api.get("/notifications", { params });

			setNotifications(res.data.notification_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	}


	useEffect(() => { loadNotifications(); }, [onlyUnread, page]);


	function selectFilter(unreadOnly) {
		setOnlyUnread(unreadOnly);
		setPage(1);
	}


	function handleOpenNotification(notification) {
		const url = notification.data?.url;

		if (url) {
			navigate(url.startsWith("/") ? url : `/${url}`);
		}
	}


	async function handleToggleChecked(notification, e) {
		e.stopPropagation();

		try {
			const action = notification.is_checked ? "uncheck" : "check";
			await api.put(`/notifications/${notification.id}/${action}`);
			loadNotifications();
		} catch (err) {
			handleApiError(err);
		}
	}


	return (
		<div className="page notifications-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-bell" />
						<h1>Notificações</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="filters">
							<button
								className={onlyUnread ? "confirm" : "options"}
								onClick={() => selectFilter(true)}
							>
								Por Tratar
							</button>

							<button
								className={!onlyUnread ? "confirm" : "options"}
								onClick={() => selectFilter(false)}
							>
								Todas
							</button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Estado</th>
									<th>Tipo</th>
									<th>Título</th>
									<th>Mensagem</th>
									<th>Data</th>
								</tr>
							</thead>

							<tbody>
								{loading && notifications.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
									</tr>
								) : !loading && notifications.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>
											{onlyUnread ? "Sem notificações por tratar." : "Sem notificações."}
										</td>
									</tr>
								) : (
									notifications.map((notification) => (
										<tr
											key={notification.id}
											className={notification.is_checked ? "notif-read" : "notif-unread"}
											onClick={() => handleOpenNotification(notification)}
										>
											<td data-label="Estado" onClick={(e) => e.stopPropagation()}>
												<input
													type="checkbox"
													checked={!!notification.is_checked}
													title={notification.is_checked ? "Tratada" : "Por Tratar"}
													onChange={(e) => handleToggleChecked(notification, e)}
												/>
											</td>
											<td data-label="Tipo">{notification.notification_type_name || "-"}</td>
											<td data-label="Título">{notification.title}</td>
											<td data-label="Mensagem" className="notif-message">{notification.message}</td>
											<td data-label="Data">{formatDateTime(notification.created_at)}</td>
										</tr>
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

							<span>Página {page} de {totalPages} ({total} notificações)</span>

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
