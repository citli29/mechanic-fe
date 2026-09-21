import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getDefaultViewTypeId, getStoredViewTypeId, notifyNotificationsUpdated, onNotificationsUpdated, setStoredViewTypeId } from "../../utils/notificationView";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/NotificationsList.css";

const PER_PAGE = 20;

const SERVICE_FINISHED_TITLE = "Folha de serviço finalizada";
const SERVICE_STARTED_TITLE = "Serviço iniciado";
const PRODUCT_REQUESTED_TITLE = "Produto pedido";
const PRODUCT_DELIVERED_TITLE = "Produto entregue";
const SAME_CAR_TITLE = "Folha de serviço aberta para o mesmo carro";

// Same 4-state precedence as ServiceHeader.jsx's getServiceStatus/getStateClass
// — kept in sync manually since there's no shared module for it yet.
function getServiceStatus(service) {
	if (service?.checkout) return { desc: "Entregue", stateClass: "state-delivered" };
	if (service?.office_check) return { desc: "Validado", stateClass: "state-validated" };
	if (service?.is_finished) return { desc: "Terminado", stateClass: "state-finished" };
	return { desc: "Por Terminar", stateClass: "state-not-finished" };
}

function formatCarLabel(service) {
	if (!service?.car_plate) return null;
	return [service.car_plate, service.car_make_name, service.car_model_name].filter(Boolean).join(" - ");
}

// The notification `data` payload only ever carries a service url — the
// product's name has to be pulled back out of the message text itself so we
// can match it against /products_requested and show its reference/tipo/qtd.
function extractProductName(message, title) {
	if (!message) return null;
	const verb = title === PRODUCT_REQUESTED_TITLE ? "pedido" : "entregue";
	const match = message.match(new RegExp(`^Produto (.+?) ${verb} `));
	return match ? match[1] : null;
}

function extractServiceIdFromUrl(url) {
	const match = url?.match(/^service\/(\d+)$/);
	return match ? match[1] : null;
}

// Shared by the popup preview and by "open" navigation (for highlighting the
// row on the Encomendas page) so both agree on which product a notification
// is actually about.
async function findMatchingProductRequest(serviceId, message, title) {
	const productName = extractProductName(message, title);
	if (!serviceId || !productName) return null;

	try {
		const res = await api.get(`/services/${serviceId}/products_requested`);
		return (res.data.spr_list || []).find(
			(pr) => (pr.product_name || "").trim().toLowerCase() === productName.trim().toLowerCase()
		) || null;
	} catch {
		return null;
	}
}

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
	const [viewingNotification, setViewingNotification] = useState(null);
	const [preview, setPreview] = useState(null);
	const [previewLoading, setPreviewLoading] = useState(false);

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

	const effectiveViewTypeId = selectableTypes.some((t) => String(t.id) === String(viewTypeId))
		? viewTypeId
		: getDefaultViewTypeId(selectableTypes);


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


	useEffect(() => {
		const title = viewingNotification?.title;
		const serviceId = extractServiceIdFromUrl(viewingNotification?.data?.url);

		let isCurrent = true;
		setPreview(null);
		setPreviewLoading(false);

		async function run() {
			if ((title === SERVICE_FINISHED_TITLE || title === SERVICE_STARTED_TITLE) && serviceId) {
				setPreviewLoading(true);
				try {
					const res = await api.get(`/services/${serviceId}`);
					if (isCurrent) setPreview({ type: "service", service: res.data.service });
				} catch {
					// leave preview empty — popup still shows the plain message
				} finally {
					if (isCurrent) setPreviewLoading(false);
				}
			} else if ((title === PRODUCT_REQUESTED_TITLE || title === PRODUCT_DELIVERED_TITLE) && serviceId) {
				setPreviewLoading(true);
				try {
					const [serviceRes, product] = await Promise.all([
						api.get(`/services/${serviceId}`),
						findMatchingProductRequest(serviceId, viewingNotification.message, title),
					]);
					if (isCurrent) setPreview({ type: "product", service: serviceRes.data.service, product });
				} catch {
					// leave preview empty — popup still shows the plain message
				} finally {
					if (isCurrent) setPreviewLoading(false);
				}
			} else if (title === SAME_CAR_TITLE) {
				const existingId = viewingNotification.message?.match(/#(\d+)/)?.[1];
				const ids = [...new Set([serviceId, existingId].filter(Boolean))];
				if (ids.length === 0) return;

				setPreviewLoading(true);
				try {
					const services = await Promise.all(
						ids.map((id) => api.get(`/services/${id}`).then((r) => r.data.service).catch(() => null))
					);
					if (isCurrent) setPreview({ type: "same-car", services: services.filter(Boolean) });
				} finally {
					if (isCurrent) setPreviewLoading(false);
				}
			}
		}

		run();

		return () => { isCurrent = false; };
	}, [viewingNotification]);


	function selectFilter(unreadOnly) {
		setOnlyUnread(unreadOnly);
		setPage(1);
	}


	function selectViewType(id) {
		setStoredViewTypeId(id);
		setViewTypeId(id);
		setPage(1);
	}


	async function handleOpenNotification(notification) {
		// A requested product is waiting to be handled from Encomendas now
		// (see the "Pedido"/"Recebido" toggles moved there), not from the
		// service page itself — so this one goes there instead of data.url's
		// service link. Products_requested defaults to the "Por Encomendar"
		// tab already, which is exactly what a fresh "Produto pedido" needs.
		if (notification.title === PRODUCT_REQUESTED_TITLE) {
			const serviceId = extractServiceIdFromUrl(notification.data?.url);
			const product = await findMatchingProductRequest(serviceId, notification.message, notification.title);

			// It may well have moved on since the notification fired (e.g.
			// already ordered) — land on whichever Encomendas tab it's
			// actually sitting in now, not blindly on "Por Encomendar".
			const activeTab = product?.is_delivered == 1
				? "delivered"
				: product?.is_ordered == 1
					? "awaiting_delivery"
					: "to_order";

			navigate("/products_requested", product ? { state: { highlightId: product.id, activeTab } } : undefined);
			return;
		}

		const url = notification.data?.url;

		if (url) {
			navigate(url.startsWith("/") ? url : `/${url}`);
		}
	}


	function handleViewMessage(notification, e) {
		e.stopPropagation();
		setViewingNotification(notification);
	}


	async function handleToggleChecked(notification, e) {
		e?.stopPropagation();

		try {
			const action = notification.is_checked ? "uncheck" : "check";
			await api.put(`/notifications/${notification.id}/${action}`);

			setViewingNotification((prev) =>
				prev && prev.id === notification.id
					? { ...prev, is_checked: prev.is_checked ? 0 : 1 }
					: prev
			);

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
											<td data-label="Estado" className="notif-estado-cell" onClick={(e) => e.stopPropagation()}>
												<input
													type="checkbox"
													checked={!!notification.is_checked}
													title={notification.is_checked ? "Tratada" : "Por Tratar"}
													onChange={(e) => handleToggleChecked(notification, e)}
												/>
												<button
													className="notif-message-toggle notif-message-toggle-mobile"
													onClick={(e) => handleViewMessage(notification, e)}
													title="Ver mensagem completa"
												>
													<i className="fa-solid fa-eye" />
												</button>
											</td>
											<td data-label="Tipo">{notification.notification_type_name || "-"}</td>
											<td data-label="Título">{notification.title}</td>
											<td data-label="Mensagem" className="notif-message">
												<span className="notif-message-text">{notification.message}</span>
												<button
													className="notif-message-toggle"
													onClick={(e) => handleViewMessage(notification, e)}
													title="Ver mensagem completa"
												>
													<i className="fa-solid fa-eye" />
												</button>
											</td>
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

			{viewingNotification && (
				<div className="notif-detail-backdrop" onClick={() => setViewingNotification(null)}>
					<div className="notif-detail-modal" onClick={(e) => e.stopPropagation()}>
						<div className="notif-detail-header">
							<h2>{viewingNotification.title}</h2>
							<button className="cancel" onClick={() => setViewingNotification(null)}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<div className="notif-detail-meta-row">
							<p className="notif-detail-meta">
								{viewingNotification.notification_type_name || "-"} — {formatDateTime(viewingNotification.created_at)}
							</p>

							<label className="notif-detail-checked">
								<input
									type="checkbox"
									checked={!!viewingNotification.is_checked}
									onChange={(e) => handleToggleChecked(viewingNotification, e)}
								/>
								Tratada
							</label>
						</div>

						<div className="notif-detail-text">
							{viewingNotification.message}
						</div>

						{(previewLoading || preview) && (
							<div className="notif-service-preview">
								{previewLoading ? (
									<p className="notif-service-preview-loading">A carregar...</p>
								) : preview.type === "service" ? (
									<>
										<div className="notif-service-preview-row">
											<span className="notif-service-preview-label">Estado</span>
											<span className={`notif-service-preview-state ${getServiceStatus(preview.service).stateClass}`}>
												{getServiceStatus(preview.service).desc}
											</span>
										</div>

										<div className="notif-service-preview-row">
											<span className="notif-service-preview-label">Tipo de Serviço</span>
											<span>{preview.service?.service_type_name || "-"}</span>
										</div>

										{formatCarLabel(preview.service) && (
											<div className="notif-service-preview-row">
												<span className="notif-service-preview-label">Viatura</span>
												<span>{formatCarLabel(preview.service)}</span>
											</div>
										)}

										{preview.service?.malfunction && (
											<div className="notif-service-preview-row notif-service-preview-malfunction">
												<span className="notif-service-preview-label">Descrição de Avaria</span>
												<p className="notif-service-preview-text">{preview.service.malfunction}</p>
											</div>
										)}
									</>
								) : preview.type === "product" ? (
									<>
										<div className="notif-service-preview-row">
											<span className="notif-service-preview-label">Tipo de Serviço</span>
											<span>{preview.service?.service_type_name || "-"}</span>
										</div>

										{preview.product && (
											<>
												<div className="notif-service-preview-row">
													<span className="notif-service-preview-label">Produto</span>
													<span>{preview.product.product_name}</span>
												</div>

												<div className="notif-service-preview-row">
													<span className="notif-service-preview-label">Referência</span>
													<span>{preview.product.product_reference || "-"}</span>
												</div>

												<div className="notif-service-preview-row">
													<span className="notif-service-preview-label">Tipo de Produto</span>
													<span>{preview.product.product_type_name || "-"}</span>
												</div>

												<div className="notif-service-preview-row">
													<span className="notif-service-preview-label">Quantidade</span>
													<span>{preview.product.quantity}</span>
												</div>
											</>
										)}
									</>
								) : preview.type === "same-car" ? (
									<div className="notif-service-preview-cards">
										{preview.services.map((s) => (
											<button
												key={s.id}
												type="button"
												className="notif-service-preview-card"
												onClick={() => {
													navigate(`/service/${s.id}`);
													setViewingNotification(null);
												}}
											>
												<i className="fa-solid fa-arrow-up-right-from-square" />
												<span className="notif-service-preview-card-id">Serviço #{s.id}</span>
												<span className={`notif-service-preview-state ${getServiceStatus(s).stateClass}`}>
													{getServiceStatus(s).desc}
												</span>
											</button>
										))}
									</div>
								) : null}
							</div>
						)}

						{viewingNotification.data?.url && (
							<div className="notif-detail-actions">
								<button
									className="confirm"
									onClick={() => {
										handleOpenNotification(viewingNotification);
										setViewingNotification(null);
									}}
								>
									<i className="fa-solid fa-arrow-up-right-from-square" /> Abrir
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
