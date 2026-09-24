import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/CarsList.css";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 10;

const emptyCar = {
	plate: "",
	make_id: "",
	model_id: "",
	month: "",
	year: "",
	cc: "",
	engine_code: "",
	color_code: "",
	chassi_nr: "",
};

export default function CarsList() {

	const requestIdRef = useRef(0);

	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [filters, setFilters] = useState({
		plate: "",
		year: "",
		month: "",
		make_id: "",
		model_name: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creatingCar, setCreatingCar] = useState(false);

	const [creatingMake, setCreatingMake] = useState(false);
	const [creatingModel, setCreatingModel] = useState(false);
	const [newMakeName, setNewMakeName] = useState("");
	const [newModelName, setNewModelName] = useState("");

	const [newCar, setNewCar] = useState(emptyCar);

	function handleApiError(err) {
		console.error(err);
	}


	useEffect(() => {
		loadCars();
		loadMakes();
	}, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadCars();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadCars() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/cars", { params });

			if (requestId !== requestIdRef.current) return;

			setCars(res.data.car_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.car_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setCars([]);
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


	async function loadModels(make_id) {
		if (!make_id) {
			setModels([]);
			return;
		}

		try {
			const res = await api.get("/models", { params: { make_id } });
			setModels(res.data.model_list || []);
		} catch (err) {
			console.error(err);
			setModels([]);
		}
	}


	async function createMake() {
		if (!newMakeName.trim()) return;

		try {
			const res = await api.post("/makes", { name: newMakeName });
			const newMake = res.data.make;

			setMakes((prev) => [...prev, newMake]);

			if (creatingCar) {
				setNewCar((prev) => ({ ...prev, make_id: newMake.id, model_id: "" }));
			}

			if (editing) {
				setEditing((prev) => ({ ...prev, make_id: newMake.id, model_id: "" }));
			}

			setModels([]);
			setNewMakeName("");
			setCreatingMake(false);

			pushSuccessToast("Marca criada com sucesso.");
		} catch (err) {
			handleApiError(err);
		}
	}


	async function createModel() {
		const make_id = creatingCar ? newCar.make_id : editing?.make_id;

		if (!newModelName.trim() || !make_id) return;

		try {
			const res = await api.post("/models", { name: newModelName, make_id });
			const newModel = res.data.model;

			setModels((prev) => [...prev, newModel]);

			if (creatingCar) {
				setNewCar((prev) => ({ ...prev, model_id: newModel.id }));
			}

			if (editing) {
				setEditing((prev) => ({ ...prev, model_id: newModel.id }));
			}

			setNewModelName("");
			setCreatingModel(false);

			pushSuccessToast("Modelo criado com sucesso.");
		} catch (err) {
			handleApiError(err);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function editCar(car) {
		setEditing({ ...car });
		loadModels(car.make_id);
	}


	function updateNewCar(e) {
		const { name, value } = e.target;

		setNewCar((prev) => ({
			...prev,
			[name]: value,
			...(name === "make_id" ? { model_id: "" } : {}),
		}));

		if (name === "make_id") {
			loadModels(value);
		}
	}


	function updateEdit(e) {
		const { name, value } = e.target;

		setEditing((prev) => ({
			...prev,
			[name]: value,
			...(name === "make_id" ? { model_id: "" } : {}),
		}));

		if (name === "make_id") {
			loadModels(value);
		}
	}


	async function saveCar() {
		try {
			const data = Object.fromEntries(
				Object.entries(editing).filter(([_, value]) => value !== "")
			);

			await api.put(`/cars/${editing.id}`, data);

			pushSuccessToast("Viatura atualizada com sucesso.");

			setEditing(null);

			loadCars();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function createCar() {
		if (!newCar.plate.trim()) {
			pushErrorToast("A matrícula é obrigatória.");
			return;
		}

		if (!newCar.make_id) {
			pushErrorToast("Selecione uma marca.");
			return;
		}

		try {
			const data = Object.fromEntries(
				Object.entries(newCar).filter(([_, value]) => value !== "")
			);

			await api.post("/cars", data);

			pushSuccessToast("Viatura criada com sucesso.");

			setCreatingCar(false);
			setNewCar(emptyCar);

			loadCars();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteCar(id, plate) {
		const confirmed = window.confirm(`Apagar "${plate}"?`);
		if (!confirmed) return;

		try {
			await api.delete(`/cars/${id}`);

			pushSuccessToast("Viatura apagada com sucesso.");

			loadCars();
		} catch (err) {
			handleApiError(err);
		}
	}


	function clearFilters() {
		setFilters({ plate: "", year: "", month: "", make_id: "", model_name: "" });
	}

	function renderMakeField(value, onChange) {
		if (creatingMake) {
			return (
				<div className="inline-create">
					<input
						placeholder="Nova Marca"
						value={newMakeName}
						onChange={(e) => setNewMakeName(e.target.value)}
					/>

					<div className="create-buttons">
						<button className="confirm" onClick={createMake}>
							<i className="fa-solid fa-check" />
						</button>
						<button
							className="cancel"
							onClick={() => {
								setCreatingMake(false);
								setNewMakeName("");
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
				name="make_id"
				value={value || ""}
				onChange={(e) => {
					if (e.target.value === "new") {
						setCreatingMake(true);
						return;
					}

					onChange(e);
				}}
			>
				<option value="">Marca</option>
				<option value="new">+ Adicionar Marca</option>

				{makes.map((make) => (
					<option key={make.id} value={make.id}>
						{make.name}
					</option>
				))}
			</select>
		);
	}

	function renderModelField(makeId, value, onChange) {
		if (creatingModel) {
			return (
				<div className="inline-create">
					<input
						placeholder="Novo Modelo"
						value={newModelName}
						onChange={(e) => setNewModelName(e.target.value)}
					/>

					<div className="create-buttons">
						<button className="confirm" onClick={createModel}>
							<i className="fa-solid fa-check" />
						</button>
						<button
							className="cancel"
							onClick={() => {
								setCreatingModel(false);
								setNewModelName("");
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
				name="model_id"
				value={value || ""}
				onChange={(e) => {
					if (e.target.value === "new") {
						setCreatingModel(true);
						return;
					}

					onChange(e);
				}}
			>
				<option value="">Modelo</option>

				{models.map((model) => (
					<option key={model.id} value={model.id}>
						{model.name}
					</option>
				))}

				{makeId && <option value="new">+ Adicionar Modelo</option>}
			</select>
		);
	}

	return (
		<div className="page cars-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-car" />
						<h1>Viaturas</h1>
					</div>

					<div className="body">

						<div className="filters">
							<input
								name="plate"
								placeholder="Matrícula"
								value={filters.plate}
								onChange={updateFilter}
							/>

							<input
								name="year"
								placeholder="Ano"
								value={filters.year}
								onChange={updateFilter}
							/>

							<input
								name="month"
								placeholder="Mês"
								value={filters.month}
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

							<input
								name="model_name"
								placeholder="Modelo"
								value={filters.model_name}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							{!creatingCar && (
								<button
									className="confirm"
									onClick={() => {
										setCreatingCar(true);
										setNewCar(emptyCar);
										setModels([]);
									}}
								>
									<i className="fa-solid fa-plus" /> Adicionar Viatura
								</button>
							)}
						</div>

						<table>
							<thead>
								<tr>
									<th>Matrícula</th>
									<th>Marca</th>
									<th>Modelo</th>
									<th>Mês</th>
									<th>Ano</th>
									<th>CC</th>
									<th>Cod. Motor</th>
									<th>Cod. Cor</th>
									<th>Nr. Chassi</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{creatingCar && (
									<tr className="editing">
										<td data-label="Matrícula">
											<input
												name="plate"
												value={newCar.plate}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="Marca">
											{renderMakeField(newCar.make_id, updateNewCar)}
										</td>

										<td data-label="Modelo">
											{renderModelField(newCar.make_id, newCar.model_id, updateNewCar)}
										</td>

										<td data-label="Mês">
											<input
												name="month"
												value={newCar.month}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="Ano">
											<input
												name="year"
												value={newCar.year}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="CC">
											<input
												name="cc"
												value={newCar.cc}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="Cod. Motor">
											<input
												name="engine_code"
												value={newCar.engine_code}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="Cod. Cor">
											<input
												name="color_code"
												value={newCar.color_code}
												onChange={updateNewCar}
											/>
										</td>

										<td data-label="Nr. Chassi">
											<input
												name="chassi_nr"
												value={newCar.chassi_nr}
												onChange={updateNewCar}
											/>
										</td>

										<td className="actions">
											<button className="confirm" onClick={createCar}>
												<i className="fa-solid fa-check" />
											</button>
											<button
												className="cancel"
												onClick={() => {
													setCreatingCar(false);
													setCreatingMake(false);
													setCreatingModel(false);
													setNewCar(emptyCar);
												}}
											>
												<i className="fa-solid fa-x" />
											</button>
										</td>
									</tr>
								)}

								{cars.map((car) => (
									editing?.id === car.id ? (
										<tr key={car.id} className="editing">
											<td data-label="Matrícula">
												<input
													name="plate"
													value={editing.plate || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Marca">
												{renderMakeField(editing.make_id, updateEdit)}
											</td>

											<td data-label="Modelo">
												{renderModelField(editing.make_id, editing.model_id, updateEdit)}
											</td>

											<td data-label="Mês">
												<input
													name="month"
													value={editing.month || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Ano">
												<input
													name="year"
													value={editing.year || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="CC">
												<input
													name="cc"
													value={editing.cc || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Cod. Motor">
												<input
													name="engine_code"
													value={editing.engine_code || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Cod. Cor">
												<input
													name="color_code"
													value={editing.color_code || ""}
													onChange={updateEdit}
												/>
											</td>

											<td data-label="Nr. Chassi">
												<input
													name="chassi_nr"
													value={editing.chassi_nr || ""}
													onChange={updateEdit}
												/>
											</td>

											<td className="actions">
												<button className="confirm" onClick={saveCar}>
													<i className="fa-solid fa-check" />
												</button>
												<button
													className="cancel"
													onClick={() => {
														setEditing(null);
														setCreatingMake(false);
														setCreatingModel(false);
													}}
												>
													<i className="fa-solid fa-x" />
												</button>
											</td>
										</tr>
									) : (
										<tr key={car.id}>
											<td data-label="Matrícula"><span className="cell-truncate" title={car.plate}>{car.plate}</span></td>
											<td data-label="Marca"><span className="cell-truncate" title={car.make_name}>{car.make_name}</span></td>
											<td data-label="Modelo"><span className="cell-truncate" title={car.model_name}>{car.model_name}</span></td>
											<td data-label="Mês"><span className="cell-truncate" title={car.month}>{car.month}</span></td>
											<td data-label="Ano"><span className="cell-truncate" title={car.year}>{car.year}</span></td>
											<td data-label="CC"><span className="cell-truncate" title={car.cc}>{car.cc}</span></td>
											<td data-label="Cod. Motor"><span className="cell-truncate" title={car.engine_code}>{car.engine_code}</span></td>
											<td data-label="Cod. Cor"><span className="cell-truncate" title={car.color_code}>{car.color_code}</span></td>
											<td data-label="Nr. Chassi"><span className="cell-truncate" title={car.chassi_nr}>{car.chassi_nr}</span></td>

											<td className="actions">
												<Link className="options" to={`/cars/${car.id}`}>
													<i className="fa-solid fa-arrow-up-right-from-square" />
												</Link>
												<button className="options" onClick={() => editCar(car)}>
													<i className="fa-solid fa-pencil" />
												</button>
												<button
													className="cancel"
													onClick={() => deleteCar(car.id, car.plate)}
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

							<span>Página {page} de {totalPages} ({total} viaturas)</span>

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
