import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/CarShow.css";

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

function normalizeSearch(text) {
	return (text ?? "")
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export default function CarShow() {

	const { id } = useParams();

	const [services, setServices] = useState([]);
	const [appliedByService, setAppliedByService] = useState({});
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [search, setSearch] = useState("");


	async function loadHistory() {
		setLoadingHistory(true);

		try {
			const [servicesRes, appliedRes] = await Promise.all([
				api.get("/services", { params: { car_id: id, sort: "checkin", dir: "desc" } }),
				api.get("/services_applied_products", { params: { car_id: id } }),
			]);

			setServices(servicesRes.data.service_list || []);

			const grouped = {};

			(appliedRes.data.sap_list || []).forEach((ap) => {
				if (!grouped[ap.service_id]) grouped[ap.service_id] = [];
				grouped[ap.service_id].push(ap);
			});

			setAppliedByService(grouped);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingHistory(false);
		}
	}


	useEffect(() => { loadHistory(); }, [id]);


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
					service.kms,
					...applied.map((ap) => ap.product_name),
				]
					.filter(Boolean)
					.join(" ")
			);

			return haystack.includes(term);
		});
	}, [services, appliedByService, search]);


	return (
		<div className="page cars-show-page">
			<div className="content">

				<div className="details-actions">
					<Link className="options" to="/cars">
						<i className="fa-solid fa-arrow-left" /> Voltar
					</Link>
				</div>

				<CarPicker
					car_id={id}
					onCarIdChange={() => {}}
					isAllowedEditing={true}
					allowDeselect={false}
					defaultInfoShowing={true}
				/>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clock-rotate-left" />
						<h1>Histórico de Serviços</h1>
					</div>

					<div className="body">
						{!loadingHistory && services.length > 0 && (
							<div className="filters">
								<input
									type="text"
									placeholder="Pesquisar no histórico..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
						)}

						{loadingHistory ? (
							<p className="car-history-empty">A Carregar...</p>
						) : services.length === 0 ? (
							<p className="car-history-empty">Sem serviços associados a esta viatura.</p>
						) : filteredServices.length === 0 ? (
							<p className="car-history-empty">Sem resultados para "{search}".</p>
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
											to={`/service/${service.id}`}
										>
											<div className="car-history-item-header">
												<span className="car-history-id">#{service.id}</span>
												<span className="car-history-type">{service.service_type_name}</span>
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
					</div>
				</div>

			</div>
		</div>
	);
}
