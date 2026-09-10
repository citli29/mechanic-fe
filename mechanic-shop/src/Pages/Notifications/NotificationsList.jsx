import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getStoredViewTypeId, notifyNotificationsUpdated, onNotificationsUpdated, setStoredViewTypeId } from "../../utils/notificationView";

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

	const requestIdRef = useRef(0);

	const [notifications, setNotifications] = useState([]);
	const [onlyUnread, setOnlyUnread] = useState(true);

	const [notificationTypes, setNotificationTypes] = useState([]);
	const [viewTypeId, setViewTypeId] = useState(getStoredViewTypeId());

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
			showMessage("error", "Ocorreu um erro.");
		}

		console.error(err);
	}


	const generalType = notificationTypes.find((t) => t.name === "Geral");
	const selectableTypes = notificationTypes.filter((t) => t.name !== "Geral");
	const defaultType = selectableTypes.find((t) => t.name === "Oficina") ?? selectableTypes[0];

	const effectiveViewTypeId = selectableTypes.some((t) => String(t.id) === String(viewTypeId))
		? viewTypeId
		: defaultType?.id ?? "";


	async function loadNotificationTypes() {
		try {
			const res = await api.get("/notification_types");
			setNotificationTypes(res.data.notification_type_list || []);
		} catch (err) {
			console.error(err);
		}
	}


	useEffect(() => { loadNotificationTypes(); }, []);


	async function loadNotifications() {
		if (!effectiveViewTypeId) return;

		const requestId = ++requestIdRef.current;

		setLoading(true);

		try {
			const params = { p: page, u: PER_PAGE };

			if (onlyUnread) params.is_checked = "false";

			const typeIds = [generalType?.id, effectiveViewTypeId].filter(Boolean);
			if (typeIds.length) params["n-type-in"] = typeIds.join(",");

			const res = await api.get("/notifications", { params });

			if (requestId !== requestIdRef.current) return;

			setNotifications(res.data.notification_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			handleApiError(err);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	useEffect(() => { loadNotifications(); }, [onlyUnread, page, effectiveViewTypeId]);

	useEffect(() => {
		const pollId = setInterval(loadNotifications, 5000);
		const unsubscribeUpdated = onNotificationsUpdated(loadNotifications);

		return () => {
			clearInterval(pollId);
			unsubscribeUpdated();
		};
	}, [onlyUnread, page, effectiveViewTypeId]);


	function selectFilter(unreadOnly) {
		setOnlyUnread(unreadOnly);
		setPage(1);
	}


	function selectViewType(id) {
		setStoredViewTypeId(id);
		setViewTypeId(id);
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
			notifyNotificationsUpdated();
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
							<label className="notif-view-label" htmlFor="notif-view-type">
								A ver como
							</label>

							<select
								id="notif-view-type"
								value={effectiveViewTypeId}
								onChange={(e) => selectViewType(e.target.value)}
							>
								{selectableTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>

							<label className="notif-unread-toggle">
								<input
									type="checkbox"
									checked={onlyUnread}
									onChange={(e) => selectFilter(e.target.checked)}
								/>
								Por Tratar
							</label>
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
