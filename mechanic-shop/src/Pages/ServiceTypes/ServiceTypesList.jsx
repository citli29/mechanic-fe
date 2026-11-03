import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { useFilterChange, useUrlParam, useUrlState } from "../../utils/useUrlState";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServiceTypesList.css";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 10;

// Types with is_locked = 1 (Mecânica, Laboratório, Deslocações, Eletricidade)
// have their own rules in the code and triggers (lab section, kms rule,
// calendar sections, ...), so the DB refuses to rename or delete them. They
// are listed here read-only; new types created here are plain ones.
const LOCKED_TITLE = "Tipo do sistema: tem regras próprias e não pode ser alterado nem apagado.";

export default function ServiceTypesList() {

	const requestIdRef = useRef(0);

	const [serviceTypes, setServiceTypes] = useState([]);

	const [filters, setFilters] = useUrlState({ name: "" });

	const [page, setPage] = useUrlParam("p", 1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");


	useEffect(() => { loadServiceTypes(); }, [page]);

	// Only on a real change: filters restored from the URL keep their page.
	useFilterChange(filters, () => {
		if (page !== 1) setPage(1);
		else loadServiceTypes();
	});


	async function loadServiceTypes() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);
			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/service_types", { params });

			if (requestId !== requestIdRef.current) return;

			const list = res.data.service_type_list || [];
			setServiceTypes(list);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? list.length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setServiceTypes([]);
		}
	}


	async function createServiceType() {
		if (!newName.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.post("/service_types", { name: newName.trim() });

			pushSuccessToast("Tipo de serviço criado com sucesso.");

			setNewName("");
			setCreating(false);

			loadServiceTypes();
		} catch (err) {
			console.error(err);
		}
	}


	async function saveServiceType() {
		if (!editing.name.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.put(`/service_types/${editing.id}`, { name: editing.name.trim() });

			pushSuccessToast("Tipo de serviço atualizado com sucesso.");

			setEditing(null);

			loadServiceTypes();
		} catch (err) {
			console.error(err);
		}
	}


	async function deleteServiceType(id) {
		const confirmed = window.confirm("Apagar este tipo de serviço?");
		if (!confirmed) return;

		try {
			await api.delete(`/service_types/${id}`);

			pushSuccessToast("Tipo de serviço apagado com sucesso.");

			loadServiceTypes();
		} catch (err) {
			console.error(err);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function renderName(serviceType) {
		return (
			<span className="service-type-name">
				<span
					className="service-type-dot"
					style={{ "--type-color": getServiceTypeAccent(serviceType.id, serviceType.name) }}
				/>
				<span className="cell-truncate" title={serviceType.name}>{serviceType.name}</span>
				{!!serviceType.is_locked && (
					<span className="service-type-locked" title={LOCKED_TITLE}>
						<i className="fa-solid fa-lock" /> Sistema
					</span>
				)}
			</span>
		);
	}


	function renderActions(serviceType) {
		if (serviceType.is_locked) {
			return (
				<td className="actions is-locked" title={LOCKED_TITLE}>
					<i className="fa-solid fa-lock" />
				</td>
			);
		}

		const inUse = serviceType.service_count > 0 || serviceType.schedule_count > 0;

		return (
			<td className="actions">
				<button
					className="options"
					title="Editar"
					aria-label="Editar"
					onClick={() => setEditing({ ...serviceType })}
				>
					<i className="fa-solid fa-pencil" />
				</button>
				<button
					className="cancel"
					title={inUse ? "Em uso em serviços ou marcações: não pode ser apagado." : "Apagar"}
					aria-label="Apagar"
					disabled={inUse}
					onClick={() => deleteServiceType(serviceType.id)}
				>
					<i className="fa-solid fa-trash" />
				</button>
			</td>
		);
	}


	return (
		<div className="page service-types-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-screwdriver-wrench" />
						<h1>Tipos de Serviço</h1>
					</div>

					<div className="body">

						<div className="filters">
							<input
								name="name"
								placeholder="Tipo de Serviço"
								value={filters.name}
								onChange={updateFilter}
							/>

							<button className="options" onClick={() => setFilters({ name: "" })}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button className="confirm" onClick={() => setCreating(true)}>
									<i className="fa-solid fa-plus" /> Adicionar Tipo
								</button>
							)}
						</div>

						<p className="service-type-hint">
							<i className="fa-solid fa-lock" /> Os tipos do <b>sistema</b> têm regras próprias
							(laboratório, quilómetros, calendário...) e não podem ser alterados aqui.
							Os tipos novos funcionam como serviços normais.
						</p>

						<table>
							<thead>
								<tr>
									<th>Tipo de Serviço</th>
									<th>Serviços</th>
									<th>Marcações</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Tipo de Serviço">
											<input
												placeholder="Tipo de Serviço"
												value={newName}
												autoFocus
												onChange={(e) => setNewName(e.target.value)}
												onKeyDown={(e) => { if (e.key === "Enter") createServiceType(); }}
											/>
										</td>
										<td data-label="Serviços">—</td>
										<td data-label="Marcações">—</td>

										<td className="actions">
											<button className="confirm" title="Guardar" onClick={createServiceType}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												title="Cancelar"
												onClick={() => {
													setCreating(false);
													setNewName("");
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{serviceTypes.map((serviceType) => (
									editing?.id === serviceType.id ? (
										<tr key={serviceType.id} className="editing">
											<td data-label="Tipo de Serviço">
												<input
													name="name"
													value={editing.name || ""}
													autoFocus
													onChange={(e) => setEditing({ ...editing, name: e.target.value })}
													onKeyDown={(e) => { if (e.key === "Enter") saveServiceType(); }}
												/>
											</td>
											<td data-label="Serviços">{serviceType.service_count}</td>
											<td data-label="Marcações">{serviceType.schedule_count}</td>

											<td className="actions">
												<button className="confirm" title="Guardar" onClick={saveServiceType}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" title="Cancelar" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={serviceType.id} className={serviceType.is_locked ? "is-locked" : ""}>
											<td data-label="Tipo de Serviço">{renderName(serviceType)}</td>
											<td data-label="Serviços">{serviceType.service_count}</td>
											<td data-label="Marcações">{serviceType.schedule_count}</td>
											{renderActions(serviceType)}
										</tr>
									)
								))}
							</tbody>
						</table>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} tipos)</span>

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
