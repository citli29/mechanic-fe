import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function MakesList() {

	const [makes, setMakes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
	});

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newMakeName, setNewMakeName] = useState("");

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
		} else {
			showMessage(
				"error",
				"Something went wrong."
			);
		}

		console.error(err);
	}


	useEffect(() => {
		loadMakes();
	}, []);


	useEffect(() => {
		const timer = setTimeout(() => {
			loadMakes();
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadMakes() {
		try {

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/makes", {
				params,
			});

			setMakes(res.data.make_list || []);

		} catch (err) {
			console.error(err);
			setMakes([]);
		}
	}


	async function createMake() {

		if (!newMakeName.trim())
			return;

		try {

			await api.post("/makes", {
				name: newMakeName,
			});

			showMessage(
				"success",
				"Make created successfully."
			);

			setNewMakeName("");
			setCreating(false);

			loadMakes();

		} catch (err) {
			handleApiError(err);
		}
	}


	function editMake(make) {
		setEditing({
			...make,
		});
	}


	function updateEdit(e) {
		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});
	}


	async function saveMake() {

		try {

			const data = Object.fromEntries(
				Object.entries(editing)
					.filter(([_, value]) => value !== "")
			);

			await api.put(
				`/makes/${editing.id}`,
				data
			);

			showMessage(
				"success",
				"Make updated successfully."
			);

			setEditing(null);

			loadMakes();

		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteMake(id, name) {

		const confirmed = window.confirm(
			`Delete "${name}"?`
		);

		if (!confirmed)
			return;

		try {

			await api.delete(`/makes/${id}`);

			showMessage(
				"success",
				"Make deleted successfully."
			);

			loadMakes();

		} catch (err) {
			handleApiError(err);
		}
	}


	function updateFilter(e) {

		setFilters({
			...filters,
			[e.target.name]: e.target.value,
		});
	}


	function clearFilters() {

		setFilters({
			name: "",
		});
	}

	return (
		<div className="container">

			<h1>Marcas</h1>

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

				<button onClick={clearFilters}>
					Limpar
				</button>

				{!creating && (
					<button onClick={() => setCreating(true)}>
						Adicionar Marca
					</button>
				)}

			</div>

			<div className="table-wrapper">

			<table className="table">

				<thead>
					<tr>
						<th>Marca</th>
						<th></th>
					</tr>
				</thead>

				<tbody>

					{creating && (
						<tr className="editing">

							<td>
								<input
									placeholder="Marca"
									value={newMakeName}
									onChange={(e) => setNewMakeName(e.target.value)}
								/>
							</td>

							<td>
								<div className="container-buttons">

									<button onClick={createMake}>
										Adicionar
									</button>

									<button
										onClick={() => {
											setCreating(false);
											setNewMakeName("");
										}}
									>
										X
									</button>

								</div>
							</td>

						</tr>
					)}

					{makes.map((make) => (

						editing?.id === make.id ? (

							<tr
								key={make.id}
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
									<div className="container-buttons">

										<button onClick={saveMake}>
											Guardar
										</button>

										<button onClick={() => setEditing(null)}>
											X
										</button>

									</div>
								</td>

							</tr>

						) : (

								<tr key={make.id}>

									<td>{make.name}</td>

									<td>
										<div className="container-buttons">

											<button
												onClick={() => editMake(make)}
											>
												Editar
											</button>

											<button
												className="delete-btn"
												onClick={() =>
													deleteMake(
														make.id,
														make.name
													)
												}
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
