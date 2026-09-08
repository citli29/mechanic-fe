import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ProductsList.css";

const PER_PAGE = 10;

const emptyProduct = {
	name: "",
	reference: "",
	product_type_id: "",
};

const capitalize = (str) => {
	if (!str) return "";
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function ProductsList() {

	const requestIdRef = useRef(0);

	const [products, setProducts] = useState([]);
	const [productTypes, setProductTypes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		reference: "",
		p_t_id: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});

	const [creatingProduct, setCreatingProduct] = useState(false);
	const [creatingProductType, setCreatingProductType] = useState(false);
	const [newProductTypeName, setNewProductTypeName] = useState("");

	const [newProduct, setNewProduct] = useState(emptyProduct);


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
		loadProducts();
		loadProductTypes();
	}, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadProducts();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadProducts() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/products", { params });

			if (requestId !== requestIdRef.current) return;

			setProducts(res.data.product_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.product_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setProducts([]);
		}
	}


	async function loadProductTypes() {
		try {
			const res = await api.get("/product_types");
			setProductTypes(res.data.product_type_list || []);
		} catch (err) {
			console.error(err);
			setProductTypes([]);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function editProduct(product) {
		setEditing({ ...product });
	}


	function updateEdit(e) {
		const { name, value } = e.target;

		let v = value;
		if (name === "name") v = capitalize(v);
		if (name === "reference") v = v.toUpperCase();

		setEditing({ ...editing, [name]: v });
	}


	function updateNewProduct(e) {
		const { name, value } = e.target;

		let v = value;
		if (name === "name") v = capitalize(v);
		if (name === "reference") v = v.toUpperCase();

		setNewProduct((prev) => ({ ...prev, [name]: v }));
	}


	async function createProductType() {
		if (!newProductTypeName.trim()) return;

		try {
			const res = await api.post("/product_types", { name: newProductTypeName });

			const newType = res.data.product_type;

			setProductTypes((prev) => [...prev, newType]);

			if (creatingProduct) {
				setNewProduct((prev) => ({ ...prev, product_type_id: newType.id }));
			}

			if (editing) {
				setEditing((prev) => ({ ...prev, product_type_id: newType.id }));
			}

			setNewProductTypeName("");
			setCreatingProductType(false);

			showMessage("success", "Tipo de produto criado com sucesso.");
		} catch (err) {
			handleApiError(err);
		}
	}


	async function createProduct() {
		if (!newProduct.name.trim()) {
			showMessage("error", "O nome do produto é obrigatório.");
			return;
		}

		try {
			const data = Object.fromEntries(
				Object.entries(newProduct).filter(([_, value]) => value !== "")
			);

			await api.post("/products", data);

			showMessage("success", "Produto criado com sucesso.");

			setCreatingProduct(false);
			setCreatingProductType(false);
			setNewProduct(emptyProduct);
			setNewProductTypeName("");

			loadProducts();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function saveProduct() {
		if (!editing.name.trim()) {
			showMessage("error", "O nome do produto é obrigatório.");
			return;
		}

		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/products/${editing.id}`, data);

			showMessage("success", "Produto atualizado com sucesso.");

			setEditing(null);
			setCreatingProductType(false);
			setNewProductTypeName("");

			loadProducts();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteProduct(id) {
		const confirmed = window.confirm("Apagar este produto?");
		if (!confirmed) return;

		try {
			await api.delete(`/products/${id}`);

			showMessage("success", "Produto apagado com sucesso.");

			loadProducts();
		} catch (err) {
			handleApiError(err);
		}
	}


	function clearFilters() {
		setFilters({ name: "", reference: "", p_t_id: "" });
	}

	function renderProductTypeField(value, onChange) {
		if (creatingProductType) {
			return (
				<div className="inline-create">
					<input
						placeholder="Tipo de Produto"
						value={newProductTypeName}
						onChange={(e) => setNewProductTypeName(e.target.value)}
					/>

					<div className="create-buttons">
						<button className="confirm" onClick={createProductType}>
							<i className="fa-solid fa-check" />
						</button>
						<button
							className="cancel"
							onClick={() => {
								setCreatingProductType(false);
								setNewProductTypeName("");
							}}
						>
							<i className="fa-solid fa-x" />
						</button>
					</div>
				</div>
			);
		}

		return (
			<select
				name="product_type_id"
				value={value || ""}
				onChange={(e) => {
					if (e.target.value === "new") {
						setCreatingProductType(true);
						return;
					}

					onChange(e);
				}}
			>
				<option value="">Tipo de Produto</option>
				<option value="new">+ Adicionar Tipo de Produto</option>

				{productTypes.map((type) => (
					<option key={type.id} value={type.id}>
						{type.name}
					</option>
				))}
			</select>
		);
	}

	return (
		<div className="page products-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-boxes-stacked" />
						<h1>Produtos</h1>
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
								name="reference"
								placeholder="Referência"
								value={filters.reference}
								onChange={updateFilter}
							/>

							<select
								name="p_t_id"
								value={filters.p_t_id}
								onChange={updateFilter}
							>
								<option value="">Tipo de Produto</option>
								{productTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creatingProduct && (
								<button
									className="confirm"
									onClick={() => {
										setCreatingProduct(true);
										setNewProduct(emptyProduct);
									}}
								>
									<i className="fa-solid fa-plus" /> Adicionar Produto
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Referência</th>
									<th>Tipo de Produto</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creatingProduct && (
									<tr className="editing">
										<td data-label="Nome">
											<input
												name="name"
												value={newProduct.name}
												onChange={updateNewProduct}
											/>
										</td>

										<td data-label="Referência">
											<input
												name="reference"
												value={newProduct.reference}
												onChange={updateNewProduct}
											/>
										</td>

										<td data-label="Tipo de Produto">
											{renderProductTypeField(newProduct.product_type_id, updateNewProduct)}
										</td>

										<td className="actions">
											<button className="confirm" onClick={createProduct}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreatingProduct(false);
													setCreatingProductType(false);
													setNewProduct(emptyProduct);
													setNewProductTypeName("");
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{products.map((product) => (
									editing?.id === product.id ? (
										<tr key={product.id} className="editing">
											<td data-label="Nome">
												<input
													name="name"
													value={editing.name || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Referência">
												<input
													name="reference"
													value={editing.reference || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Tipo de Produto">
												{renderProductTypeField(editing.product_type_id, updateEdit)}
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveProduct}>
													<i className="fa-solid fa-check" />
												</button>
												<button
													className="cancel"
													onClick={() => {
														setEditing(null);
														setCreatingProductType(false);
														setNewProductTypeName("");
													}}
												>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={product.id}>
											<td data-label="Nome">{product.name}</td>
											<td data-label="Referência">{product.reference}</td>
											<td data-label="Tipo de Produto">{product.product_type_name}</td>

											<td className="actions">
												<button className="options" onClick={() => editProduct(product)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteProduct(product.id)}
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

							<span>Página {page} de {totalPages} ({total} produtos)</span>

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
