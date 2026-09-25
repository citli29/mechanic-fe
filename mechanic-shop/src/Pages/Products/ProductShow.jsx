import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ProductShow.css";

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
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export default function ProductShow() {

	const { id } = useParams();

	const [product, setProduct] = useState(null);
	const [services, setServices] = useState([]);
	const [appliedByService, setAppliedByService] = useState({});
	const [allAppliedByService, setAllAppliedByService] = useState({});
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [search, setSearch] = useState("");


	async function loadProduct() {
		try {
			const res = await api.get(`/products/${id}`);
			setProduct(res.data.product || null);
		} catch (err) {
			console.error(err);
			setProduct(null);
		}
	}


	async function loadHistory() {
		setLoadingHistory(true);

		try {
			const [servicesRes, appliedRes] = await Promise.all([
				api.get("/services", { params: { product_id: id, sort: "checkin", dir: "desc" } }),
				api.get("/services_applied_products", { params: { product_id: id } }),
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


	async function loadAllApplied(serviceIds) {
		try {
			const responses = await Promise.all(
				serviceIds.map((serviceId) => api.get("/services_applied_products", { params: { service_id: serviceId } }))
			);

			const grouped = {};

			serviceIds.forEach((serviceId, index) => {
				grouped[serviceId] = responses[index].data.sap_list || [];
			});

			setAllAppliedByService(grouped);
		} catch (err) {
			console.error(err);
		}
	}


	useEffect(() => { loadProduct(); }, [id]);
	useEffect(() => { loadHistory(); }, [id]);

	useEffect(() => {
		if (services.length === 0) {
			setAllAppliedByService({});
			return;
		}

		loadAllApplied(services.map((service) => service.id));
	}, [services]);


	const filteredServices = useMemo(() => {
		const term = normalizeSearch(search);

		if (!term) return services;

		return services.filter((service) => {
			const applied = allAppliedByService[service.id] || appliedByService[service.id] || [];

			const haystack = normalizeSearch(
				[
					service.id,
					service.service_type_name,
					service.service,
					extractPlainNote(service.note),
					service.checkin,
					service.checkout,
					service.kms,
					service.client_name,
					service.car_plate,
					...applied.map((ap) => ap.product_name),
				]
					.filter(Boolean)
					.join(" ")
			);

			return haystack.includes(term);
		});
	}, [services, appliedByService, allAppliedByService, search]);


	return (
		<div className="page products-show-page">
			<div className="content">

				<div className="details-actions">
					<Link className="options" to="/products">
						<i className="fa-solid fa-arrow-left" /> Voltar
					</Link>
				</div>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-box" />
						<h1>{product?.name || "Produto"}</h1>
					</div>

					<div className="body">
						<div className="product-info-fields">
							<span><strong>Referência:</strong> {product?.reference || "S/ Referência"}</span>
							<span><strong>Tipo:</strong> {product?.product_type || "S/ Tipo"}</span>
						</div>
					</div>
				</div>

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
							<p className="product-history-empty">A Carregar...</p>
						) : services.length === 0 ? (
							<p className="product-history-empty">Sem serviços associados a este produto.</p>
						) : filteredServices.length === 0 ? (
							<p className="product-history-empty">Sem resultados para "{search}".</p>
						) : (
							<div className="product-history-list">
								{filteredServices.map((service) => {
									const status = getStatusInfo(service);
									const allApplied = allAppliedByService[service.id] || (appliedByService[service.id] || []);
									const plainNote = extractPlainNote(service.note);

									return (
										<Link
											key={service.id}
											className="product-history-item"
											to={`/services/${service.id}`}
										>
											<div className="product-history-item-header">
												<span className="product-history-id">#{service.id}</span>
												<span className="product-history-type">{service.service_type_name}</span>
												<span className="product-history-car">
													{service.car_plate || service.client_name || "S/ Viatura"}
												</span>
												<span className="product-history-dates">
													{service.checkin || "-"} → {service.checkout || "Em curso"}
												</span>
												<span className={`product-history-status ${status.badgeClass}`}>
													{status.label}
												</span>
											</div>

											<div className="product-history-subcards">
												<div className="product-history-subcard">
													<span className="product-history-label">Serviço Realizado</span>
													<p>{service.service || "-"}</p>
												</div>

												<div className="product-history-subcard">
													<span className="product-history-label">Notas/Observações</span>
													<p>{plainNote || "-"}</p>
												</div>
											</div>

											{allApplied.length > 0 && (
												<div className="product-history-products">
													<span className="product-history-label">Produtos Aplicados Neste Serviço</span>
													<ul className="product-history-products-list">
														{allApplied.map((ap) => (
															<li
																key={ap.id}
																className={[
																	ap.is_applied ? "" : "product-history-product-pending",
																	String(ap.product_id) === String(id) ? "product-history-product-current" : "",
																].filter(Boolean).join(" ")}
															>
																<i className={`fa-solid ${ap.is_applied ? "fa-check" : "fa-clock"}`} />
																{ap.product_name} {ap.quantity ? `× ${ap.quantity}` : ""} {ap.is_applied ? "" : "(por aplicar)"}
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
