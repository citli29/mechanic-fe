import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesList.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";

const PER_PAGE = 10;

const SERVICE_TYPE_COLORS = ["#2563eb", "#e8aa2e", "#ba2323", "#22c55e", "#a3540a", "#e823d1"];

function getServiceTypeAccent(serviceTypeId) {
	if (!serviceTypeId) return "#cbd5e1";
	return SERVICE_TYPE_COLORS[serviceTypeId % SERVICE_TYPE_COLORS.length];
}

const SORTABLE_COLUMNS = [
	{ column: "checkin", label: "Entrada" },
	{ column: "checkout", label: "Saída" },
	{ column: "client_name", label: "Cliente" },
	{ column: "car_plate", label: "Matrícula" },
	{ column: "kms", label: "Kms" },
];

export default function ServicesList() {

	const navigate = useNavigate();

	const [services, setServices] = useState([]);
	const [serviceTypes, setServiceTypes] = useState([]);

	const [filters, setFilters] = useState({
		day: "",
		month: "",
		year: "",
		client_name: "",
		car_plate: "",
		car_make: "",
		car_model: "",
		service_type_id: "",
		status: "unfinished",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [sortColumn, setSortColumn] = useState(null);
	const [sortDirection, setSortDirection] = useState("asc");

	const [loading, setLoading] = useState(true);

	const [expandedIds, setExpandedIds] = useState(new Set());

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);


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


	function buildDateFilter() {
		if (!filters.year) return "";

		let date = filters.year;

		if (filters.month) date += "-" + filters.month.padStart(2, "0");
		if (filters.day) date += "-" + filters.day.padStart(2, "0");

		return date;
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			setServiceTypes(res.data.service_type_list || []);
		} catch (err) {
			console.error(err);
			setServiceTypes([]);
		}
	}


	async function loadServices() {
		try {
			setLoading(true);

			const params = {};

			const date = buildDateFilter();

			if (date) params.checkin = date;
			if (filters.client_name) params.client_name = filters.client_name;
			if (filters.car_plate) params.car_plate = filters.car_plate;
			if (filters.car_make) params.car_make = filters.car_make;
			if (filters.car_model) params.car_model = filters.car_model;
			if (filters.service_type_id) params.service_type_id = filters.service_type_id;

			if (filters.status !== "all") params.status = filters.status;

			if (sortColumn) {
				params.sort = sortColumn;
				params.dir = sortDirection;
			}

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/services", { params });

			setServices(res.data.service_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.service_list || []).length);
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	}


	useEffect(() => { loadServiceTypes(); }, []);


	useEffect(() => { loadServices(); }, [page]);

	useEffect(() => {
		if (page !== 1) {
			setPage(1);
		} else {
			loadServices();
		}
	}, [sortColumn, sortDirection]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadServices();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	function handleSort(column) {
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortColumn(column);
			setSortDirection("asc");
		}
	}


	function updateFilter(e) {
		const { name, value, type, checked } = e.target;

		let updatedValue = type === "checkbox" ? checked : value;

		if (type !== "checkbox" && ["day", "month", "year"].includes(name)) {
			updatedValue = updatedValue.replace(/\D/g, "");

			if (name === "day") updatedValue = updatedValue.slice(0, 2);
			if (name === "month") updatedValue = updatedValue.slice(0, 2);
			if (name === "year") updatedValue = updatedValue.slice(0, 4);
		}

		setFilters((prev) => {
			const updated = { ...prev, [name]: updatedValue };

			if (name === "year" && updatedValue === "") {
				updated.month = "";
				updated.day = "";
			}

			if (name === "month" && updatedValue === "") {
				updated.day = "";
			}

			return updated;
		});
	}


	function padDateField(e) {
		const { name } = e.target;

		if (!["day", "month"].includes(name)) return;

		setFilters((prev) => {
			let value = prev[name];

			if (value.length === 1) value = value.padStart(2, "0");

			return { ...prev, [name]: value };
		});
	}


	function getStatusInfo(service) {
		const isFinished = Boolean(service.is_finished);
		const isDelivered = Boolean(service.checkout);

		if (isDelivered) {
			return { rowClass: "service-delivered-row", badgeClass: "service-status-delivered", label: "Entregue" };
		}

		if (isFinished) {
			return { rowClass: "service-finished-row", badgeClass: "service-status-finished", label: "Terminado" };
		}

		return { rowClass: "", badgeClass: "service-status-pending", label: "Por terminar" };
	}


	function toggleExpanded(id) {
		setExpandedIds((prev) => {
			const next = new Set(prev);

			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}

			return next;
		});
	}


	function renderSortableHeader(column, label) {
		const isActive = sortColumn === column;

		return (
			<th className="sortable" onClick={() => handleSort(column)}>
				{label}
				<i
					className={`fa-solid ${isActive && sortDirection === "desc" ? "fa-sort-down" : isActive ? "fa-sort-up" : "fa-sort"}`}
				/>
			</th>
		);
	}


	function clearFilters() {
		setFilters({
			day: "",
			month: "",
			year: "",
			client_name: "",
			car_plate: "",
			car_make: "",
			car_model: "",
			service_type_id: "",
			status: "unfinished",
		});
	}


	function renderDesktopTable() {
		return (
			<table>
				<thead>
					<tr>
						{renderSortableHeader("checkin", "Entrada")}
						{renderSortableHeader("checkout", "Saída")}
						{renderSortableHeader("client_name", "Cliente")}
						<th>Telemóvel</th>
						{renderSortableHeader("car_plate", "Matrícula")}
						<th>Marca</th>
						<th>Modelo</th>
						<th>Tipo de Serviço</th>
						{renderSortableHeader("kms", "Kms")}
						<th>Estado</th>
					</tr>
				</thead>

				<tbody>
					{loading && services.length === 0 ? (
						<tr>
							<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
						</tr>
					) : !loading && services.length === 0 ? (
						<tr>
							<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem Serviços.</td>
						</tr>
					) : (
						services.map((service) => {
							const status = getStatusInfo(service);

							return (
								<tr
									key={service.id}
									className={status.rowClass}
									onClick={() => navigate(`/service/${service.id}`)}
								>
									<td data-label="Entrada">{service.checkin || "-"}</td>
									<td data-label="Saída">{service.checkout || "-"}</td>
									<td data-label="Cliente">{service.client_name || "-"}</td>
									<td data-label="Telemóvel">{service.client_phone || "-"}</td>
									<td data-label="Matrícula">{service.car_plate || "-"}</td>
									<td data-label="Marca">{service.car_make_name || "-"}</td>
									<td data-label="Modelo">{service.car_model_name || "-"}</td>
									<td data-label="Tipo de Serviço">{service.service_type_name || "-"}</td>
									<td data-label="Kms">{service.kms ?? "-"}</td>

									<td data-label="Estado">
										<span className={`service-status ${status.badgeClass}`}>
											{status.label}
										</span>
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		);
	}


	function renderMobileSortBar() {
		return (
			<div className="mobile-sort-bar">
				<select
					value={sortColumn || ""}
					onChange={(e) => setSortColumn(e.target.value || null)}
				>
					<option value="">Ordenar por...</option>
					{SORTABLE_COLUMNS.map(({ column, label }) => (
						<option key={column} value={column}>{label}</option>
					))}
				</select>

				<button
					className="options"
					disabled={!sortColumn}
					onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
				>
					<i className={`fa-solid fa-arrow-${sortDirection === "asc" ? "up" : "down"}-wide-short`} />
				</button>
			</div>
		);
	}


	function renderMobileList() {
		if (loading && services.length === 0) {
			return (
				<>
					{renderMobileSortBar()}
					<p className="services-empty">A Carregar...</p>
				</>
			);
		}

		if (!loading && services.length === 0) {
			return (
				<>
					{renderMobileSortBar()}
					<p className="services-empty">Sem Serviços.</p>
				</>
			);
		}

		return (
			<>
			{renderMobileSortBar()}
			<div className="services-list-mobile">
				{services.map((service) => {
					const status = getStatusInfo(service);
					const isExpanded = expandedIds.has(service.id);
					const typeAccent = getServiceTypeAccent(service.service_type_id);

					return (
						<div
							key={service.id}
							className={`service-card ${status.rowClass}`}
							style={{ borderTop: `3px solid ${typeAccent}` }}
						>
							<div className="service-card-type-label">
								{service.service_type_name || "Sem Tipo"}
							</div>

							<div className="service-card-summary" onClick={() => navigate(`/service/${service.id}`)}>
								<div className="service-card-field f-matricula">
									<span className="field-label">Matrícula</span>
									<span>{service.car_plate || "-"}</span>
								</div>

								<div className="service-card-field f-estado">
									<span className="field-label">Estado</span>
									<span className={`service-status ${status.badgeClass}`}>{status.label}</span>
								</div>

								<div className="service-card-field f-marca">
									<span className="field-label">Marca</span>
									<span>{service.car_make_name || "-"}</span>
								</div>

								<div className="service-card-field f-modelo">
									<span className="field-label">Modelo</span>
									<span>{service.car_model_name || "-"}</span>
								</div>

								<div className="service-card-field f-cliente">
									<span className="field-label">Cliente</span>
									<span>{service.client_name || "-"}</span>
								</div>

								<div className="service-card-field f-entrada">
									<span className="field-label">Entrada</span>
									<span>{service.checkin || "-"}</span>
								</div>

								<button
									className="expand-toggle"
									onClick={(e) => {
										e.stopPropagation();
										toggleExpanded(service.id);
									}}
								>
									<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"}`} />
								</button>
							</div>

							{isExpanded && (
								<div className="service-card-details" onClick={() => navigate(`/service/${service.id}`)}>
									<div className="service-card-field">
										<span className="field-label">Telemóvel</span>
										<span>{service.client_phone || "-"}</span>
									</div>

									<div className="service-card-field">
										<span className="field-label">Saída</span>
										<span>{service.checkout || "-"}</span>
									</div>

									<div className="service-card-field">
										<span className="field-label">Kms</span>
										<span>{service.kms ?? "-"}</span>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
			</>
		);
	}

	return (
		<div className="page services-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Serviços</h1>

						<ViewToggle listPath="/services" calendarPath="/services_calendar" />
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="filters">
							<input
								className="date-field"
								name="year"
								placeholder="AAAA"
								maxLength={4}
								value={filters.year}
								onChange={updateFilter}
							/>

							<input
								className="date-field"
								name="month"
								placeholder="MM"
								maxLength={2}
								value={filters.month}
								onChange={updateFilter}
								onBlur={padDateField}
								disabled={!filters.year}
							/>

							<input
								className="date-field"
								name="day"
								placeholder="DD"
								maxLength={2}
								value={filters.day}
								onChange={updateFilter}
								onBlur={padDateField}
								disabled={!filters.month}
							/>

							<input
								name="client_name"
								placeholder="Cliente"
								value={filters.client_name}
								onChange={updateFilter}
							/>

							<input
								name="car_plate"
								placeholder="Matrícula"
								value={filters.car_plate}
								onChange={updateFilter}
							/>

							<input
								name="car_make"
								placeholder="Marca"
								value={filters.car_make}
								onChange={updateFilter}
							/>

							<input
								name="car_model"
								placeholder="Modelo"
								value={filters.car_model}
								onChange={updateFilter}
							/>

							<select
								name="service_type_id"
								value={filters.service_type_id}
								onChange={updateFilter}
							>
								<option value="">Tipo de Serviço</option>
								{serviceTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>

							<select
								name="status"
								value={filters.status}
								onChange={updateFilter}
							>
								<option value="all">Todos</option>
								<option value="unfinished">Por Terminar</option>
								<option value="finished">Terminados</option>
								<option value="delivered">Entregues</option>
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							<button className="confirm" onClick={() => navigate("/services/new")}>
								<i className="fa-solid fa-plus" /> Adicionar Serviço
							</button>
						</div>

						{isMobile ? renderMobileList() : renderDesktopTable()}

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} serviços)</span>

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
