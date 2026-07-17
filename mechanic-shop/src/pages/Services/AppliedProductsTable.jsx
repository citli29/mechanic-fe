import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AppliedProductsTable({

	serviceId,
	showMessage,
	handleApiError

}) {

	const emptyAppliedProduct = {
		product_id: "",
		quantity: 1,
		is_applied: 1,
	};

	const [appliedProducts, setAppliedProducts] = useState([]);
	const [products, setProducts] = useState([]);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newAppliedProduct, setNewAppliedProduct] = useState(
		emptyAppliedProduct
	);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {

		loadData();

	}, [serviceId]);

	async function loadData() {

		setLoading(true);

		try {

			await Promise.all([
				loadAppliedProducts(),
				loadProducts(),
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

	function getAppliedProductId(appliedProduct) {

		return (
			appliedProduct.service_applied_product_id ||
			appliedProduct.applied_product_id ||
			appliedProduct.sap_id ||
			appliedProduct.id
		);

	}

	function getProduct(productId) {

		return products.find(
			product =>
				Number(product.id) ===
				Number(productId)
		);

	}

	function getProductName(appliedProduct) {

		const product = getProduct(
			appliedProduct.product_id
		);

		return (
			appliedProduct.product_name ||
			appliedProduct.name ||
			product?.name ||
			"-"
		);

	}

	function getProductReference(appliedProduct) {

		const product = getProduct(
			appliedProduct.product_id
		);

		return (
			appliedProduct.product_reference ||
			appliedProduct.reference ||
			product?.reference ||
			"-"
		);

	}

	function getProductType(appliedProduct) {

		const product = getProduct(
			appliedProduct.product_id
		);

		return (
			appliedProduct.product_type_name ||
			appliedProduct.type_name ||
			appliedProduct.product_type ||
			product?.product_type_name ||
			product?.type_name ||
			product?.type ||
			"-"
		);

	}

	function updateNewAppliedProduct(e) {

		const { name, value } = e.target;

		setNewAppliedProduct({
			...newAppliedProduct,
			[name]: value,
		});

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});

	}

	function beginCreating() {

		setEditing(null);
		setCreating(true);

		setNewAppliedProduct({
			...emptyAppliedProduct,
		});

	}

	function cancelCreating() {

		setCreating(false);

		setNewAppliedProduct({
			...emptyAppliedProduct,
		});

	}

	function editAppliedProduct(appliedProduct) {

		setCreating(false);

		setEditing({
			id:
				getAppliedProductId(
					appliedProduct
				),

			product_id:
				appliedProduct.product_id || "",

			quantity:
				appliedProduct.quantity ?? 1,

			is_applied:
				Number(appliedProduct.is_applied) === 0
					? 0
					: 1,
		});

	}

	function validateAppliedProduct(appliedProduct) {

		if (!appliedProduct.product_id) {

			showMessage?.(
				"error",
				"Please select a product."
			);

			return false;

		}

		if (
			appliedProduct.quantity === "" ||
			Number(appliedProduct.quantity) < 1
		) {

			showMessage?.(
				"error",
				"Quantity must be at least 1."
			);

			return false;

		}

		return true;

	}

	async function createAppliedProduct() {

		if (
			!validateAppliedProduct(
				newAppliedProduct
			)
		) {

			return;

		}

		setSaving(true);

		try {

			await api.post(
				`/services/${serviceId}/applied_products`,
				{
					service_id:
						Number(serviceId),

					product_id:
						Number(
							newAppliedProduct.product_id
						),

					quantity:
						Number(
							newAppliedProduct.quantity
						),

					is_applied:
						Number(
							newAppliedProduct.is_applied
						),
				}
			);

			showMessage?.(
				"success",
				"Applied product created successfully."
			);

			setCreating(false);

			setNewAppliedProduct({
				...emptyAppliedProduct,
			});

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function saveAppliedProduct() {

		if (!validateAppliedProduct(editing)) {
			return;
		}

		setSaving(true);

		try {

			await api.put(
				`/services/${serviceId}/applied_products/${editing.id}`,
				{
					service_id:
						Number(serviceId),

					product_id:
						Number(editing.product_id),

					quantity:
						Number(editing.quantity),

					is_applied:
						Number(editing.is_applied),
				}
			);

			showMessage?.(
				"success",
				"Applied product updated successfully."
			);

			setEditing(null);

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function deleteAppliedProduct(
		id,
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
				`/services/${serviceId}/applied_products/${id}`
			);

			showMessage?.(
				"success",
				"Applied product deleted successfully."
			);

			if (editing?.id === id) {

				setEditing(null);

			}

			await loadAppliedProducts();

		}
		catch (err) {

			handleError(err);

		}

	}

	return (

		<div>

			<div className="table-title">

				<h2>Applied Products</h2>

				{!creating && (

					<button
						type="button"
						onClick={beginCreating}
					>
						Add Applied Product
					</button>

				)}

			</div>

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
						appliedProducts.length === 0 &&
						!creating && (

							<tr>

								<td colSpan={6}>
									No applied products found.
								</td>

							</tr>

						)}

					{!loading &&
						appliedProducts.map(
							appliedProduct => {

								const appliedProductId =
									getAppliedProductId(
										appliedProduct
									);

								if (
									editing?.id ===
									appliedProductId
								) {

									const selectedProduct =
										getProduct(
											editing.product_id
										);

									return (

										<tr
											key={appliedProductId}
											className="editing"
										>

											<td>

												<select
													name="product_id"
													value={
														editing.product_id
													}
													onChange={
														updateEdit
													}
												>

													<option value="">
														Select Product
													</option>

													{products.map(
														product => (

															<option
																key={
																	product.id
																}
																value={
																	product.id
																}
															>
																{product.name}
															</option>

														)
													)}

												</select>

											</td>

											<td>
												{selectedProduct
													?.reference ||
													"-"}
											</td>

											<td>
												{selectedProduct
													?.product_type_name ||
													selectedProduct
														?.type_name ||
													selectedProduct
														?.type ||
													"-"}
											</td>

											<td>

												<input
													type="number"
													name="quantity"
													min="1"
													value={
														editing.quantity
													}
													onChange={
														updateEdit
													}
												/>

											</td>

											<td>

												<select
													name="is_applied"
													value={
														editing.is_applied
													}
													onChange={
														updateEdit
													}
												>

													<option value={1}>
														Yes
													</option>

													<option value={0}>
														No
													</option>

												</select>

											</td>

											<td>

												<div className="container-buttons">

													<button
														type="button"
														onClick={
															saveAppliedProduct
														}
														disabled={saving}
													>
														{saving
															? "Saving..."
															: "Save"}
													</button>

													<button
														type="button"
														onClick={() =>
															setEditing(null)
														}
														disabled={saving}
													>
														X
													</button>

												</div>

											</td>

										</tr>

									);

								}

								return (

									<tr key={appliedProductId}>

										<td>
											{getProductName(
												appliedProduct
											)}
										</td>

										<td>
											{getProductReference(
												appliedProduct
											)}
										</td>

										<td>
											{getProductType(
												appliedProduct
											)}
										</td>

										<td>
											{appliedProduct.quantity ??
												"-"}
										</td>

										<td>
											{Number(
												appliedProduct.is_applied
											) === 1
												? "Yes"
												: "No"}
										</td>

										<td>

											<div className="container-buttons">

												<button
													type="button"
													onClick={() =>
														editAppliedProduct(
															appliedProduct
														)
													}
												>
													Edit
												</button>

												<button
													type="button"
													className="delete-btn"
													onClick={() =>
														deleteAppliedProduct(
															appliedProductId,
															getProductName(
																appliedProduct
															)
														)
													}
												>
													Delete
												</button>

											</div>

										</td>

									</tr>

								);

							}
						)}

					{creating && (

						<tr className="editing">

							<td>

								<select
									name="product_id"
									value={
										newAppliedProduct.product_id
									}
									onChange={
										updateNewAppliedProduct
									}
								>

									<option value="">
										Select Product
									</option>

									{products.map(product => (

										<option
											key={product.id}
											value={product.id}
										>
											{product.name}
										</option>

									))}

								</select>

							</td>

							<td>
								{getProduct(
									newAppliedProduct.product_id
								)?.reference || "-"}
							</td>

							<td>
								{getProduct(
									newAppliedProduct.product_id
								)?.product_type_name ||
									getProduct(
										newAppliedProduct.product_id
									)?.type_name ||
									getProduct(
										newAppliedProduct.product_id
									)?.type ||
									"-"}
							</td>

							<td>

								<input
									type="number"
									name="quantity"
									min="1"
									value={
										newAppliedProduct.quantity
									}
									onChange={
										updateNewAppliedProduct
									}
								/>

							</td>

							<td>

								<select
									name="is_applied"
									value={
										newAppliedProduct.is_applied
									}
									onChange={
										updateNewAppliedProduct
									}
								>

									<option value={1}>
										Yes
									</option>

									<option value={0}>
										No
									</option>

								</select>

							</td>

							<td>

								<div className="container-buttons">

									<button
										type="button"
										onClick={
											createAppliedProduct
										}
										disabled={saving}
									>
										{saving
											? "Adding..."
											: "Add"}
									</button>

									<button
										type="button"
										onClick={
											cancelCreating
										}
										disabled={saving}
									>
										X
									</button>

								</div>

							</td>

						</tr>

					)}

				</tbody>

			</table>

		</div>

	);

}
