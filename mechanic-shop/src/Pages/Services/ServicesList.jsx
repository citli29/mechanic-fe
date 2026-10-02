import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesList.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";
import ServiceTypeBadge from "../../components/ServiceTypeBadge/ServiceTypeBadge";

const PER_PAGE = 30;

const SORTABLE_COLUMNS = [
	{ column: "checkin", label: "Entrada" },
	{ column: "checkout", label: "Saída" },
	{ column: "client_name", label: "Cliente" },
	{ column: "car_plate", label: "Matrícula" },
	{ column: "kms", label: "Kms" },
];

export default function ServicesList() {

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

	// Associated services collapse into one row/card. Expanding one is
	// lazy — the current page's own data only has whichever members
	// happen to also be on this page (and can be missing fields like
	// kms/phone the cluster-mates endpoint fills in), so the authoritative
	// member list is fetched once per cluster on first expand and cached.
	const [expandedClusters, setExpandedClusters] = useState(new Set());
	const [clusterMembersCache, setClusterMembersCache] = useState({});
	const [loadingClusters, setLoadingClusters] = useState(new Set());

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);

	function handleApiError(err) {
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


	// Delivered > finished > pending — a cluster shows as advanced as its
	// least-progressed member, since from the shop's point of view the car
	// isn't really done until every associated job on it is.
	function statusRank(service) {
		if (service.checkout) return 2;
		if (service.is_finished) return 1;
		return 0;
	}


	function getGroupStatusInfo(members) {
		const leastProgressed = members.reduce(
			(worst, member) => (statusRank(member) < statusRank(worst) ? member : worst),
			members[0]
		);

		return getStatusInfo(leastProgressed);
	}


	// Groups whatever cluster members happen to be on this page together —
	// may be incomplete (other members could be on another page, or hidden
	// by the current filters), which is exactly why expanding a group
	// fetches the authoritative member list instead of trusting this.
	function groupServices(list) {
		const groups = [];
		const seen = new Set();

		for (const service of list) {
			if (seen.has(service.id)) continue;
			seen.add(service.id);

			if (service.cluster_nr == null) {
				groups.push({ key: `s-${service.id}`, clusterNr: null, representative: service, pageMembers: [service] });
				continue;
			}

			const pageMembers = [service];

			for (const other of list) {
				if (other.id !== service.id && other.cluster_nr === service.cluster_nr && !seen.has(other.id)) {
					pageMembers.push(other);
					seen.add(other.id);
				}
			}

			pageMembers.sort((a, b) => a.id - b.id);

			groups.push({ key: `c-${service.cluster_nr}`, clusterNr: service.cluster_nr, representative: pageMembers[0], pageMembers });
		}

		return groups;
	}


	async function loadClusterMembers(representativeId, clusterNr) {
		if (clusterMembersCache[clusterNr] || loadingClusters.has(clusterNr)) return;

		setLoadingClusters((prev) => new Set(prev).add(clusterNr));

		try {
			const res = await api.get(`/services/${representativeId}/associations`);
			setClusterMembersCache((prev) => ({ ...prev, [clusterNr]: res.data.cluster_mate_list || [] }));
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingClusters((prev) => {
				const next = new Set(prev);
				next.delete(clusterNr);
				return next;
			});
		}
	}


	function toggleCluster(group) {
		const isCurrentlyExpanded = expandedClusters.has(group.clusterNr);

		setExpandedClusters((prev) => {
			const next = new Set(prev);

			if (next.has(group.clusterNr)) {
				next.delete(group.clusterNr);
			} else {
				next.add(group.clusterNr);
			}

			return next;
		});

		if (!isCurrentlyExpanded) {
			loadClusterMembers(group.representative.id, group.clusterNr);
		}
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


	// Shared by the normal/group row and the indented cluster-member rows —
	// same 11 cells either way, just different data, status and whatever
	// goes in the ID column (a plain id, or the cluster toggle + cluster
	// number for a group row).
	function renderServiceRow({ key, id, data, status, className, idContent, typeContent }) {
		return (
			<tr key={key} className={className}>
				<td data-label="ID">
					<Link className="row-link-overlay" to={`/services/${id}`} aria-hidden="true" tabIndex={-1} />
					{idContent}
				</td>
				<td data-label="Entrada"><span className="cell-truncate" title={data.checkin || "-"}>{data.checkin || "-"}</span></td>
				<td data-label="Saída"><span className="cell-truncate" title={data.checkout || "-"}>{data.checkout || "-"}</span></td>
				<td data-label="Cliente"><span className="cell-truncate" title={data.client_name || "-"}>{data.client_name || "-"}</span></td>
				<td data-label="Telemóvel"><span className="cell-truncate" title={data.client_phone || "-"}>{data.client_phone || "-"}</span></td>
				<td data-label="Matrícula"><span className="cell-truncate" title={data.car_plate || "-"}>{data.car_plate || "-"}</span></td>
				<td data-label="Marca"><span className="cell-truncate" title={data.car_make_name || "-"}>{data.car_make_name || "-"}</span></td>
				<td data-label="Modelo"><span className="cell-truncate" title={data.car_model_name || "-"}>{data.car_model_name || "-"}</span></td>
				<td data-label="Tipo de Serviço">
					{typeContent ?? <ServiceTypeBadge serviceTypeId={data.service_type_id} label={data.service_type_name} />}
				</td>
				<td data-label="Kms"><span className="cell-truncate" title={data.kms ?? "-"}>{data.kms ?? "-"}</span></td>
				<td data-label="Estado">
					<span className={`service-status ${status.badgeClass}`}>{status.label}</span>
				</td>
			</tr>
		);
	}


	function renderDesktopTable() {
		const groups = groupServices(services);

		return (
			<table>
				<thead>
					<tr>
						<th>ID</th>
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
						groups.flatMap((group) => {
							const isCluster = group.clusterNr != null && group.pageMembers.length > 1;
							const status = isCluster ? getGroupStatusInfo(group.pageMembers) : getStatusInfo(group.representative);
							const isExpanded = expandedClusters.has(group.clusterNr);

							const groupRow = renderServiceRow({
								key: group.key,
								id: group.representative.id,
								data: group.representative,
								status,
								className: `${status.rowClass} ${isCluster ? "cluster-row" : ""}`,
								idContent: isCluster ? (
									<button
										type="button"
										className="cluster-toggle"
										title={`Associação #${group.clusterNr} — ${group.pageMembers.length} serviços`}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleCluster(group);
										}}
									>
										<i className={`fa-solid fa-chevron-${isExpanded ? "down" : "right"}`} />
										<span>{group.pageMembers.length} - #{group.clusterNr}</span>
									</button>
								) : (
									<span className="cell-truncate">#{group.representative.id}</span>
								),
							});

							if (!isCluster || !isExpanded) return [groupRow];

							const mates = clusterMembersCache[group.clusterNr];

							if (!mates) {
								return [
									groupRow,
									<tr key={`${group.key}-loading`} className="cluster-member-row">
										<td data-label="" style={{ gridColumn: "1 / -1" }}>
											<i className="fa-solid fa-spinner fa-spin" /> A carregar serviços associados...
										</td>
									</tr>,
								];
							}

							const memberRows = mates
								.slice()
								.sort((a, b) => a.service_id - b.service_id)
								.map((member) => {
									const memberStatus = getStatusInfo(member);

									return renderServiceRow({
										key: `${group.key}-${member.service_id}`,
										id: member.service_id,
										data: member,
										status: memberStatus,
										className: `cluster-member-row ${memberStatus.rowClass}`,
										idContent: <span className="cluster-member-id">#{member.service_id}</span>,
									});
								});

							return [groupRow, ...memberRows];
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


	// Shared by the representative card and the nested member cards — same
	// layout either way, just different data/status and an optional cluster
	// toggle injected next to the type badge.
	function renderMobileCard({ id, data, status, className = "", clusterToggle }) {
		const isExpanded = expandedIds.has(id);

		return (
			<div key={id} className={`service-card ${status.rowClass} ${className}`}>
				<div className="service-card-type-label">
					<ServiceTypeBadge serviceTypeId={data.service_type_id} label={data.service_type_name} />
					{clusterToggle}
				</div>

				<Link className="service-card-summary" to={`/services/${id}`}>
					<div className="service-card-field f-matricula">
						<span className="field-label">Matrícula</span>
						<span>{data.car_plate || "-"}</span>
					</div>

					<div className="service-card-field f-estado">
						<span className="field-label">Estado</span>
						<span className={`service-status ${status.badgeClass}`}>{status.label}</span>
					</div>

					<div className="service-card-field f-marca">
						<span className="field-label">Marca</span>
						<span>{data.car_make_name || "-"}</span>
					</div>

					<div className="service-card-field f-modelo">
						<span className="field-label">Modelo</span>
						<span>{data.car_model_name || "-"}</span>
					</div>

					<div className="service-card-field f-cliente">
						<span className="field-label">Cliente</span>
						<span>{data.client_name || "-"}</span>
					</div>

					<div className="service-card-field f-entrada">
						<span className="field-label">Entrada</span>
						<span>{data.checkin || "-"}</span>
					</div>

					<button
						className="expand-toggle"
						onClick={(e) => {
							e.stopPropagation();
							toggleExpanded(id);
						}}
					>
						<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"}`} />
					</button>
				</Link>

				{isExpanded && (
					<Link className="service-card-details" to={`/services/${id}`}>
						<div className="service-card-field">
							<span className="field-label">Telemóvel</span>
							<span>{data.client_phone || "-"}</span>
						</div>

						<div className="service-card-field">
							<span className="field-label">Saída</span>
							<span>{data.checkout || "-"}</span>
						</div>

						<div className="service-card-field">
							<span className="field-label">Kms</span>
							<span>{data.kms ?? "-"}</span>
						</div>
					</Link>
				)}
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
				{groupServices(services).map((group) => {
					const isCluster = group.clusterNr != null && group.pageMembers.length > 1;
					const status = isCluster ? getGroupStatusInfo(group.pageMembers) : getStatusInfo(group.representative);
					const isExpanded = expandedClusters.has(group.clusterNr);
					const mates = isCluster ? clusterMembersCache[group.clusterNr] : null;

					return (
						<div key={group.key} className="service-cluster-group">
							{renderMobileCard({
								id: group.representative.id,
								data: group.representative,
								status,
								clusterToggle: isCluster && (
									<button
										type="button"
										className="cluster-toggle-mobile"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleCluster(group);
										}}
									>
										<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"}`} />
										{group.pageMembers.length} associados
									</button>
								),
							})}

							{isCluster && isExpanded && (
								<div className="cluster-member-cards">
									{!mates ? (
										<p className="services-empty">
											<i className="fa-solid fa-spinner fa-spin" /> A carregar serviços associados...
										</p>
									) : (
										mates
											.slice()
											.sort((a, b) => a.service_id - b.service_id)
											.map((member) => renderMobileCard({
												id: member.service_id,
												data: member,
												status: getStatusInfo(member),
												className: "cluster-member-card",
											}))
									)}
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

							<Link className="confirm" to="/services/new">
								<i className="fa-solid fa-plus" /> Adicionar Serviço
							</Link>
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
