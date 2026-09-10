import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/Home.css";

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const DELIVERED_PER_PAGE = 5;

export default function Home() {

	const navigate = useNavigate();

	const requestIdRef = useRef(0);
	const deliveredRequestIdRef = useRef(0);

	const [todaySchedules, setTodaySchedules] = useState([]);
	const [unfinishedServicesTotal, setUnfinishedServicesTotal] = useState(0);

	const [productsToOrderTotal, setProductsToOrderTotal] = useState(0);
	const [productsAwaitingDeliveryTotal, setProductsAwaitingDeliveryTotal] = useState(0);

	const [productsDelivered, setProductsDelivered] = useState([]);
	const [productsDeliveredTotal, setProductsDeliveredTotal] = useState(0);
	const [deliveredPage, setDeliveredPage] = useState(1);
	const [deliveredTotalPages, setDeliveredTotalPages] = useState(1);

	const [loading, setLoading] = useState(true);
	const [loadingDelivered, setLoadingDelivered] = useState(true);


	async function loadDashboard() {
		const requestId = ++requestIdRef.current;

		setLoading(true);

		const today = formatDate(new Date());

		try {
			const [schedulesRes, servicesRes, sprToOrderRes, sprAwaitingDeliveryRes] = await Promise.all([
				api.get("/schedules", { params: { start_date: today, end_date: today } }),
				api.get("/services", { params: { status: "unfinished", p: 1, u: 1 } }),
				api.get("/services_products_requested", { params: { is_ordered: "false", p: 1, u: 1 } }),
				api.get("/services_products_requested", { params: { is_ordered: "true", is_delivered: "false", p: 1, u: 1 } }),
			]);

			if (requestId !== requestIdRef.current) return;

			setTodaySchedules(schedulesRes.data.schedule_list || []);
			setUnfinishedServicesTotal(servicesRes.data.pagination?.total ?? 0);

			setProductsToOrderTotal(sprToOrderRes.data.pagination?.total ?? 0);
			setProductsAwaitingDeliveryTotal(sprAwaitingDeliveryRes.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	async function loadDelivered() {
		const requestId = ++deliveredRequestIdRef.current;

		setLoadingDelivered(true);

		try {
			const res = await api.get("/services_products_requested", {
				params: { is_delivered: "true", p: deliveredPage, u: DELIVERED_PER_PAGE },
			});

			if (requestId !== deliveredRequestIdRef.current) return;

			setProductsDelivered(res.data.spr_list || []);
			setProductsDeliveredTotal(res.data.pagination?.total ?? 0);
			setDeliveredTotalPages(res.data.pagination?.total_pages || 1);
		} catch (err) {
			if (requestId !== deliveredRequestIdRef.current) return;

			console.error(err);
		} finally {
			if (requestId === deliveredRequestIdRef.current) setLoadingDelivered(false);
		}
	}


	useEffect(() => { loadDashboard(); }, []);
	useEffect(() => { loadDelivered(); }, [deliveredPage]);


	function getAppointmentStatusClass(schedule) {
		if (schedule.service_checkout) return "appointment-delivered";
		if (schedule.service_is_finished === 1) return "appointment-finished";
		if (schedule.service_id !== null) return "appointment-with-service";
		return "appointment-without-service";
	}


	function productContext(product) {
		const carLabel = [
			product.car_plate,
			[product.car_make, product.car_model].filter(Boolean).join(" "),
		].filter(Boolean).join(" - ");

		const label = [carLabel, product.client_name].filter(Boolean).join(" · ");

		return label ? `${label} (#${product.service_id})` : `Serviço #${product.service_id}`;
	}


	function groupByService(products) {
		const groups = [];
		const byServiceId = new Map();

		products.forEach((product) => {
			let group = byServiceId.get(product.service_id);

			if (!group) {
				group = {
					service_id: product.service_id,
					context: productContext(product),
					ready: Number(product.service_ready) === 1,
					items: [],
				};

				byServiceId.set(product.service_id, group);
				groups.push(group);
			}

			group.items.push(product);
		});

		return groups;
	}


	function renderProductGroups(products) {
		return (
			<div className="product-groups">
				{groupByService(products).map((group) => (
					<div key={group.service_id} className={`product-group ${group.ready ? "product-group-ready" : "product-group-partial"}`}>
						<div className="product-group-header">
							<span>
								{group.ready && <i className="fa-solid fa-circle-check product-ready-icon" title="Tudo entregue" />}
								{group.context}
							</span>

							<button className="options" onClick={() => navigate(`/service/${group.service_id}`)}>
								<i className="fa-solid fa-arrow-up-right-from-square" />
							</button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Produto</th>
									<th>Qt.</th>
								</tr>
							</thead>

							<tbody>
								{group.items.map((product) => (
									<tr key={product.id}>
										<td data-label="Produto">{product.product_name || "-"}</td>
										<td data-label="Qt.">{product.quantity}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				))}
			</div>
		);
	}


	return (
		<div className="page home-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-house" />
						<h1>Início</h1>
					</div>

					<div className="body">

						<div className="quick-actions">
							<button className="confirm" onClick={() => navigate("/schedules/new")}>
								<i className="fa-solid fa-calendar-plus" /> Nova Marcação
							</button>

							<button className="confirm" onClick={() => navigate("/services/new")}>
								<i className="fa-solid fa-clipboard-list" /> Novo Serviço
							</button>
						</div>

						<div className="stat-grid">
							<button className="stat-card" onClick={() => navigate("/schedules_calendar")}>
								<i className="fa-solid fa-calendar-day" />
								<div className="stat-value">{todaySchedules.length}</div>
								<div className="stat-label">Marcações Hoje</div>
							</button>

							<button className="stat-card" onClick={() => navigate("/services")}>
								<i className="fa-solid fa-wrench" />
								<div className="stat-value">{unfinishedServicesTotal}</div>
								<div className="stat-label">Serviços Por Terminar</div>
							</button>

							<div className="stat-card stat-card-static">
								<i className="fa-solid fa-cart-shopping" />
								<div className="stat-value">{productsToOrderTotal}</div>
								<div className="stat-label">Produtos Por Encomendar</div>
							</div>

							<div className="stat-card stat-card-static">
								<i className="fa-solid fa-truck" />
								<div className="stat-value">{productsAwaitingDeliveryTotal}</div>
								<div className="stat-label">Produtos A Aguardar Entrega</div>
							</div>

							<div className="stat-card stat-card-static">
								<i className="fa-solid fa-dolly" />
								<div className="stat-value">{productsDeliveredTotal}</div>
								<div className="stat-label">Produtos Entregues</div>
							</div>
						</div>

					</div>
				</div>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-day" />
						<h1>Marcações de Hoje</h1>
					</div>

					<div className="body">
						{loading ? (
							<p className="home-empty">A carregar...</p>
						) : todaySchedules.length === 0 ? (
							<p className="home-empty">Sem marcações para hoje.</p>
						) : (
							<div className="today-schedules">
								{todaySchedules.map((schedule) => (
									<div
										key={schedule.id}
										className={`today-schedule ${getAppointmentStatusClass(schedule)}`}
										onClick={() => navigate(`/schedules/${schedule.id}`)}
									>
										<div className="today-schedule-top-row">
											<div className="today-schedule-plate">
												{schedule.car_plate
													? `${schedule.car_plate} - ${[schedule.car_make, schedule.car_model].filter(Boolean).join(" ")}`
													: [schedule.car_make, schedule.car_model].filter(Boolean).join(" ") || "Sem Viatura"}
											</div>

											{schedule.service_id !== null && (
												<button
													className="today-schedule-open-service"
													title="Abrir Serviço"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/service/${schedule.service_id}`);
													}}
												>
													<i className="fa-solid fa-arrow-up-right-from-square" />
												</button>
											)}
										</div>

										<div className="today-schedule-client">
											{schedule.client_name || "Sem Cliente"}
										</div>

										<div className="today-schedule-description">
											{schedule.description}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-dolly" />
						<h1>Produtos Entregues</h1>
					</div>

					<div className="body">
						{loadingDelivered && productsDelivered.length === 0 ? (
							<p className="home-empty">A carregar...</p>
						) : productsDelivered.length === 0 ? (
							<p className="home-empty">Sem produtos entregues.</p>
						) : (
							renderProductGroups(productsDelivered)
						)}

						<div className="pagination">
							<button
								className="options"
								disabled={deliveredPage <= 1}
								onClick={() => setDeliveredPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {deliveredPage} de {deliveredTotalPages} ({productsDeliveredTotal} produtos)</span>

							<button
								className="options"
								disabled={deliveredPage >= deliveredTotalPages}
								onClick={() => setDeliveredPage((p) => Math.min(deliveredTotalPages, p + 1))}
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
