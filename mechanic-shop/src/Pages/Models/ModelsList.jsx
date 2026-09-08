import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ModelsList.css";

const PER_PAGE = 10;

export default function ModelsList() {

	const requestIdRef = useRef(0);

	const [models, setModels] = useState([]);
	const [makes, setMakes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		make_id: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newModel, setNewModel] = useState({
		name: "",
		make_id: "",
	});

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


	useEffect(() => {
		loadModels();
		loadMakes();
	}, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadModels();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadModels() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/models", { params });

			if (requestId !== requestIdRef.current) return;

			setModels(res.data.model_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.model_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setModels([]);
		}
	}


	async function loadMakes() {
		try {
			const res = await api.get("/makes");
			setMakes(res.data.make_list || []);
		} catch (err) {
			console.error(err);
			setMakes([]);
		}
	}


	async function createModel() {
		if (!newModel.name.trim()) {
			showMessage("error", "O nome do modelo é obrigatório.");
			return;
		}

		if (!newModel.make_id) {
			showMessage("error", "Selecione uma marca.");
			return;
		}

		try {
			await api.post("/models", {
				name: newModel.name,
				make_id: newModel.make_id,
			});

			showMessage("success", "Modelo criado com sucesso.");

			setCreating(false);
			setNewModel({ name: "", make_id: "" });

			loadModels();
		} catch (err) {
			handleApiError(err);
		}
	}


	function editModel(model) {
		setEditing({ ...model });
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	async function saveModel() {
		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/models/${editing.id}`, data);

			showMessage("success", "Modelo atualizado com sucesso.");

			setEditing(null);

			loadModels();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteModel(id, name) {
		const confirmed = window.confirm(`Apagar "${name}"?`);
		if (!confirmed) return;

		try {
			await api.delete(`/models/${id}`);

			showMessage("success", "Modelo apagado com sucesso.");

			loadModels();
		} catch (err) {
			handleApiError(err);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function updateNewModel(e) {
		const { name, value } = e.target;
		setNewModel({ ...newModel, [name]: value });
	}


	function clearFilters() {
		setFilters({ name: "", make_id: "" });
	}

	return (
		<div className="page models-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-car-side" />
						<h1>Modelos</h1>
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
								placeholder="Modelo"
								value={filters.name}
								onChange={updateFilter}
							/>

							<select
								name="make_id"
								value={filters.make_id}
								onChange={updateFilter}
							>
								<option value="">Marca</option>
								{makes.map((make) => (
									<option key={make.id} value={make.id}>
										{make.name}
									</option>
								))}
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button className="confirm" onClick={() => setCreating(true)}>
									<i className="fa-solid fa-plus" /> Adicionar Modelo
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Modelo</th>
									<th>Marca</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Modelo">
											<input
												name="name"
												placeholder="Modelo"
												value={newModel.name}
												onChange={updateNewModel}
											/>
										</td>

										<td data-label="Marca">
											<select
												name="make_id"
												value={newModel.make_id}
												onChange={updateNewModel}
											>
												<option value="">Selecionar Marca</option>
												{makes.map((make) => (
													<option key={make.id} value={make.id}>
														{make.name}
													</option>
												))}
											</select>
										</td>

										<td className="actions">
											<button className="confirm" onClick={createModel}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreating(false);
													setNewModel({ name: "", make_id: "" });
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{models.map((model) => (
									editing?.id === model.id ? (
										<tr key={model.id} className="editing">
											<td data-label="Modelo">
												<input
													name="name"
													value={editing.name || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Marca">
												<select
													name="make_id"
													value={editing.make_id || ""}
													onChange={updateEdit}
												>
													<option value="">Selecionar Marca</option>
													{makes.map((make) => (
														<option key={make.id} value={make.id}>
															{make.name}
														</option>
													))}
												</select>
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveModel}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={model.id}>
											<td data-label="Modelo">{model.name}</td>
											<td data-label="Marca">{model.make_name}</td>

											<td className="actions">
												<button className="options" onClick={() => editModel(model)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteModel(model.id, model.name)}
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

							<span>Página {page} de {totalPages} ({total} modelos)</span>

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
