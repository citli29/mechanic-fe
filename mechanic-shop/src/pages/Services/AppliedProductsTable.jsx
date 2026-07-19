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

	const [isEditing, setIsEditing] = useState(false);
	const [editedProducts, setEditedProducts] = useState({});

	const [search, setSearch] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(0);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [adding, setAdding] = useState(false);

	const searchRef = useRef(null);

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

		};

	}, []);

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
				loadProducts()
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

			setAppliedProducts(
				res.data.applied_product_list ||
				res.data.applied_products ||
				res.data.service_applied_product_list ||
				res.data.sap_list ||
				res.data.items ||
				(Array.isArray(res.data)
					? res.data
					: [])
			);

		}
		catch (err) {

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

	function beginEditing() {

		const values = {};

		appliedProducts.forEach(item => {

			const itemId =
				getAppliedProductId(item);

			values[itemId] = {
				id: itemId,
				product_id: item.product_id,
				quantity: item.quantity ?? 1,
				is_applied:
					Number(item.is_applied) === 1
			};

		});

		setSearchOpen(false);
		setEditedProducts(values);
		setIsEditing(true);

	}

	function cancelEditing() {

		setEditedProducts({});
		setIsEditing(false);

	}

	function updateEditedProduct(
		itemId,
		field,
		value
	) {

		setEditedProducts(previous => ({
			...previous,
			[itemId]: {
				...previous[itemId],
				[field]: value
			}
		}));

	}

	async function saveAllAppliedProducts() {

		const rows = Object.values(
			editedProducts
		);

		const invalidQuantity = rows.some(row =>
			row.quantity === "" ||
			!Number.isFinite(Number(row.quantity)) ||
			Number(row.quantity) <= 0
		);

		if (invalidQuantity) {

			showMessage?.(
				"error",
				"Every quantity must be greater than 0."
			);

			return;

		}

		setSaving(true);

		try {

			await Promise.all(
				rows.map(row =>
					api.put(
						`/services/${serviceId}/applied_products/${row.id}`,
						{
							service_id:
								Number(serviceId),

							product_id:
								Number(row.product_id),

							quantity:
								Number(row.quantity),

							is_applied:
								row.is_applied ? 1 : 0
						}
					)
				)
			);

			showMessage?.(
				"success",
				"Applied products updated successfully."
			);

			setIsEditing(false);
			setEditedProducts({});

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function addProduct(product) {

		if (
			!product ||
			adding ||
			isEditing
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
				"Product added successfully."
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
			`Delete "${productName}"?`
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
				"Applied product deleted successfully."
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

				<h2>Applied Products</h2>

				<div className="container-buttons">

					{!isEditing ? (

						<button
							type="button"
							onClick={beginEditing}
							disabled={
								loading ||
								appliedProducts.length === 0
							}
						>
							Edit
						</button>

					) : (

						<>

							<button
								type="button"
								onClick={
									saveAllAppliedProducts
								}
								disabled={saving}
							>
								{saving
									? "Saving..."
									: "Save"}
							</button>

							<button
								type="button"
								onClick={cancelEditing}
								disabled={saving}
							>
								Cancel
							</button>

						</>

					)}

				</div>

			</div>

			<div
				className="product-search"
				ref={searchRef}
			>

				<label htmlFor="applied-product-search">
					Add product
				</label>

				<input
					id="applied-product-search"
					type="text"
					placeholder="Search by name, reference or type..."
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
					disabled={
						adding ||
						isEditing
					}
				/>

				{searchOpen && (

					<div className="product-search-results">

						{search.trim() === "" ? (

							<div className="product-search-empty">
								Start typing to search products.
							</div>

						) : filteredProducts.length === 0 ? (

							<div className="product-search-empty">
								No products found.
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

			<div className="table-wrapper">

				<table className="table">

					<thead>

						<tr>
							<th>Product</th>
							<th>Reference</th>
							<th>Type</th>
							<th>Quantity</th>
							<th>Applied</th>
							<th></th>
						</tr>

					</thead>

					<tbody>

						{loading && (

							<tr>
								<td colSpan={6}>
									Loading...
								</td>
							</tr>

						)}

						{!loading &&
							appliedProducts.length === 0 && (

								<tr>
									<td colSpan={6}>
										No applied products found.
									</td>
								</tr>

							)}

						{!loading &&
							appliedProducts.map(item => {

								const itemId =
									getAppliedProductId(
										item
									);

								const editedItem =
									editedProducts[
										itemId
									];

								return (

									<tr
										key={itemId}
										className={
											isEditing
												? "editing"
												: ""
										}
									>

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

											{isEditing ? (

												<input
													type="number"
													min="0.01"
													step="any"
													value={
														editedItem
															?.quantity ??
														""
													}
													onChange={
														event =>
															updateEditedProduct(
																itemId,
																"quantity",
																event
																	.target
																	.value
															)
													}
												/>

											) : (

												item.quantity ??
												"-"

											)}

										</td>

										<td>

											<input
												type="checkbox"
												checked={
													isEditing
														? Boolean(
															editedItem
																?.is_applied
														)
														: Number(
															item.is_applied
														) === 1
												}
												onChange={
													event =>
														updateEditedProduct(
															itemId,
															"is_applied",
															event
																.target
																.checked
														)
												}
												disabled={
													!isEditing
												}
											/>

										</td>

										<td>

											{!isEditing && (

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

											)}

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
