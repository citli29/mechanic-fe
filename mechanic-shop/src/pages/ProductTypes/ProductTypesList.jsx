import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ProductTypesList() {

	const [productTypes, setProductTypes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
	});

	const [editing, setEditing] = useState(null);

	const [creating, setCreating] = useState(false);

	const [newName, setNewName] = useState("");

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});

	function showMessage(type, text) {
		setMessage({
			type,
			text,
		});

		setTimeout(() => {
			setMessage({
				type: "",
				text: "",
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
		loadProductTypes();
	}, []);

	useEffect(() => {

		const timer = setTimeout(() => {
			loadProductTypes();
		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);

	async function loadProductTypes() {

		try {

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/product_types", {
				params
			});

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
			[e.target.name]: e.target.value,
		});

	}

	function editProductType(productType) {

		setEditing({
			...productType,
		});

	}

	function updateEdit(e) {

		setEditing({
			...editing,
			[e.target.name]: e.target.value,
		});

	}

	async function saveProductType() {

		if (!editing.name.trim()) {
			showMessage("error", "Name is required.");
			return;
		}

		try {

			await api.put(
				`/product_types/${editing.id}`,
				{
					name: editing.name,
				}
			);

			showMessage(
				"success",
				"Product type updated successfully."
			);

			setEditing(null);

			loadProductTypes();

		}
		catch (err) {
			handleApiError(err);
		}
	}

	async function createProductType() {

		if (!newName.trim()) {
			showMessage("error", "Name is required.");
			return;
		}

		try {

			await api.post(
				"/product_types",
				{
					name: newName,
				}
			);

			showMessage(
				"success",
				"Product type created successfully."
			);

			setNewName("");

			setCreating(false);

			loadProductTypes();

		}
		catch (err) {
			handleApiError(err);
		}
	}

	async function deleteProductType(id) {

		if (!window.confirm("Delete this product type?"))
			return;

		try {

			await api.delete(
				`/product_types/${id}`
			);

			showMessage(
				"success",
				"Product type deleted successfully."
			);

			loadProductTypes();

		}
		catch (err) {
			handleApiError(err);
		}
	}

	function clearFilters() {

		setFilters({
			name: "",
		});

	}
	return (
		<div className="container">

			<h1>Product Types</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			<div className="filters">

				<input
					name="name"
					placeholder="Product Type"
					value={filters.name}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Clear
				</button>

				{!creating && (

					<button
						onClick={() => setCreating(true)}
					>
						Add 
					</button>

				)}

			</div>

			<div className="table-wrapper">

			<table className="table">

				<thead>
					<tr>
						<th>Name</th>
						<th></th>
					</tr>
				</thead>

				<tbody>

					{creating && (
						<tr className="editing">

							<td>
								<input
									placeholder="Product Type"
									value={newName}
									onChange={(e) =>
										setNewName(e.target.value)
									}
								/>
							</td>

							<td>

								<div className="container-buttons">

									<button onClick={createProductType}>
										Add
									</button>

									<button
										onClick={() => {
											setCreating(false);
											setNewName("");
										}}
									>
										X
									</button>

								</div>

							</td>

						</tr>
					)}

					{productTypes.map(productType => (

						editing?.id === productType.id ? (

							<tr
								key={productType.id}
								className="editing"
							>

								<td>
									<input
										name="name"
										value={editing.name}
										onChange={updateEdit}
									/>
								</td>

								<td>

									<div className="container-buttons">

										<button onClick={saveProductType}>
											Save
										</button>

										<button
											onClick={() => setEditing(null)}
										>
											X
										</button>

									</div>

								</td>

							</tr>

						) : (

								<tr key={productType.id}>

									<td>
										{productType.name}
									</td>

									<td>

										<div className="container-buttons">

											<button
												onClick={() =>
													editProductType(productType)
												}
											>
												Edit
											</button>

											<button
												className="delete-btn"
												onClick={() =>
													deleteProductType(productType.id)
												}
											>
												Delete
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
