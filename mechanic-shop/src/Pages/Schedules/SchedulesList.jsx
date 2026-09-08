import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/SchedulesList.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";

const PER_PAGE = 10;

const SERVICE_TYPE_COLORS = ["#2563eb", "#e8aa2e", "#ba2323", "#22c55e", "#a3540a", "#e823d1"];

function getServiceTypeAccent(serviceTypeId) {
	if (!serviceTypeId) return "#cbd5e1";
	return SERVICE_TYPE_COLORS[serviceTypeId % SERVICE_TYPE_COLORS.length];
}

const SORTABLE_COLUMNS = [
	{ column: "date", label: "Data" },
	{ column: "client_name", label: "Cliente" },
	{ column: "car_plate", label: "Matrícula" },
];

export default function SchedulesList() {

	const navigate = useNavigate();

	const [schedules, setSchedules] = useState([]);
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
		status: "all",
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
			showMessage("error", "Something went wrong.");
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


	async function loadSchedules() {
		try {
			setLoading(true);

			const params = {};

			const date = buildDateFilter();

			if (date) params.date = date;
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

			const res = await api.get("/schedules", { params });

			setSchedules(res.data.schedule_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.schedule_list || []).length);
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	}


	useEffect(() => { loadServiceTypes(); }, []);


	useEffect(() => { loadSchedules(); }, [page]);

	useEffect(() => {
		if (page !== 1) {
			setPage(1);
		} else {
			loadSchedules();
		}
	}, [sortColumn, sortDirection]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadSchedules();
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
		const { name, value } = e.target;

		let updatedValue = value;

		if (["day", "month", "year"].includes(name)) {
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


	function getStatusInfo(schedule) {
		if (schedule.service_checkout) {
			return { rowClass: "schedule-delivered-row", badgeClass: "schedule-status-delivered", label: "Entregue" };
		}

		if (schedule.service_is_finished === 1) {
			return { rowClass: "schedule-finished-row", badgeClass: "schedule-status-finished", label: "Terminado" };
		}

		if (schedule.service_id !== null) {
			return { rowClass: "schedule-with-service-row", badgeClass: "schedule-status-with-service", label: "Com Serviço" };
		}

		return { rowClass: "", badgeClass: "schedule-status-without-service", label: "Sem Serviço" };
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
			status: "all",
		});
	}


	function renderDesktopTable() {
		return (
			<table>
				<thead>
					<tr>
						{renderSortableHeader("date", "Data")}
						{renderSortableHeader("client_name", "Cliente")}
						<th>Telemóvel</th>
						{renderSortableHeader("car_plate", "Matrícula")}
						<th>Marca</th>
						<th>Modelo</th>
						<th>Tipo de Serviço</th>
						<th>Descrição</th>
						<th>Estado</th>
					</tr>
				</thead>

				<tbody>
					{loading && schedules.length === 0 ? (
						<tr>
							<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
						</tr>
					) : !loading && schedules.length === 0 ? (
						<tr>
							<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem Marcações.</td>
						</tr>
					) : (
						schedules.map((schedule) => {
							const status = getStatusInfo(schedule);

							return (
								<tr
									key={schedule.id}
									className={status.rowClass}
									onClick={() => navigate(`/schedules/${schedule.id}`)}
								>
									<td data-label="Data">{schedule.date || "-"}</td>
									<td data-label="Cliente">{schedule.client_name || "-"}</td>
									<td data-label="Telemóvel">{schedule.client_phone || "-"}</td>
									<td data-label="Matrícula">{schedule.car_plate || "-"}</td>
									<td data-label="Marca">{schedule.car_make || "-"}</td>
									<td data-label="Modelo">{schedule.car_model || "-"}</td>
									<td data-label="Tipo de Serviço">{schedule.service_type_name || "-"}</td>
									<td data-label="Descrição">{schedule.description || "-"}</td>

									<td data-label="Estado">
										<span className={`schedule-status ${status.badgeClass}`}>
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
		if (loading && schedules.length === 0) {
			return (
				<>
					{renderMobileSortBar()}
					<p className="schedules-empty">A Carregar...</p>
				</>
			);
		}

		if (!loading && schedules.length === 0) {
			return (
				<>
					{renderMobileSortBar()}
					<p className="schedules-empty">Sem Marcações.</p>
				</>
			);
		}

		return (
			<>
			{renderMobileSortBar()}
			<div className="schedules-list-mobile">
				{schedules.map((schedule) => {
					const status = getStatusInfo(schedule);
					const isExpanded = expandedIds.has(schedule.id);
					const typeAccent = getServiceTypeAccent(schedule.service_type_id);

					return (
						<div
							key={schedule.id}
							className={`schedule-card ${status.rowClass}`}
							style={{ borderTop: `3px solid ${typeAccent}` }}
						>
							<div className="schedule-card-type-label">
								{schedule.service_type_name || "Sem Tipo"}
							</div>

							<div className="schedule-card-summary" onClick={() => navigate(`/schedules/${schedule.id}`)}>
								<div className="schedule-card-field f-matricula">
									<span className="field-label">Matrícula</span>
									<span>{schedule.car_plate || "-"}</span>
								</div>

								<div className="schedule-card-field f-estado">
									<span className="field-label">Estado</span>
									<span className={`schedule-status ${status.badgeClass}`}>{status.label}</span>
								</div>

								<div className="schedule-card-field f-marca">
									<span className="field-label">Marca</span>
									<span>{schedule.car_make || "-"}</span>
								</div>

								<div className="schedule-card-field f-modelo">
									<span className="field-label">Modelo</span>
									<span>{schedule.car_model || "-"}</span>
								</div>

								<div className="schedule-card-field f-cliente">
									<span className="field-label">Cliente</span>
									<span>{schedule.client_name || "-"}</span>
								</div>

								<div className="schedule-card-field f-data">
									<span className="field-label">Data</span>
									<span>{schedule.date || "-"}</span>
								</div>

								<button
									className="expand-toggle"
									onClick={(e) => {
										e.stopPropagation();
										toggleExpanded(schedule.id);
									}}
								>
									<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"}`} />
								</button>
							</div>

							{isExpanded && (
								<div className="schedule-card-details" onClick={() => navigate(`/schedules/${schedule.id}`)}>
									<div className="schedule-card-field">
										<span className="field-label">Telemóvel</span>
										<span>{schedule.client_phone || "-"}</span>
									</div>

									<div className="schedule-card-field">
										<span className="field-label">Descrição</span>
										<span>{schedule.description || "-"}</span>
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
		<div className="page schedules-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-days" />
						<h1>Marcações</h1>

						<ViewToggle listPath="/schedules" calendarPath="/schedules_calendar" />
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
								<option value="all">Todos os Estados</option>
								<option value="without_service">Sem Serviço</option>
								<option value="with_service">Com Serviço</option>
								<option value="finished">Terminado</option>
								<option value="delivered">Entregue</option>
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							<button className="confirm" onClick={() => navigate("/schedules/new")}>
								<i className="fa-solid fa-plus" /> Adicionar Marcação
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

							<span>Página {page} de {totalPages} ({total} marcações)</span>

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
