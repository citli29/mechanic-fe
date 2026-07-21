import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ProductsList() {

	const [products, setProducts] = useState([]);
	const [productTypes, setProductTypes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		reference: "",
		p_t_name: "",
	});

	const [editing, setEditing] = useState(null);

	const [message, setMessage] = useState({
		type: "",
		text: ""
	});

	const [creatingProduct, setCreatingProduct] = useState(false);

	const [creatingProductType, setCreatingProductType] = useState(false);

	const [newProductTypeName, setNewProductTypeName] = useState("");

	const emptyProduct = {
		name: "",
		reference: "",
		product_type_id: ""
	};

	const [newProduct, setNewProduct] = useState(emptyProduct);

	function showMessage(type, text) {

		setMessage({
			type,
			text
		});

		setTimeout(() => {
			setMessage({
				type: "",
				text: ""
			});
		}, 4000);

	}

	function handleApiError(err) {

		if (err.response?.data?.error) {

			showMessage(
				"error",
				err.response.data.error
			);

		}
		else {

			showMessage(
				"error",
				"Something went wrong."
			);

		}

		console.error(err);

	}

	useEffect(() => {
		loadProducts();
		loadProductTypes();
	}, []);

	useEffect(() => {

		const timer = setTimeout(() => {
			loadProducts();
		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);

	async function loadProducts() {

		try {

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/products", {
				params
			});

			setProducts(res.data.product_list || []);

		}
		catch (err) {

			console.error(err);
			setProducts([]);

		}

	}

	async function loadProductTypes() {

		try {

			const res = await api.get("/product_types");

			setProductTypes(
				res.data.product_type_list || []
			);

		}
		catch (err) {

			console.error(err);
			setProductTypes([]);

		}

	}

	function updateFilter(e) {

		setFilters({
			...filters,
			[e.target.name]: e.target.value
		});

	}

	function editProduct(product) {

		setEditing({
			...product
		});

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value
		});

	}

	function updateNewProduct(e) {

		const { name, value } = e.target;

		setNewProduct(prev => ({
			...prev,
			[name]: value
		}));

	}

	async function createProductType() {

		if (!newProductTypeName.trim())
			return;

		try {

			const res = await api.post("/product_types", {
				name: newProductTypeName
			});

			const newType = res.data.product_type;

			setProductTypes(prev => [
				...prev,
				newType
			]);

			if (creatingProduct) {

				setNewProduct(prev => ({
					...prev,
					product_type_id: newType.id
				}));

			}

			if (editing) {

				setEditing(prev => ({
					...prev,
					product_type_id: newType.id
				}));

			}

			setNewProductTypeName("");

			setCreatingProductType(false);

			showMessage(
				"success",
				"Product type created successfully."
			);

		}
		catch (err) {

			handleApiError(err);

		}

	}
	async function createProduct() {

		if (!newProduct.name.trim()) {
			showMessage("error", "Name is required.");
			return;
		}

		try {

			const data = Object.fromEntries(
				Object.entries(newProduct)
					.filter(([_, value]) => value !== "")
			);

			await api.post("/products", data);

			showMessage(
				"success",
				"Product created successfully."
			);

			setCreatingProduct(false);

			setCreatingProductType(false);

			setNewProduct(emptyProduct);

			setNewProductTypeName("");

			loadProducts();

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function saveProduct() {

		if (!editing.name.trim()) {
			showMessage("error", "Name is required.");
			return;
		}

		try {

			const data = Object.fromEntries(
				Object.entries(editing)
					.filter(([_, value]) => value !== "")
			);

			await api.put(
				`/products/${editing.id}`,
				data
			);

			showMessage(
				"success",
				"Product updated successfully."
			);

			setEditing(null);

			setCreatingProductType(false);

			setNewProductTypeName("");

			loadProducts();

		}
		catch (err) {

			handleApiError(err);

		}

	}


	async function deleteProduct(id) {

		if (!window.confirm("Delete this product?"))
			return;

		try {

			await api.delete(`/products/${id}`);

			showMessage(
				"success",
				"Product deleted successfully."
			);

			loadProducts();

		}
		catch (err) {

			handleApiError(err);

		}

	}


	function clearFilters() {

		setFilters({
			name: "",
			reference: "",
			p_t_name: ""
		});

	}


	return (

		<div className="container">

			<h1>Produtos</h1>

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
					placeholder="Referencia"
					value={filters.reference}
					onChange={updateFilter}
				/>

				<input
					name="p_t_name"
					placeholder="Tipo de Produto"
					value={filters.p_t_name}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Limpar
				</button>

				<button
					onClick={() => {
						setCreatingProduct(true);
						setNewProduct(emptyProduct);
					}}
				>
					Adicionar Produto
				</button>

			</div>

			<div className="table-wrapper">

			<table className="table">

				<thead>

					<tr>

						<th>Nome</th>
						<th>Referencia</th>
						<th>Tipo de Produto</th>
						<th></th>

					</tr>

				</thead>

				<tbody>
					{creatingProduct && (

						<tr className="editing">

							<td>
								<input
									name="name"
									value={newProduct.name}
									onChange={updateNewProduct}
								/>
							</td>

							<td>
								<input
									name="reference"
									value={newProduct.reference}
									onChange={updateNewProduct}
								/>
							</td>

							<td>

								{!creatingProductType && (

									<select
										name="product_type_id"
										value={newProduct.product_type_id}
										onChange={(e) => {

											if (e.target.value === "new") {
												setCreatingProductType(true);
												return;
											}

											updateNewProduct(e);

										}}
									>

										<option value="">
											Tipo de Produto
										</option>

										<option value="new">
											+ Adicionar Tipo de Produto
										</option>

										{productTypes.map(type => (

											<option
												key={type.id}
												value={type.id}
											>
												{type.name}
											</option>

										))}

									</select>

								)}

								{creatingProductType && (

									<div className="inline-create">

										<input
											placeholder="Tipo de Produto"
											value={newProductTypeName}
											onChange={(e) =>
												setNewProductTypeName(e.target.value)
											}
										/>

										<div className="create-buttons">

											<button onClick={createProductType}>
												Adicionar
											</button>

											<button
												onClick={() => {

													setCreatingProductType(false);
													setNewProductTypeName("");

												}}
											>
												X
											</button>

										</div>

									</div>

								)}

							</td>

							<td>

								<div className="container-buttons">

									<button onClick={createProduct}>
										Adicionar
									</button>

									<button
										onClick={() => {

											setCreatingProduct(false);
											setCreatingProductType(false);
											setNewProduct(emptyProduct);
											setNewProductTypeName("");

										}}
									>
										X
									</button>

								</div>

							</td>

						</tr>

					)}

					{products.map(product => (

						editing?.id === product.id ? (

							<tr
								key={product.id}
								className="editing"
							>

								<td>
									<input
										name="name"
										value={editing.name || ""}
										onChange={updateEdit}
									/>
								</td>

								<td>
									<input
										name="reference"
										value={editing.reference || ""}
										onChange={updateEdit}
									/>
								</td>

								<td>

									{!creatingProductType && (

										<select
											name="product_type_id"
											value={editing.product_type_id || ""}
											onChange={(e) => {

												if (e.target.value === "new") {
													setCreatingProductType(true);
													return;
												}

												updateEdit(e);

											}}
										>

											<option value="">
												Tipo de Produto
											</option>

											<option value="new">
												+ Criar Tipo de Produto
											</option>

											{productTypes.map(type => (

												<option
													key={type.id}
													value={type.id}
												>
													{type.name}
												</option>

											))}

										</select>

									)}

									{creatingProductType && (

										<div className="inline-create">

											<input
												placeholder="Product Type"
												value={newProductTypeName}
												onChange={(e) =>
													setNewProductTypeName(e.target.value)
												}
											/>

											<div className="create-buttons">

												<button onClick={createProductType}>
													Adicionar
												</button>

												<button
													onClick={() => {

														setCreatingProductType(false);
														setNewProductTypeName("");

													}}
												>
													X
												</button>

											</div>

										</div>

									)}

								</td>

								<td>

									<div className="container-buttons">

										<button onClick={saveProduct}>
											Guardar
										</button>

										<button
											onClick={() => {
												setEditing(null);
												setCreatingProductType(false);
												setNewProductTypeName("");
											}}
										>
											X
										</button>

									</div>

								</td>

							</tr>

						) : (

								<tr key={product.id}>

									<td>{product.name}</td>
									<td>{product.reference}</td>
									<td>{product.product_type_name}</td>

									<td>

										<div className="container-buttons">

											<button
												onClick={() => editProduct(product)}
											>
												Editar
											</button>

											<button
												className="delete-btn"
												onClick={() => deleteProduct(product.id)}
											>
												Apagar
											</button>

										</div>

									</td>

								</tr>

							)

					))}

				</tbody>

			</table>
			</div>

		</div>

	);
}	
