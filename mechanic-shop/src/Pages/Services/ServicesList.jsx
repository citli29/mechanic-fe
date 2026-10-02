import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesList.css";
import ViewToggle from "../../components/ViewToggle/ViewToggle";
import ServiceTypeBadge from "../../components/ServiceTypeBadge/ServiceTypeBadge";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";

const PER_PAGE = 30;

const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// "2026-09-08" -> "08 Set" (plus the year when it isn't this year) — the
// phone rows have room for a short date, not the full ISO one.
function formatShortDate(isoDate) {
	if (!isoDate) return null;

	const [year, month, day] = isoDate.split("-");
	if (!day) return isoDate;

	const label = `${day} ${SHORT_MONTHS[Number(month) - 1]}`;
	return Number(year) === new Date().getFullYear() ? label : `${label} ${year}`;
}

const SORTABLE_COLUMNS = [
	{ column: "id", label: "ID" },
	{ column: "cluster_nr", label: "Nr. Associação" },
	{ column: "checkin", label: "Entrada" },
	{ column: "checkout", label: "Saída" },
	{ column: "client_name", label: "Cliente" },
	{ column: "client_phone", label: "Telemóvel" },
	{ column: "car_plate", label: "Matrícula" },
	{ column: "car_make_name", label: "Marca" },
	{ column: "car_model_name", label: "Modelo" },
	{ column: "service_type_name", label: "Tipo de Serviço" },
	{ column: "kms", label: "Kms" },
	{ column: "status", label: "Estado" },
];

const DEFAULT_FILTERS = {
	day: "",
	month: "",
	year: "",
	client_name: "",
	car_plate: "",
	car_make: "",
	car_model: "",
	service_type_id: "",
	status: "unfinished",
};

// The list's view (filters, sort, page) lives in the URL too, so reloading,
// going back from a service, or sharing the link keeps it — only values
// that differ from the defaults are written, to keep the URL short.
function readViewFromUrl(searchParams) {
	const filters = { ...DEFAULT_FILTERS };

	for (const key of Object.keys(DEFAULT_FILTERS)) {
		if (searchParams.has(key)) filters[key] = searchParams.get(key);
	}

	const sort = searchParams.get("sort");

	return {
		filters,
		page: Math.max(1, Number(searchParams.get("p")) || 1),
		sortColumn: SORTABLE_COLUMNS.some(({ column }) => column === sort) ? sort : null,
		sortDirection: searchParams.get("dir") === "desc" ? "desc" : "asc",
	};
}

function writeViewToUrl({ filters, page, sortColumn, sortDirection }) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(filters)) {
		if (value !== DEFAULT_FILTERS[key]) params.set(key, value);
	}

	if (sortColumn) {
		params.set("sort", sortColumn);
		params.set("dir", sortDirection);
	}

	if (page > 1) params.set("p", page);

	return params;
}

export default function ServicesList() {

	const [searchParams, setSearchParams] = useSearchParams();
	const [initialView] = useState(() => readViewFromUrl(searchParams));

	const [services, setServices] = useState([]);
	const [serviceTypes, setServiceTypes] = useState([]);

	const [filters, setFilters] = useState(initialView.filters);
	// What the list is actually loaded with — trails `filters` by a short
	// pause so typing in a filter box doesn't fire a request per keystroke.
	const [debouncedFilters, setDebouncedFilters] = useState(initialView.filters);

	const [page, setPage] = useState(initialView.page);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [sortColumn, setSortColumn] = useState(initialView.sortColumn);
	const [sortDirection, setSortDirection] = useState(initialView.sortDirection);

	const [loading, setLoading] = useState(true);
	const requestIdRef = useRef(0);


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


	function buildDateFilter(filters) {
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
		// Only the latest request may update the list — a slow, older one
		// (e.g. the previous page) must not overwrite a newer result.
		const requestId = ++requestIdRef.current;
		const filters = debouncedFilters;

		try {
			setLoading(true);

			// Whole associations: if a filter matches any service of an
			// association, the backend returns all of its services, so the
			// list never shows just part of one.
			const params = { group_associations: 1 };

			const date = buildDateFilter(filters);

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

			if (requestId !== requestIdRef.current) return;

			setServices(res.data.service_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.service_list || []).length);
		} catch (err) {
			if (requestId === requestIdRef.current) handleApiError(err);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	useEffect(() => { loadServiceTypes(); }, []);

	useEffect(() => {
		if (filters === debouncedFilters) return;

		const timer = setTimeout(() => setDebouncedFilters(filters), 400);
		return () => clearTimeout(timer);
	}, [filters]);

	useEffect(() => {
		loadServices();
		setSearchParams(
			writeViewToUrl({ filters: debouncedFilters, page, sortColumn, sortDirection }),
			{ replace: true }
		);
	}, [page, sortColumn, sortDirection, debouncedFilters]);


	// A new sort or filter starts back on page 1 — done right where the
	// user changes it (not in an effect), so a page number that came from
	// the URL on load isn't thrown away.
	function handleSort(column) {
		setPage(1);

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

		setPage(1);
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


	// An association's size and status come from the backend (every member
	// counted, not just the ones on this page) — falling back to the page's
	// own members if a response ever lacks them.
	function getClusterSize(group) {
		return group.representative.cluster_size || group.pageMembers.length;
	}

	function getClusterStatusInfo(group) {
		const rank = group.representative.cluster_status_rank;
		if (rank == null) return getGroupStatusInfo(group.pageMembers);

		return getStatusInfo({ checkout: rank >= 2, is_finished: rank >= 1 });
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


	// The associations endpoint returns the *other* members only — the
	// collapsed row's own service (the representative) is added back in, so
	// the expanded list shows every service that makes up the association.
	function getClusterMembers(group, mates) {
		const representative = { ...group.representative, service_id: group.representative.id };
		const others = mates.filter((mate) => mate.service_id !== representative.service_id);

		return [representative, ...others].sort((a, b) => a.service_id - b.service_id);
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


	// The ID column holds both kinds of number — a service id, or an
	// association nr on a collapsed association row — so its header has
	// one sort toggle for each.
	function renderIdHeader() {
		function renderPart(column, label, title) {
			const isActive = sortColumn === column;

			return (
				<span
					className={`sort-part ${isActive ? "active" : ""}`}
					title={title}
					onClick={() => handleSort(column)}
				>
					{label}
					<i className={`fa-solid ${isActive && sortDirection === "desc" ? "fa-sort-down" : isActive ? "fa-sort-up" : "fa-sort"}`} />
				</span>
			);
		}

		return (
			<th className="sortable-split">
				{renderPart("id", "ID", "Ordenar por nº de serviço")}
				{renderPart("cluster_nr", <i className="fa-solid fa-link sort-part-icon" />, "Ordenar por nº de associação")}
			</th>
		);
	}


	function clearFilters() {
		setPage(1);
		setFilters(DEFAULT_FILTERS);
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
						{renderIdHeader()}
						{renderSortableHeader("checkin", "Entrada")}
						{renderSortableHeader("checkout", "Saída")}
						{renderSortableHeader("client_name", "Cliente")}
						{renderSortableHeader("client_phone", "Telemóvel")}
						{renderSortableHeader("car_plate", "Matrícula")}
						{renderSortableHeader("car_make_name", "Marca")}
						{renderSortableHeader("car_model_name", "Modelo")}
						{renderSortableHeader("service_type_name", "Tipo de Serviço")}
						{renderSortableHeader("kms", "Kms")}
						{renderSortableHeader("status", "Estado")}
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
							const isCluster = group.clusterNr != null && getClusterSize(group) > 1;
							const status = isCluster ? getClusterStatusInfo(group) : getStatusInfo(group.representative);
							const isExpanded = expandedClusters.has(group.clusterNr);

							const groupRow = renderServiceRow({
								key: group.key,
								id: group.representative.id,
								data: group.representative,
								status,
								className: `${status.rowClass} ${isCluster ? "cluster-row" : ""}`,
								// The collapsed row stands for the whole association, not
								// for the one service whose data fills its other cells.
								typeContent: isCluster ? <ServiceTypeBadge label="Associação" /> : undefined,
								idContent: isCluster ? (
									<button
										type="button"
										className="cluster-toggle"
										title={`Associação #${group.clusterNr} — ${getClusterSize(group)} serviços`}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleCluster(group);
										}}
									>
										<i className={`fa-solid fa-chevron-${isExpanded ? "down" : "right"}`} />
										<span>{getClusterSize(group)} - #{group.clusterNr}</span>
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

							const memberRows = getClusterMembers(group, mates)
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
					onChange={(e) => {
						setPage(1);
						setSortColumn(e.target.value || null);
					}}
				>
					<option value="">Ordenar por...</option>
					{SORTABLE_COLUMNS.map(({ column, label }) => (
						<option key={column} value={column}>{label}</option>
					))}
				</select>

				<button
					className="options"
					disabled={!sortColumn}
					onClick={() => {
						setPage(1);
						setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
					}}
				>
					<i className={`fa-solid fa-arrow-${sortDirection === "asc" ? "up" : "down"}-wide-short`} />
				</button>
			</div>
		);
	}


	// Phone list: compact two-line rows instead of cards — plate and car on
	// top, client and date underneath, status on the right, and the service
	// type as a coloured stripe down the left edge. Tapping opens the service.
	function renderMobileRow({ key, id, data, status, accent, idLabel, typeLabel, clusterToggle }) {
		const car = [data.car_make_name, data.car_model_name].filter(Boolean).join(" ");
		const subtitle = [data.client_name, formatShortDate(data.checkin)].filter(Boolean).join(" · ");

		return (
			<div key={key} className={`service-row ${status.rowClass}`} style={{ "--type-color": accent }}>
				<Link className="service-row-main" to={`/services/${id}`}>
					<div className="service-row-line">
						<span className={`service-row-plate ${data.car_plate ? "" : "empty"}`}>
							{data.car_plate || "Sem viatura"}
						</span>
						{car && <span className="service-row-car">{car}</span>}
						<span className={`service-status ${status.badgeClass}`}>{status.label}</span>
					</div>

					<div className="service-row-line service-row-sub">
						<span className="service-row-client">{subtitle || "Sem cliente"}</span>
						{typeLabel && <span className="service-row-type-label">{typeLabel}</span>}
						<span className="service-row-id">{idLabel}</span>
					</div>
				</Link>

				{clusterToggle}
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
					const isCluster = group.clusterNr != null && getClusterSize(group) > 1;
					const representative = group.representative;
					const status = isCluster ? getClusterStatusInfo(group) : getStatusInfo(representative);
					const isExpanded = expandedClusters.has(group.clusterNr);
					const mates = isCluster ? clusterMembersCache[group.clusterNr] : null;

					const row = renderMobileRow({
						key: group.key,
						id: representative.id,
						data: representative,
						status,
						accent: isCluster
							? getServiceTypeAccent(null, "Associação")
							: getServiceTypeAccent(representative.service_type_id, representative.service_type_name),
						idLabel: isCluster ? `Associação #${group.clusterNr}` : `#${representative.id}`,
						// Single services also name their type, so the stripe's colour
						// doesn't have to be remembered.
						typeLabel: isCluster ? null : (representative.service_type_name || "Sem Tipo"),
						clusterToggle: isCluster && (
							<button
								type="button"
								className="service-row-cluster-toggle"
								aria-label={isExpanded ? "Esconder serviços associados" : "Mostrar serviços associados"}
								onClick={() => toggleCluster(group)}
							>
								<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"}`} />
								<span>{getClusterSize(group)}</span>
							</button>
						),
					});

					if (!isCluster || !isExpanded) return row;

					return (
						<div key={group.key} className="service-row-group">
							{row}

							<div className="service-row-members">
								{!mates ? (
									<p className="services-empty">
										<i className="fa-solid fa-spinner fa-spin" /> A carregar serviços associados...
									</p>
								) : (
									getClusterMembers(group, mates).map((member) => {
										const memberStatus = getStatusInfo(member);
										const accent = getServiceTypeAccent(member.service_type_id, member.service_type_name);

										return (
											<Link
												key={member.service_id}
												className={`service-row-member ${memberStatus.rowClass}`}
												to={`/services/${member.service_id}`}
											>
												<span className="service-row-id">#{member.service_id}</span>
												<span className="service-row-type" style={{ "--type-color": accent }}>
													{member.service_type_name || "Sem Tipo"}
												</span>
												<span className={`service-status ${memberStatus.badgeClass}`}>{memberStatus.label}</span>
											</Link>
										);
									})
								)}
							</div>
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
