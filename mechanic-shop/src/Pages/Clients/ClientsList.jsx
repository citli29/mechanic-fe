// Clientes: card list like Viaturas. Card click → cliente page; ⌄ shows
// the details in place (Editar from there); Apagar is on the cliente page.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useFilterChange, useUrlParam, useUrlState } from "../../utils/useUrlState";
import { applyIdSearch } from "../../utils/idSearch";
import { ClientCard, ClientDetails, ClientForm } from "./ClientCard";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Cars/Style/CarsList.css"; // search bar, filters, list, empty state
import "./Style/ClientsList.css";

const PER_PAGE = 10;

const emptyFilters = { name: "", phone: "", email: "" };

export default function ClientsList() {

	const requestIdRef = useRef(0);

	const [clients, setClients] = useState([]);

	// Filters + page live in the URL: ← back restores them.
	const [filters, setFilters] = useUrlState(emptyFilters);
	const [page, setPage] = useUrlParam("p", 1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	// One form at a time: a new client, or the one being edited.
	const [creating, setCreating] = useState(false);
	const [editingId, setEditingId] = useState(null);
	// Card opened read-only with ⌄.
	const [expandedId, setExpandedId] = useState(null);

	// Phone: the search's placeholder is just "Nome".
	const [isMobile, setIsMobile] = useState(
		() => window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");
		const onChange = (e) => setIsMobile(e.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);


	useEffect(() => { loadClients(); }, [page]);

	useFilterChange(filters, () => {
		if (page !== 1) setPage(1);
		else loadClients();
	});


	async function loadClients() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			applyIdSearch(params);
			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/clients", { params });

			if (requestId !== requestIdRef.current) return;

			setClients(res.data.client_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.client_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setClients([]);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function clearFilters() {
		setFilters(emptyFilters);
	}


	function editClient(client) {
		setCreating(false);
		setExpandedId(null);
		setEditingId(client.id);
	}


	const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;


	function renderClient(client) {
		const isExpanded = expandedId === client.id;
		const toggle = () => setExpandedId(isExpanded ? null : client.id);

		return (
			<ClientCard
				key={client.id}
				client={client}
				to={`/clients/${client.id}`}
				className={isExpanded ? "is-expanded" : ""}
				history={{
					count: client.service_count,
					carCount: client.car_count,
					lastDate: client.last_checkin_date,
					lastCarPlate: client.last_car_plate,
				}}
				actions={
					<button
						className="options car-expand"
						aria-expanded={isExpanded}
						title={isExpanded ? "Esconder detalhes" : "Ver detalhes"}
						aria-label={isExpanded ? "Esconder detalhes" : "Ver detalhes"}
						onClick={toggle}
					>
						<i className="fa-solid fa-chevron-down" />
					</button>
				}
			>
				{isExpanded && (
					<ClientDetails
						client={client}
						actions={
							<>
								<button className="options" onClick={() => editClient(client)}>
									<i className="fa-solid fa-pencil" /> Editar
								</button>
								<Link className="confirm" to={`/clients/${client.id}`}>
									<i className="fa-solid fa-arrow-up-right-from-square" /> Abrir cliente
								</Link>
							</>
						}
					/>
				)}
			</ClientCard>
		);
	}


	return (
		<div className="page cars-page clients-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-users" />
						<h1>Clientes</h1>
						<span className="cars-total">{total} {total === 1 ? "cliente" : "clientes"}</span>
					</div>

					<div className="body">

						<div className="cars-toolbar">
							<div className="cars-search">
								<i className="fa-solid fa-magnifying-glass" />
								<input
									name="name"
									placeholder={isMobile ? "Nome" : "Pesquisar por nome..."}
									value={filters.name}
									onChange={updateFilter}
									autoComplete="off"
								/>
								{filters.name && (
									<button
										className="cars-search-clear"
										title="Limpar nome"
										aria-label="Limpar nome"
										onClick={() => setFilters({ ...filters, name: "" })}
									>
										<i className="fa-solid fa-xmark" />
									</button>
								)}
							</div>

							{!creating && (
								<button
									className="confirm cars-add"
									onClick={() => {
										setEditingId(null);
										setExpandedId(null);
										setCreating(true);
									}}
								>
									<i className="fa-solid fa-plus" /> <span>Adicionar Cliente</span>
								</button>
							)}
						</div>

						<div className="filters cars-filters clients-filters">
							<input
								name="phone"
								placeholder="Telemóvel"
								inputMode="tel"
								value={filters.phone}
								onChange={updateFilter}
							/>

							<input
								name="email"
								placeholder="Email"
								inputMode="email"
								value={filters.email}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters} disabled={activeFilterCount === 0}>
								<i className="fa-solid fa-broom" /> <span>Limpar</span>
							</button>
						</div>

						<div className="cars-list">
							{creating && (
								<ClientForm
									client={null}
									title="Novo cliente"
									onSaved={() => { setCreating(false); loadClients(); }}
									onCancel={() => setCreating(false)}
								/>
							)}

							{clients.map((client) => (
								editingId === client.id ? (
									<ClientForm
										key={client.id}
										client={client}
										title={`Editar ${client.name}`}
										onSaved={() => { setEditingId(null); loadClients(); }}
										onCancel={() => setEditingId(null)}
									/>
								) : (
									renderClient(client)
								)
							))}

							{clients.length === 0 && !creating && (
								<div className="cars-empty">
									<i className="fa-solid fa-user-slash" />
									<p>{activeFilterCount > 0 ? "Nenhum cliente encontrado com estes filtros." : "Ainda não há clientes."}</p>
									{activeFilterCount > 0 && (
										<button className="options" onClick={clearFilters}>
											<i className="fa-solid fa-broom" /> Limpar filtros
										</button>
									)}
								</div>
							)}
						</div>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} clientes)</span>

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
