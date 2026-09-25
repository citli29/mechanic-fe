import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/UserShow.css";

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function addDays(dateStr, amount) {
	const [y, m, d] = dateStr.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	date.setDate(date.getDate() + amount);
	return formatDate(date);
}

function formatMinutes(minutes) {
	const total = Math.max(0, Math.round(minutes || 0));
	const h = Math.floor(total / 60);
	const m = total % 60;
	return `${h}h ${String(m).padStart(2, "0")}m`;
}

function getStatusInfo(service) {
	if (service.checkout) return { badgeClass: "state-delivered", label: "Entregue" };
	if (service.is_finished) return { badgeClass: "state-finished", label: "Terminado" };
	return { badgeClass: "state-not-finished", label: "Por Terminar" };
}

const NOTE_SEPARATOR = "\u001E";

function extractPlainNote(raw) {
	if (typeof raw !== "string") return "";
	const i = raw.indexOf(NOTE_SEPARATOR);
	return i === -1 ? raw : raw.slice(i + NOTE_SEPARATOR.length);
}

function carLabel(info) {
	return [info.car_plate, [info.car_make_name, info.car_model_name].filter(Boolean).join(" ")]
		.filter(Boolean)
		.join(" - ");
}

export default function UserShow() {

	const { id } = useParams();

	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
	const [dayEntries, setDayEntries] = useState([]);
	const [serviceInfoById, setServiceInfoById] = useState({});
	const [loadingDay, setLoadingDay] = useState(true);


	async function loadUser() {
		setLoading(true);

		try {
			const res = await api.get(`/users/${id}`);
			setUser(res.data.user || null);
		} catch (err) {
			console.error(err);
			setUser(null);
		} finally {
			setLoading(false);
		}
	}


	async function loadDayEntries() {
		setLoadingDay(true);

		try {
			const [sutRes, sutpRes] = await Promise.all([
				api.get("/services_user_times", { params: { user_id: id, date: selectedDate } }),
				api.get("/services_user_time_punches", { params: { user_id: id, date: selectedDate } }),
			]);

			const entries = [
				...(sutRes.data.sut_list || []).map((entry) => ({ ...entry, key: `sut-${entry.id}` })),
				...(sutpRes.data.sutp_list || []).map((entry) => ({ ...entry, key: `sutp-${entry.id}` })),
			];

			setDayEntries(entries);

			const missingIds = [...new Set(entries.map((entry) => entry.service_id))]
				.filter((serviceId) => serviceInfoById[serviceId] === undefined);

			if (missingIds.length > 0) {
				const responses = await Promise.all(
					missingIds.map((serviceId) => api.get(`/services/${serviceId}`).catch(() => null))
				);

				setServiceInfoById((prev) => {
					const next = { ...prev };
					missingIds.forEach((serviceId, index) => {
						next[serviceId] = responses[index]?.data?.service || null;
					});
					return next;
				});
			}
		} catch (err) {
			console.error(err);
			setDayEntries([]);
		} finally {
			setLoadingDay(false);
		}
	}


	useEffect(() => { loadUser(); }, [id]);
	useEffect(() => { loadDayEntries(); }, [id, selectedDate]);


	const dayTotalMinutes = dayEntries.reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);

	const groupedByService = Object.values(
		dayEntries.reduce((groups, entry) => {
			const serviceId = entry.service_id;

			if (!groups[serviceId]) {
				groups[serviceId] = { service_id: serviceId, minutes: 0 };
			}

			groups[serviceId].minutes += Number(entry.minutes) || 0;

			return groups;
		}, {})
	).sort((a, b) => b.minutes - a.minutes);


	return (
		<div className="page users-show-page">
			<div className="content">

				<div className="details-actions">
					<Link className="options" to="/users">
						<i className="fa-solid fa-arrow-left" /> Voltar
					</Link>
				</div>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-user" />
						<h1>{loading ? "A Carregar..." : (user?.name || "Utilizador")}</h1>
					</div>
				</div>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-stopwatch" />
						<h1>Tempos do Dia</h1>
					</div>

					<div className="body">
						<div className="user-day-picker">
							<button
								type="button"
								className="options"
								title="Dia anterior"
								onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
							/>

							<button
								type="button"
								className="options"
								title="Dia seguinte"
								onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
							>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

						{loadingDay ? (
							<p className="user-day-empty">A Carregar...</p>
						) : groupedByService.length === 0 ? (
							<p className="user-day-empty">Sem tempos registados neste dia.</p>
						) : (
							<>
								<div className="user-day-list">
									{groupedByService.map((group) => {
										const info = serviceInfoById[group.service_id];

										if (!info) {
											return (
												<Link
													key={group.service_id}
													className="user-day-item"
													to={`/services/${group.service_id}`}
												>
													<span className="user-day-item-id">#{group.service_id}</span>
													<span className="user-day-item-minutes">{formatMinutes(group.minutes)}</span>
												</Link>
											);
										}

										const status = getStatusInfo(info);
										const plainNote = extractPlainNote(info.note);

										return (
											<Link
												key={group.service_id}
												className="user-day-item"
												to={`/services/${group.service_id}`}
											>
												<div className="user-day-item-header">
													<span className="user-day-item-id">#{group.service_id}</span>
													<span className="user-day-item-type">{info.service_type_name}</span>
													<span className="user-day-item-car">
														{carLabel(info) || info.client_name || "S/ Viatura"}
													</span>
													<span className="user-day-item-dates">
														{info.checkin || "-"} → {info.checkout || "Em curso"}
													</span>
													<span className={`user-day-item-status ${status.badgeClass}`}>
														{status.label}
													</span>
													<span className="user-day-item-minutes">{formatMinutes(group.minutes)}</span>
												</div>

												<div className="user-day-item-subcards">
													<div className="user-day-item-subcard">
														<span className="user-day-item-label">Serviço Realizado</span>
														<p>{info.service || "-"}</p>
													</div>

													<div className="user-day-item-subcard">
														<span className="user-day-item-label">Notas/Observações</span>
														<p>{plainNote || "-"}</p>
													</div>
												</div>
											</Link>
										);
									})}
								</div>

								<div className="user-day-total">
									<span>Total do Dia</span>
									<span>{formatMinutes(dayTotalMinutes)}</span>
								</div>
							</>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}
