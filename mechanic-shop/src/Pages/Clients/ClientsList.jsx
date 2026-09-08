import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ClientsList.css";

const PER_PAGE = 10;

const emptyClient = {
	name: "",
	phone: "",
	address: "",
	email: "",
	zip_code: "",
	tax_nr: "",
};

export default function ClientsList() {

	const requestIdRef = useRef(0);

	const [clients, setClients] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		phone: "",
		email: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newClient, setNewClient] = useState(emptyClient);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


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


	useEffect(() => { loadClients(); }, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadClients();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadClients() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

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


	async function createClient() {
		if (!newClient.name.trim()) {
			showMessage("error", "O nome do cliente é obrigatório.");
			return;
		}

		if (!newClient.phone.trim()) {
			showMessage("error", "O telemóvel é obrigatório.");
			return;
		}

		try {
			const data = Object.fromEntries(
				Object.entries(newClient).filter(([_, value]) => value !== "")
			);

			await api.post("/clients", data);

			showMessage("success", "Cliente criado com sucesso.");

			setCreating(false);
			setNewClient(emptyClient);

			loadClients();
		} catch (err) {
			handleApiError(err);
		}
	}


	function editClient(client) {
		setEditing({ ...client });
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	async function saveClient() {
		if (!editing.name.trim()) {
			showMessage("error", "O nome do cliente é obrigatório.");
			return;
		}

		if (!editing.phone.trim()) {
			showMessage("error", "O telemóvel é obrigatório.");
			return;
		}

		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/clients/${editing.id}`, data);

			showMessage("success", "Cliente atualizado com sucesso.");

			setEditing(null);

			loadClients();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteClient(id, name) {
		const confirmed = window.confirm(`Apagar "${name}"?`);
		if (!confirmed) return;

		try {
			await api.delete(`/clients/${id}`);

			showMessage("success", "Cliente apagado com sucesso.");

			loadClients();
		} catch (err) {
			handleApiError(err);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function updateNewClient(e) {
		const { name, value } = e.target;
		setNewClient({ ...newClient, [name]: value });
	}


	function clearFilters() {
		setFilters({ name: "", phone: "", email: "" });
	}

	return (
		<div className="page clients-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-address-book" />
						<h1>Clientes</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="filters">
							<input
								name="name"
								placeholder="Nome"
								value={filters.name}
								onChange={updateFilter}
							/>

							<input
								name="phone"
								placeholder="Telemóvel"
								value={filters.phone}
								onChange={updateFilter}
							/>

							<input
								name="email"
								placeholder="Email"
								value={filters.email}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button className="confirm" onClick={() => setCreating(true)}>
									<i className="fa-solid fa-plus" /> Adicionar Cliente
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Telemóvel</th>
									<th>Email</th>
									<th>Morada</th>
									<th>Cod. Postal</th>
									<th>NIF</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Nome">
											<input
												name="name"
												placeholder="Nome"
												value={newClient.name}
												onChange={updateNewClient}
											/>
										</td>

										<td data-label="Telemóvel">
											<input
												name="phone"
												placeholder="Telemóvel"
												value={newClient.phone}
												onChange={updateNewClient}
											/>
										</td>

										<td data-label="Email">
											<input
												name="email"
												placeholder="Email"
												value={newClient.email}
												onChange={updateNewClient}
											/>
										</td>

										<td data-label="Morada">
											<input
												name="address"
												placeholder="Morada"
												value={newClient.address}
												onChange={updateNewClient}
											/>
										</td>

										<td data-label="Cod. Postal">
											<input
												name="zip_code"
												placeholder="Cod. Postal"
												value={newClient.zip_code}
												onChange={updateNewClient}
											/>
										</td>

										<td data-label="NIF">
											<input
												name="tax_nr"
												placeholder="NIF"
												value={newClient.tax_nr}
												onChange={updateNewClient}
											/>
										</td>

										<td className="actions">
											<button className="confirm" onClick={createClient}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreating(false);
													setNewClient(emptyClient);
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{clients.map((client) => (
									editing?.id === client.id ? (
										<tr key={client.id} className="editing">
											<td data-label="Nome">
												<input
													name="name"
													value={editing.name || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Telemóvel">
												<input
													name="phone"
													value={editing.phone || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Email">
												<input
													name="email"
													value={editing.email || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Morada">
												<input
													name="address"
													value={editing.address || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Cod. Postal">
												<input
													name="zip_code"
													value={editing.zip_code || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="NIF">
												<input
													name="tax_nr"
													value={editing.tax_nr || ""}
													onChange={updateEdit}
												/>
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveClient}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={client.id}>
											<td data-label="Nome">{client.name}</td>
											<td data-label="Telemóvel">{client.phone}</td>
											<td data-label="Email">{client.email || "-"}</td>
											<td data-label="Morada">{client.address || "-"}</td>
											<td data-label="Cod. Postal">{client.zip_code || "-"}</td>
											<td data-label="NIF">{client.tax_nr || "-"}</td>

											<td className="actions">
												<button className="options" onClick={() => editClient(client)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteClient(client.id, client.name)}
												>
													<i className="fa-solid fa-trash" />
												</button>
											</td>
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
