import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./ModelsList.css";

export default function ModelsList() {

	const [models, setModels] = useState([]);
	const [makes, setMakes] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		make_name: "",
	});

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
		loadModels();
		loadMakes();
	}, []);


	useEffect(() => {

		const timer = setTimeout(() => {
			loadModels();
		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);


	async function loadModels() {

		try {

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/models", {
				params,
			});

			setModels(res.data.model_list || []);

		} catch (err) {

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
			showMessage("error", "Model name is required.");
			return;
		}

		if (!newModel.make_id) {
			showMessage("error", "Please select a make.");
			return;
		}

		try {

			await api.post("/models", {
				name: newModel.name,
				make_id: newModel.make_id,
			});

			showMessage(
				"success",
				"Model created successfully."
			);

			setCreating(false);

			setNewModel({
				name: "",
				make_id: "",
			});

			loadModels();

		} catch (err) {
			handleApiError(err);
		}
	}


	function editModel(model) {

		setEditing({
			...model,
		});
	}


	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});
	}


	async function saveModel() {

		try {

			const data = Object.fromEntries(
				Object.entries(editing)
					.filter(([_, value]) => value !== "")
			);

			await api.put(
				`/models/${editing.id}`,
				data
			);

			showMessage(
				"success",
				"Model updated successfully."
			);

			setEditing(null);

			loadModels();

		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteModel(id, name) {

		const confirmed = window.confirm(
			`Delete "${name}"?`
		);

		if (!confirmed)
			return;

		try {

			await api.delete(`/models/${id}`);

			showMessage(
				"success",
				"Model deleted successfully."
			);

			loadModels();

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


	function updateNewModel(e) {

		const { name, value } = e.target;

		setNewModel({
			...newModel,
			[name]: value,
		});
	}


	function clearFilters() {

		setFilters({
			name: "",
			make_name: "",
		});
	}

	return (
		<div className="container">

			<h1>Models</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			<div className="filters">

				<input
					name="name"
					placeholder="Model"
					value={filters.name}
					onChange={updateFilter}
				/>

				<input
					name="make_name"
					placeholder="Make"
					value={filters.make_name}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Clear
				</button>

				{!creating && (
					<button onClick={() => setCreating(true)}>
						Add Model
					</button>
				)}

			</div>

			<table className="table">

				<thead>
					<tr>
						<th>Model</th>
						<th>Make</th>
						<th></th>
					</tr>
				</thead>

				<tbody>

					{creating && (
						<tr className="editing">

							<td>
								<input
									name="name"
									placeholder="Model name"
									value={newModel.name}
									onChange={updateNewModel}
								/>
							</td>

							<td>
								<select
									name="make_id"
									value={newModel.make_id}
									onChange={updateNewModel}
								>
									<option value="">
										Select Make
									</option>

									{makes.map(make => (
										<option
											key={make.id}
											value={make.id}
										>
											{make.name}
										</option>
									))}
								</select>
							</td>

							<td>
								<div className="container-buttons">

									<button onClick={createModel}>
										Add
									</button>

									<button
										onClick={() => {
											setCreating(false);

											setNewModel({
												name: "",
												make_id: "",
											});
										}}
									>
										X
									</button>

								</div>
							</td>

						</tr>
					)}

					{models.map(model => (

						editing?.id === model.id ? (

							<tr
								key={model.id}
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
									<select
										name="make_id"
										value={editing.make_id || ""}
										onChange={updateEdit}
									>

										<option value="">
											Select Make
										</option>

										{makes.map(make => (
											<option
												key={make.id}
												value={make.id}
											>
												{make.name}
											</option>
										))}

									</select>
								</td>

								<td>
									<div className="container-buttons">

										<button onClick={saveModel}>
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

								<tr key={model.id}>

									<td>{model.name}</td>

									<td>{model.make_name}</td>

									<td>
										<div className="container-buttons">

											<button
												onClick={() => editModel(model)}
											>
												Edit
											</button>

											<button
												className="delete-btn"
												onClick={() =>
													deleteModel(
														model.id,
														model.name
													)
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
	);
}
