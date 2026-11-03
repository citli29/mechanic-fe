// "Histórico de Serviços" card: searchable list of services (newest first),
// each linking to its service page. Used by the viatura page and the
// cliente page. showCar: also show each service's car (a client can have
// several); showClient: also show its client.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LabSummaryButton } from "../LabSummary/LabItemsLabel";
import { hasLabSummary } from "../../utils/labSummary";

import "./ServiceHistory.css";

function getStatusInfo(service) {
	if (service.checkout) return { badgeClass: "state-delivered", label: "Entregue" };
	if (service.is_finished) return { badgeClass: "state-finished", label: "Terminado" };
	return { badgeClass: "state-not-finished", label: "Por Terminar" };
}

// "39-NQ-49" → "39NQ49".
function compactPlate(plate) {
	return plate ? String(plate).replace(/[^a-z0-9]/gi, "") : "";
}

// "2026-09-24" → "24/09/2026".
function formatDay(date) {
	if (!date) return "";
	const [y, m, d] = String(date).slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
}

const NOTE_SEPARATOR = "\u001E";

function extractPlainNote(raw) {
	if (typeof raw !== "string") return "";
	const i = raw.indexOf(NOTE_SEPARATOR);
	return i === -1 ? raw : raw.slice(i + NOTE_SEPARATOR.length);
}

function normalizeSearch(text) {
	return (text ?? "")
		.toString()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export default function ServiceHistory({ services, appliedByService = {}, loading, emptyText, showCar = false, showClient = false }) {

	const [search, setSearch] = useState("");

	const filteredServices = useMemo(() => {
		const term = normalizeSearch(search);

		if (!term) return services;

		return services.filter((service) => {
			const applied = appliedByService[service.id] || [];

			const haystack = normalizeSearch(
				[
					service.id,
					service.service_type_name,
					service.service,
					extractPlainNote(service.note),
					service.checkin,
					service.checkout,
					// Also as shown (24/09/2026), so "24/09" finds it.
					formatDay(service.checkin),
					formatDay(service.checkout),
					service.kms,
					showCar && service.car_plate,
					// Plate without dashes too, so "39nq49" finds 39-NQ-49.
					showCar && compactPlate(service.car_plate),
					showCar && service.car_make_name,
					showCar && service.car_model_name,
					showClient && service.client_name,
					...applied.map((ap) => ap.product_name),
				]
					.filter(Boolean)
					.join(" ")
			);

			return haystack.includes(term);
		});
	}, [services, appliedByService, search, showCar, showClient]);


	return (
		<section className="detail-panel service-history">
			<div className="detail-panel-head">
				<h2><i className="fa-solid fa-clock-rotate-left" /> Histórico de Serviços</h2>
				{!loading && <span className="detail-panel-count">{services.length}</span>}

				{!loading && services.length > 0 && (
					<div className="history-search">
						<i className="fa-solid fa-magnifying-glass" />
						<input
							type="text"
							placeholder="Pesquisar no histórico..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				)}
			</div>

			{loading ? (
				<p className="detail-panel-empty">A carregar...</p>
			) : services.length === 0 ? (
				<p className="detail-panel-empty">{emptyText}</p>
			) : filteredServices.length === 0 ? (
				<p className="detail-panel-empty">Sem resultados para "{search}".</p>
			) : (
				<div className="car-history-list">
					{filteredServices.map((service) => {
						const status = getStatusInfo(service);
						const applied = (appliedByService[service.id] || []).filter((ap) => ap.is_applied);
						const plainNote = extractPlainNote(service.note);

						return (
							<Link
								key={service.id}
								className="car-history-item"
								to={`/services/${service.id}`}
							>
								<div className="car-history-item-header">
									<span className="car-history-id">#{service.id}</span>
									<span className="car-history-type">{service.service_type_name}</span>
									{showCar && (
										<span className="car-history-car">
											{service.car_plate
												? <><b>{service.car_plate}</b> {[service.car_make_name, service.car_model_name].filter(Boolean).join(" ")}</>
												: "Sem viatura"}
										</span>
									)}
									{showClient && service.client_name && (
										<span className="car-history-car">{service.client_name}</span>
									)}
									<span className="car-history-kms">
										{service.kms ? `${service.kms} kms` : "S/ Kms"}
									</span>
									<span className="car-history-dates">
										{service.checkin || "-"} → {service.checkout || "Em curso"}
									</span>
									<span className={`car-history-status ${status.badgeClass}`}>
										{status.label}
									</span>
								</div>

								<div className="car-history-subcards">
									<div className="car-history-subcard">
										{hasLabSummary(service) && <LabSummaryButton className="is-corner" serviceId={service.id} />}
										<span className="car-history-label">Serviço Realizado</span>
										<p>{service.service || "-"}</p>
									</div>

									<div className="car-history-subcard">
										<span className="car-history-label">Notas/Observações</span>
										<p>{plainNote || "-"}</p>
									</div>
								</div>

								{applied.length > 0 && (
									<div className="car-history-products">
										<span className="car-history-label">Produtos Aplicados</span>
										<ul>
											{applied.map((ap) => (
												<li key={ap.id}>
													<i className="fa-solid fa-check" />
													{ap.product_name} {ap.quantity ? `× ${ap.quantity}` : ""}
												</li>
											))}
										</ul>
									</div>
								)}
							</Link>
						);
					})}
				</div>
			)}
		</section>
	);
}
