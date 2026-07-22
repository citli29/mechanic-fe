import {
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";

import api from "../../api/axios";

export default function AppliedProductsTable({
	serviceId,
	showMessage,
	handleApiError
}) {

	const [appliedProducts, setAppliedProducts] = useState([]);
	const [products, setProducts] = useState([]);
	const [productTypes, setProductTypes] = useState([]);

	const [search, setSearch] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(0);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [adding, setAdding] = useState(false);
	const [creatingProduct, setCreatingProduct] = useState(false);
	const [creatingProductLoading, setCreatingProductLoading] = useState(false);

	const emptyProduct = {
		name: "",
		reference: "",
		product_type_id: ""
	};

	const [newProduct, setNewProduct] = useState(emptyProduct);

	const searchRef = useRef(null);
	const appliedProductsRef = useRef([]);
	const saveTimersRef = useRef({});
	const saveQueuesRef = useRef({});

	useEffect(() => {

		function handleClickOutside(event) {

			if (
				searchRef.current &&
				!searchRef.current.contains(event.target)
			) {
				setSearchOpen(false);
			}

		}

		document.addEventListener(
			"mousedown",
			handleClickOutside
		);

		return () => {

			document.removeEventListener(
				"mousedown",
				handleClickOutside
			);

			Object.values(saveTimersRef.current).forEach(
				timer => clearTimeout(timer)
			);

		};

	}, []);

	useEffect(() => {
		appliedProductsRef.current = appliedProducts;
	}, [appliedProducts]);

	useEffect(() => {
		loadData();
	}, [serviceId]);

	const filteredProducts = useMemo(() => {

		const value = search.trim().toLowerCase();

		if (!value) {
			return [];
		}

		return products.filter(product => {

			const searchable = [
				product.name,
				product.reference,
				product.product_type_name,
				product.type_name,
				product.type
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return searchable.includes(value);

		});

	}, [products, search]);

	async function loadData() {

		setLoading(true);

		try {

			await Promise.all([
				loadAppliedProducts(),
				loadProducts(),
				loadProductTypes()
			]);

		}
		finally {

			setLoading(false);

		}

	}

	async function loadAppliedProducts() {

		try {

			const res = await api.get(
				`/services/${serviceId}/applied_products`
			);

			const list =
				res.data.applied_product_list ||
				res.data.applied_products ||
				res.data.service_applied_product_list ||
				res.data.sap_list ||
				res.data.items ||
				(Array.isArray(res.data)
					? res.data
					: []);

			appliedProductsRef.current = list;
			setAppliedProducts(list);

		}
		catch (err) {

			appliedProductsRef.current = [];
			setAppliedProducts([]);
			handleError(err);

		}

	}

	async function loadProducts() {

		try {

			const res = await api.get("/products");

			setProducts(
				res.data.product_list ||
				res.data.products ||
				res.data.items ||
				(Array.isArray(res.data)
					? res.data
					: [])
			);

		}
		catch (err) {

			setProducts([]);
			handleError(err);

		}

	}

	async function loadProductTypes() {

		try {

			const res = await api.get("/product_types");

			setProductTypes(
				res.data.product_type_list ||
				res.data.product_types ||
				res.data.items ||
				(Array.isArray(res.data)
					? res.data
					: [])
			);

		}
		catch (err) {

			setProductTypes([]);
			handleError(err);

		}

	}

	function updateNewProduct(event) {

		const { name, value } = event.target;

		setNewProduct(previous => ({
			...previous,
			[name]: value
		}));

	}

	function beginCreatingProduct() {

		setSearchOpen(false);
		setNewProduct(previous => ({
			...previous,
			name: previous.name || search.trim()
		}));
		setCreatingProduct(true);

	}

	function cancelCreatingProduct() {

		setCreatingProduct(false);
		setNewProduct(emptyProduct);

	}

	async function createProductAndAdd() {

		if (!newProduct.name.trim()) {

			showMessage?.(
				"error",
				"O nome do produto é obrigatório."
			);

			return;

		}

		if (!newProduct.product_type_id) {

			showMessage?.(
				"error",
				"Selecione um tipo de produto."
			);

			return;

		}

		setCreatingProductLoading(true);

		try {

			const res = await api.post(
				"/products",
				{
					name: newProduct.name.trim(),
					reference:
						newProduct.reference.trim(),
					product_type_id:
						Number(newProduct.product_type_id)
				}
			);

			let createdProduct =
				res.data.product ||
				res.data.created_product ||
				res.data;

			if (!createdProduct?.id) {

				const productsRes = await api.get(
					"/products"
				);

				const productList =
					productsRes.data.product_list ||
					productsRes.data.products ||
					productsRes.data.items ||
					(Array.isArray(productsRes.data)
						? productsRes.data
						: []);

				setProducts(productList);

				createdProduct = [...productList]
					.reverse()
					.find(product =>
						product.name ===
							newProduct.name.trim() &&
						(product.reference || "") ===
							newProduct.reference.trim()
					);

			}

			if (!createdProduct?.id) {

				throw new Error(
					"A API não devolveu o ID do novo produto."
				);

			}

			setProducts(previous => {

				const exists = previous.some(
					product =>
						Number(product.id) ===
						Number(createdProduct.id)
				);

				return exists
					? previous
					: [...previous, createdProduct];

			});

			await addProduct(createdProduct);

			showMessage?.(
				"success",
				"Produto criado e adicionado com sucesso."
			);

			setCreatingProduct(false);
			setNewProduct(emptyProduct);

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setCreatingProductLoading(false);

		}

	}

	function handleError(err) {

		if (handleApiError) {
			handleApiError(err);
		}
		else {
			console.error(err);
		}

	}

	function getAppliedProductId(item) {

		return (
			item.service_applied_product_id ||
			item.applied_product_id ||
			item.sap_id ||
			item.id
		);

	}

	function getProduct(productId) {

		return products.find(
			product =>
				Number(product.id) ===
				Number(productId)
		);

	}

	function getProductName(item) {

		return (
			item.product_name ||
			item.name ||
			getProduct(item.product_id)?.name ||
			"-"
		);

	}

	function getProductReference(item) {

		return (
			item.product_reference ||
			item.reference ||
			getProduct(item.product_id)?.reference ||
			"-"
		);

	}

	function getProductType(item) {

		const product = getProduct(item.product_id);

		return (
			item.product_type_name ||
			item.type_name ||
			item.product_type ||
			product?.product_type_name ||
			product?.type_name ||
			product?.type ||
			"-"
		);

	}

	function updateAppliedProductLocally(
		itemId,
		field,
		value
	) {

		const updatedProducts =
			appliedProductsRef.current.map(item =>
				Number(getAppliedProductId(item)) ===
				Number(itemId)
					? {
						...item,
						[field]: value
					}
					: item
			);

		appliedProductsRef.current = updatedProducts;
		setAppliedProducts(updatedProducts);

	}

	function getAppliedProductById(itemId) {

		return appliedProductsRef.current.find(item =>
			Number(getAppliedProductId(item)) ===
			Number(itemId)
		);

	}

	function queueAppliedProductSave(itemId, values) {

		const previousQueue =
			saveQueuesRef.current[itemId] ||
			Promise.resolve();

		const nextQueue = previousQueue
			.catch(() => undefined)
			.then(async () => {

				setSaving(true);

				await api.put(
					`/services/${serviceId}/applied_products/${itemId}`,
					{
						service_id:
							Number(serviceId),

						product_id:
							Number(values.product_id),

						quantity:
							Number(values.quantity),

						is_applied:
							values.is_applied ? 1 : 0
					}
				);

			})
			.catch(err => {
				handleError(err);
			})
			.finally(() => {

				if (
					saveQueuesRef.current[itemId] ===
					nextQueue
				) {
					delete saveQueuesRef.current[itemId];
				}

				if (
					Object.keys(saveQueuesRef.current)
						.length === 0
				) {
					setSaving(false);
				}

			});

		saveQueuesRef.current[itemId] = nextQueue;

	}

	function updateAppliedProduct(
		itemId,
		field,
		value
	) {

		const currentItem =
			getAppliedProductById(itemId);

		if (!currentItem) {
			return;
		}

		const updatedItem = {
			...currentItem,
			[field]: value
		};

		updateAppliedProductLocally(
			itemId,
			field,
			value
		);

		if (field === "quantity") {

			if (saveTimersRef.current[itemId]) {
				clearTimeout(
					saveTimersRef.current[itemId]
				);
			}

			if (
				value === "" ||
				!Number.isFinite(Number(value)) ||
				Number(value) <= 0
			) {
				return;
			}

			saveTimersRef.current[itemId] =
				setTimeout(() => {

					delete saveTimersRef.current[itemId];
					const latestItem =
						getAppliedProductById(itemId);

					if (latestItem) {
						queueAppliedProductSave(
							itemId,
							latestItem
						);
					}

				}, 600);

			return;

		}

		queueAppliedProductSave(
			itemId,
			updatedItem
		);

	}

	async function addProduct(product) {

		if (
			!product ||
			adding
		) {
			return;
		}

		setAdding(true);

		try {

			await api.post(
				`/services/${serviceId}/applied_products`,
				{
					service_id:
						Number(serviceId),

					product_id:
						Number(product.id),

					quantity: 1,
					is_applied: 0
				}
			);

			showMessage?.(
				"success",
				"Produto adicionado com sucesso."
			);

			setSearch("");
			setHighlightedIndex(0);
			setSearchOpen(false);

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setAdding(false);

		}

	}

	function handleSearchKeyDown(event) {

		if (event.key === "Escape") {

			event.preventDefault();
			setSearchOpen(false);
			return;

		}

		if (filteredProducts.length === 0) {
			return;
		}

		if (event.key === "ArrowDown") {

			event.preventDefault();

			setHighlightedIndex(previous =>
				Math.min(
					previous + 1,
					filteredProducts.length - 1
				)
			);

			return;

		}

		if (event.key === "ArrowUp") {

			event.preventDefault();

			setHighlightedIndex(previous =>
				Math.max(previous - 1, 0)
			);

			return;

		}

		if (event.key === "Enter") {

			event.preventDefault();

			const selected =
				filteredProducts[
					highlightedIndex
				];

			if (selected) {
				addProduct(selected);
			}

		}

	}

	async function deleteAppliedProduct(
		itemId,
		productName
	) {

		const confirmed = window.confirm(
			`Eliminar "${productName}"?`
		);

		if (!confirmed) {
			return;
		}

		try {

			await api.delete(
				`/services/${serviceId}/applied_products/${itemId}`
			);

			showMessage?.(
				"success",
				"Produto aplicado eliminado com sucesso."
			);

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}

	}

	return (

		<div className="applied-products-section">

			<div className="table-title">

				<h2>Produtos aplicados</h2>

				{saving && (
					<span>A guardar...</span>
				)}

			</div>

			<div
				className="product-search"
				ref={searchRef}
			>

				<label htmlFor="applied-product-search">
					Adicionar produto
				</label>

				<input
					id="applied-product-search"
					type="text"
					placeholder="Pesquisar por nome, referência ou tipo..."
					value={search}
					onFocus={() =>
						setSearchOpen(true)
					}
					onChange={event => {

						setSearch(
							event.target.value
						);

						setHighlightedIndex(0);
						setSearchOpen(true);

					}}
					onKeyDown={
						handleSearchKeyDown
					}
					disabled={adding}
				/>

				{searchOpen && (

					<div className="product-search-results">

						{search.trim() === "" ? (

							<div className="product-search-empty">
								Comece a escrever para pesquisar produtos.
							</div>

						) : filteredProducts.length === 0 ? (

							<div className="product-search-empty">

								<span>
									Nenhum produto encontrado.
								</span>

								<button
									type="button"
									onClick={beginCreatingProduct}
									disabled={adding}
								>
									Criar “{search.trim()}”
								</button>

							</div>

						) : (

							filteredProducts.map(
								(product, index) => (

									<button
										key={product.id}
										type="button"
										className={
											index ===
											highlightedIndex
												? "product-search-option active"
												: "product-search-option"
										}
										onMouseEnter={() =>
											setHighlightedIndex(
												index
											)
										}
										onClick={() =>
											addProduct(product)
										}
										disabled={adding}
									>

										<span className="product-search-main">
											{product.name}
										</span>

										<span className="product-search-meta">

											{product.reference ||
												"-"}

											{" · "}

											{product.product_type_name ||
												product.type_name ||
												product.type ||
												"-"}

										</span>

									</button>

								)
							)

						)}

					</div>

				)}

			</div>

			{!creatingProduct && (
				<div className="container-buttons">

					<button
						type="button"
						onClick={beginCreatingProduct}
						disabled={adding}
					>
						Criar novo produto
					</button>

				</div>
			)}

			{creatingProduct && (

				<div className="inline-create-form">

					<h3>Criar produto</h3>

					<div className="field">

						<input
							type="text"
							name="name"
							placeholder="Nome do produto"
							value={newProduct.name}
							onChange={updateNewProduct}
							disabled={creatingProductLoading}
						/>
					</div>

					<div className="field">

						<input
							type="text"
							name="reference"
							placeholder="Referência"
							value={newProduct.reference}
							onChange={updateNewProduct}
							disabled={creatingProductLoading}
						/>
					</div>

					<div className="field">

						<select
							name="product_type_id"
							value={newProduct.product_type_id}
							onChange={updateNewProduct}
							disabled={creatingProductLoading}
						>

							<option value="">
								Selecionar tipo
							</option>

							{productTypes.map(productType => (

								<option
									key={productType.id}
									value={productType.id}
								>
									{productType.name}
								</option>

							))}

						</select>
					</div>

					<div className="container-buttons">

						<button
							type="button"
							onClick={createProductAndAdd}
							disabled={creatingProductLoading}
						>
							{creatingProductLoading
								? "A criar..."
								: "Criar e adicionar"}
						</button>

						<button
							type="button"
							onClick={cancelCreatingProduct}
							disabled={creatingProductLoading}
						>
							Cancelar
						</button>

					</div>

				</div>

			)}

			<div className="table-wrapper">

				<table className="table">

					<thead>

						<tr>
							<th>Produto</th>
							<th>Referência</th>
							<th>Tipo</th>
							<th>Quantidade</th>
							<th>Aplicado</th>
							<th></th>
						</tr>

					</thead>

					<tbody>

						{loading && (

							<tr>
								<td colSpan={6}>
									A carregar...
								</td>
							</tr>

						)}

						{!loading &&
							appliedProducts.length === 0 && (

								<tr>
									<td colSpan={6}>
										Nenhum produto aplicado encontrado.
									</td>
								</tr>

							)}

						{!loading &&
							appliedProducts.map(item => {

								const itemId =
									getAppliedProductId(
										item
									);

								return (

									<tr key={itemId}>

										<td>
											{getProductName(
												item
											)}
										</td>

										<td>
											{getProductReference(
												item
											)}
										</td>

										<td>
											{getProductType(
												item
											)}
										</td>

										<td>

											<input
												type="number"
												min="0.01"
												step="any"
												value={
													item.quantity ??
													""
												}
												onChange={event =>
													updateAppliedProduct(
														itemId,
														"quantity",
														event.target.value
													)
												}
											/>

										</td>

										<td>

											<input
												type="checkbox"
												checked={
													Number(
														item.is_applied
													) === 1 ||
													item.is_applied === true
												}
												onChange={event =>
													updateAppliedProduct(
														itemId,
														"is_applied",
														event.target.checked
													)
												}
											/>

										</td>

										<td>

											<button
												type="button"
												className="delete-btn"
												onClick={() =>
													deleteAppliedProduct(
														itemId,
														getProductName(
															item
														)
													)
												}
											>
												Delete
											</button>

										</td>

									</tr>

								);

							})}

					</tbody>

				</table>

			</div>

		</div>

	);

}
