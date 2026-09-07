import { useEffect, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/MakesList.css";

const PER_PAGE = 10;

export default function MakesList() {

	const [makes, setMakes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newMakeName, setNewMakeName] = useState("");

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
			showMessage("error", "Something went wrong.");
		}

		console.error(err);
	}


	useEffect(() => { loadMakes(); }, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadMakes();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadMakes() {
		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/makes", { params });

			setMakes(res.data.make_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.make_list || []).length);
		} catch (err) {
			console.error(err);
			setMakes([]);
		}
	}


	async function createMake() {
		if (!newMakeName.trim()) return;

		try {
			await api.post("/makes", { name: newMakeName });

			showMessage("success", "Marca criada com sucesso.");

			setNewMakeName("");
			setCreating(false);

			loadMakes();
		} catch (err) {
			handleApiError(err);
		}
	}


	function editMake(make) {
		setEditing({ ...make });
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	async function saveMake() {
		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/makes/${editing.id}`, data);

			showMessage("success", "Marca atualizada com sucesso.");

			setEditing(null);

			loadMakes();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteMake(id, name) {
		const confirmed = window.confirm(`Apagar "${name}"?`);
		if (!confirmed) return;

		try {
			await api.delete(`/makes/${id}`);

			showMessage("success", "Marca apagada com sucesso.");

			loadMakes();
		} catch (err) {
			handleApiError(err);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function clearFilters() {
		setFilters({ name: "" });
	}

	return (
		<div className="page makes-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-industry" />
						<h1>Marcas</h1>
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
								placeholder="Marca"
								value={filters.name}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button className="confirm" onClick={() => setCreating(true)}>
									<i className="fa-solid fa-plus" /> Adicionar Marca
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Marca</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Marca">
											<input
												placeholder="Marca"
												value={newMakeName}
												onChange={(e) => setNewMakeName(e.target.value)}
											/>
										</td>

										<td className="actions">
											<button className="confirm" onClick={createMake}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreating(false);
													setNewMakeName("");
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{makes.map((make) => (
									editing?.id === make.id ? (
										<tr key={make.id} className="editing">
											<td data-label="Marca">
												<input
													name="name"
													value={editing.name || ""}
													onChange={updateEdit}
												/>
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveMake}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={make.id}>
											<td data-label="Marca">{make.name}</td>

											<td className="actions">
												<button className="options" onClick={() => editMake(make)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteMake(make.id, make.name)}
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

							<span>Página {page} de {totalPages} ({total} marcas)</span>

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
