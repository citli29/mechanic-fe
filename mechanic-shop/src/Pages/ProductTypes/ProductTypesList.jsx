import { useEffect, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ProductTypesList.css";

const PER_PAGE = 10;

export default function ProductTypesList() {

	const [productTypes, setProductTypes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newName, setNewName] = useState("");

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


	useEffect(() => { loadProductTypes(); }, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadProductTypes();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadProductTypes() {
		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/product_types", { params });

			setProductTypes(res.data.product_type_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.product_type_list || []).length);
		} catch (err) {
			console.error(err);
			setProductTypes([]);
		}
	}


	async function createProductType() {
		if (!newName.trim()) {
			showMessage("error", "Nome é obrigatório.");
			return;
		}

		try {
			await api.post("/product_types", { name: newName });

			showMessage("success", "Tipo de produto criado com sucesso.");

			setNewName("");
			setCreating(false);

			loadProductTypes();
		} catch (err) {
			handleApiError(err);
		}
	}


	function editProductType(productType) {
		setEditing({ ...productType });
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	async function saveProductType() {
		if (!editing.name.trim()) {
			showMessage("error", "Nome é obrigatório.");
			return;
		}

		try {
			await api.put(`/product_types/${editing.id}`, { name: editing.name });

			showMessage("success", "Tipo de produto atualizado com sucesso.");

			setEditing(null);

			loadProductTypes();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteProductType(id) {
		const confirmed = window.confirm("Apagar este tipo de produto?");
		if (!confirmed) return;

		try {
			await api.delete(`/product_types/${id}`);

			showMessage("success", "Tipo de produto apagado com sucesso.");

			loadProductTypes();
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
		<div className="page product-types-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-tags" />
						<h1>Tipos de Produto</h1>
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
								placeholder="Tipo de Produto"
								value={filters.name}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creating && (
								<button className="confirm" onClick={() => setCreating(true)}>
									<i className="fa-solid fa-plus" /> Adicionar Tipo
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Tipo de Produto</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creating && (
									<tr className="editing">
										<td data-label="Tipo de Produto">
											<input
												placeholder="Tipo de Produto"
												value={newName}
												onChange={(e) => setNewName(e.target.value)}
											/>
										</td>

										<td className="actions">
											<button className="confirm" onClick={createProductType}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
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

								{productTypes.map((productType) => (
									editing?.id === productType.id ? (
										<tr key={productType.id} className="editing">
											<td data-label="Tipo de Produto">
												<input
													name="name"
													value={editing.name || ""}
													onChange={updateEdit}
												/>
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveProductType}>
													<i className="fa-solid fa-check" />
												</button>
												<button className="cancel" onClick={() => setEditing(null)}>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={productType.id}>
											<td data-label="Tipo de Produto">{productType.name}</td>

											<td className="actions">
												<button className="options" onClick={() => editProductType(productType)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteProductType(productType.id)}
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
