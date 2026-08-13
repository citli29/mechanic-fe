import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";

const emptyCar = {
	id: "",
	plate: "",
	make_id: "",
	model_id: "",
	chassi_nr: "",
	year: "",
	month: "",
	cc: "",
	engine_code: "",
	color_code: "",
};

function useFocusWhen(active, ref) {
	useEffect(() => {
		if (active) ref.current?.focus();
	}, [active, ref]);
}

export default function CarPicker() {
	// Arrays
	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	// Search inputs
	const [searchCars, setSearchCars] = useState("");
	const [searchMakes, setSearchMakes] = useState("");
	const [searchModels, setSearchModels] = useState("");

	// Selected objects
	const [selectedCar, setSelectedCar] = useState(null);
	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);

	// Forms
	const [presentingCar, setPresentingCar] = useState(emptyCar);
	const [makeName, setMakeName] = useState("");
	const [modelName, setModelName] = useState("");

	// Modes: idle | creating | editing
	const [carMode, setCarMode] = useState("idle");
	const [makeMode, setMakeMode] = useState("idle");
	const [modelMode, setModelMode] = useState("idle");

	const isCreatingCar = carMode === "creating";
	const isEditingCar = carMode === "editing";
	const isCreatingMake = makeMode === "creating";
	const isEditingMake = makeMode === "editing";
	const isCreatingModel = modelMode === "creating";
	const isEditingModel = modelMode === "editing";

	const isCarFormEditable = carMode !== "idle";
	const isMakePickerEnabled = isCarFormEditable;
	const isMakeFormEditable = isCarFormEditable && makeMode !== "idle";
	const isModelPickerEnabled = isCarFormEditable && Boolean(selectedMake);
	const isModelFormEditable = isModelPickerEnabled && modelMode !== "idle";

	// Dropdowns
	const [isCarPickerSelected, setIsCarPickerSelected] = useState(false);
	const [isMakePickerSelected, setIsMakePickerSelected] = useState(false);
	const [isModelPickerSelected, setIsModelPickerSelected] = useState(false);

	// Refs
	const carInput = useRef(null);
	const carPicker = useRef(null);
	const makePicker = useRef(null);
	const modelPicker = useRef(null);
	const carAddFormInput = useRef(null);
	const carEditFormInput = useRef(null);
	const makeAddFormInput = useRef(null);
	const makeEditFormInput = useRef(null);
	const modelAddFormInput = useRef(null);
	const modelEditFormInput = useRef(null);

	useFocusWhen(isCreatingCar, carAddFormInput);
	useFocusWhen(isEditingCar, carEditFormInput);
	useFocusWhen(isCreatingMake, makeAddFormInput);
	useFocusWhen(isEditingMake, makeEditFormInput);
	useFocusWhen(isCreatingModel, modelAddFormInput);
	useFocusWhen(isEditingModel, modelEditFormInput);

	// GET requests
	async function loadCars() {
		try {
			const response = await api.get("/cars", {
				params: { plate: searchCars },
			});
			setCars(response.data?.car_list ?? []);
		} catch (error) {
			console.error(error);
		}
	}

	async function loadMakes() {
		try {
			const response = await api.get("/makes", {
				params: { name: searchMakes },
			});
			setMakes(response.data?.make_list ?? []);
		} catch (error) {
			console.error(error);
		}
	}

	async function loadModels() {
		if (!selectedMake) {
			setModels([]);
			return;
		}

		try {
			const response = await api.get("/models", {
				params: {
					name: searchModels,
					make_id: selectedMake.id,
				},
			});
			setModels(response.data?.model_list ?? []);
		} catch (error) {
			console.error(error);
		}
	}

	useEffect(() => {
		loadCars();
	}, [searchCars]);

	useEffect(() => {
		loadMakes();
	}, [searchMakes]);

	useEffect(() => {
		loadModels();
	}, [selectedMake, searchModels]);

	useEffect(() => {
		setMakeName(selectedMake?.name ?? "");
	}, [selectedMake]);

	useEffect(() => {
		setModelName(selectedModel?.name ?? "");
	}, [selectedModel]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (carPicker.current && !carPicker.current.contains(event.target)) {
				setIsCarPickerSelected(false);
			}
			if (makePicker.current && !makePicker.current.contains(event.target)) {
				setIsMakePickerSelected(false);
			}
			if (modelPicker.current && !modelPicker.current.contains(event.target)) {
				setIsModelPickerSelected(false);
			}
		}

		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	// Helpers
	function handleCarFieldChange(field, value) {
		setPresentingCar((prev) => ({
			...prev,
			[field]: value,
		}));
	}

	function getCarPayload() {
		return {
			plate: presentingCar.plate,
			make_id: selectedMake?.id ?? "",
			model_id: selectedModel?.id ?? "",
			chassi_nr: presentingCar.chassi_nr,
			month: presentingCar.month,
			year: presentingCar.year,
			cc: presentingCar.cc,
			engine_code: presentingCar.engine_code,
			color_code: presentingCar.color_code,
		};
	}

	function setCarRelations(car) {
		setSelectedMake(
			car?.make_id
				? { id: car.make_id, name: car.make_name }
				: null
		);
		setSelectedModel(
			car?.model_id
				? { id: car.model_id, name: car.model_name }
				: null
		);
	}

	function resetModel() {
		setSelectedModel(null);
		setModelName("");
		setModelMode("idle");
		setIsModelPickerSelected(false);
	}

	function resetMake() {
		setSelectedMake(null);
		setMakeName("");
		setMakeMode("idle");
		setIsMakePickerSelected(false);
		resetModel();
	}

	function resetCar() {
		setSelectedCar(null);
		setPresentingCar(emptyCar);
		setCarMode("idle");
		setIsCarPickerSelected(false);
		resetMake();
	}

	// Selecting from dropdowns
	function handleCarSelectedClick(car) {
		setSelectedCar(car);
		setPresentingCar(car);
		setCarRelations(car);
		setCarMode("idle");
		setIsCarPickerSelected(false);
	}

	function handleMakeSelectedClick(make) {
		setSelectedMake(make);
		setSelectedModel(null);
		setModelMode("idle");
		setIsMakePickerSelected(false);
	}

	function handleModelSelectedClick(model) {
		setSelectedModel(model);
		setIsModelPickerSelected(false);
	}

	// Cancel selected
	function handleCarSelectedClickCancel(e) {
		e.preventDefault();
		resetCar();
	}

	function handleMakeSelectedClickCancel(e) {
		e.preventDefault();
		resetMake();
	}

	function handleModelSelectedClickCancel(e) {
		e.preventDefault();
		resetModel();
	}

	// Start creating
	function handleCarIsAddClick() {
		const plate = searchCars;
		resetCar();
		setPresentingCar({ ...emptyCar, plate });
		setSearchCars("");
		setCarMode("creating");
	}

	function handleMakeIsAddClick() {
		const name = searchMakes;
		setSelectedMake(null);
		resetModel();
		setMakeName(name);
		setSearchMakes("");
		setMakeMode("creating");
		setIsMakePickerSelected(false);
	}

	function handleModelIsAddClick() {
		const name = searchModels;
		setSelectedModel(null);
		setModelName(name);
		setSearchModels("");
		setModelMode("creating");
		setIsModelPickerSelected(false);
	}

	// Cancel creating
	function handleCarIsAddClickCancel(e) {
		e.preventDefault();
		resetCar();
	}

	function handleMakeIsAddClickCancel(e) {
		e.preventDefault();
		resetMake();
	}

	function handleModelIsAddClickCancel(e) {
		e.preventDefault();
		resetModel();
	}

	// Start editing
	function handleCarIsEditClick(e) {
		e.preventDefault();
		if (!selectedCar) return;
		setPresentingCar(selectedCar);
		setCarMode("editing");
	}

	function handleMakeIsEditClick(e) {
		e.preventDefault();
		if (!selectedMake) return;
		setMakeName(selectedMake.name);
		setMakeMode("editing");
	}

	function handleModelIsEditClick(e) {
		e.preventDefault();
		if (!selectedModel) return;
		setModelName(selectedModel.name);
		setModelMode("editing");
	}

	// Cancel editing
	function handleCarIsEditClickCancel(e) {
		e.preventDefault();
		setPresentingCar(selectedCar ?? emptyCar);
		setCarMode("idle");
	}

	function handleMakeIsEditClickCancel(e) {
		e.preventDefault();
		setMakeName(selectedMake?.name ?? "");
		setMakeMode("idle");
	}

	function handleModelIsEditClickCancel(e) {
		e.preventDefault();
		setModelName(selectedModel?.name ?? "");
		setModelMode("idle");
	}

	// POST requests
	async function handleCarActionAdd(e) {
		e.preventDefault();

		if (!presentingCar.plate.trim()) {
			console.error("Preencha o campo: matrícula.");
			return;
		}

		try {
			const response = await api.post("/cars", getCarPayload());
			const car = response.data?.car;

			setSelectedCar(car);
			setPresentingCar(car);
			setCarRelations(car);
			setCarMode("idle");
			loadCars();
		} catch (error) {
			console.error(error);
		}
	}

	async function handleMakeActionAdd(e) {
		e.preventDefault();

		if (!makeName.trim()) {
			console.error("Preencha o campo: nome.");
			return;
		}

		try {
			const response = await api.post("/makes", { name: makeName });
			const make = response.data?.make;

			setSelectedMake(make);
			setMakeName(make.name);
			setMakeMode("idle");
			setSearchMakes("");
			loadMakes();
		} catch (error) {
			console.error(error);
		}
	}

	async function handleModelActionAdd(e) {
		e.preventDefault();

		if (!selectedMake) {
			console.error("Selecione a marca.");
			return;
		}
		if (!modelName.trim()) {
			console.error("Preencha o campo: nome.");
			return;
		}

		try {
			const response = await api.post("/models", {
				name: modelName,
				make_id: selectedMake.id,
			});
			const model = response.data?.model;

			setSelectedModel(model);
			setModelName(model.name);
			setModelMode("idle");
			setSearchModels("");
			loadModels();
		} catch (error) {
			console.error(error);
		}
	}

	// PUT requests
	async function handleCarActionEdit(e) {
		e.preventDefault();

		if (!selectedCar) {
			console.error("Selecione o carro.");
			return;
		}
		if (!presentingCar.plate.trim()) {
			console.error("Preencha o campo: matrícula.");
			return;
		}
		if (!selectedMake) {
			console.error("Selecione a marca.");
			return;
		}

		try {
			const response = await api.put(
				`/cars/${selectedCar.id}`,
				getCarPayload()
			);
			const car = response.data?.car;

			setSelectedCar(car);
			setPresentingCar(car);
			setCarRelations(car);
			setCarMode("idle");
			loadCars();
		} catch (error) {
			console.error(error);
		}
	}

	async function handleMakeActionEdit(e) {
		e.preventDefault();

		if (!selectedMake) {
			console.error("Selecione a marca.");
			return;
		}
		if (!makeName.trim()) {
			console.error("Preencha o campo: nome.");
			return;
		}

		try {
			const response = await api.put(`/makes/${selectedMake.id}`, {
				name: makeName,
			});
			const make = response.data?.make;

			setSelectedMake(make);
			setMakeName(make.name);
			setMakeMode("idle");
			loadMakes();
		} catch (error) {
			console.error(error);
		}
	}

	async function handleModelActionEdit(e) {
		e.preventDefault();

		if (!selectedModel) {
			console.error("Selecione o modelo.");
			return;
		}
		if (!selectedMake) {
			console.error("Selecione a marca.");
			return;
		}
		if (!modelName.trim()) {
			console.error("Preencha o campo: nome.");
			return;
		}

		try {
			const response = await api.put(`/models/${selectedModel.id}`, {
				name: modelName,
				make_id: selectedMake.id,
			});
			const model = response.data?.model;

			setSelectedModel(model);
			setModelName(model.name);
			setModelMode("idle");
			loadModels();
		} catch (error) {
			console.error(error);
		}
	}

	function showModelPicker() {
		return (
			<div className="model-picker-container">
				<div className="model-picker" ref={modelPicker}>
					<input
						type="text"
						value={searchModels}
						onChange={(e) => setSearchModels(e.target.value)}
						placeholder="Selecionar modelo"
						onClick={() => setIsModelPickerSelected(true)}
						disabled={!isModelPickerEnabled}
					/>

					{isModelPickerSelected && (
						<div className="dropdown-menu">
							<ul>
								<li onClick={handleModelIsAddClick}>Adicionar Modelo</li>
								{models.map((model) => (
									<li key={model.id} onClick={() => handleModelSelectedClick(model)}>
										{model.name}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="model-section">
					<label htmlFor="model-name">Modelo: </label>

					{isCreatingModel ? (
						<input
							id="model-name"
							type="text"
							ref={modelAddFormInput}
							value={modelName}
							onChange={(e) => setModelName(e.target.value)}
							disabled={!isModelFormEditable}
						/>
					) : (
						<input
							id="model-name"
							type="text"
							ref={modelEditFormInput}
							value={modelName}
							onChange={(e) => setModelName(e.target.value)}
							disabled={!isModelFormEditable}
						/>
					)}

					<div className="buttons-card">
						{isCreatingModel ? (
							<>
								<button className="confirm" onClick={handleModelActionAdd}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" onClick={handleModelIsAddClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : isEditingModel ? (
							<>
								<button className="confirm" id="model-edit-confirm" onClick={handleModelActionEdit}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" id="model-add-cancel" onClick={handleModelIsEditClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : (
							<>
								<button className="options" id="model-edit-start" disabled={!selectedModel} onClick={handleModelIsEditClick}>
									<i className="fa-solid fa-pen-to-square" />
								</button>
								<button className="cancel" id="model-select-cancel" disabled={!selectedModel} onClick={handleModelSelectedClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	function showMakePicker() {
		return (
			<div className="make-picker-container">
				<div className="make-picker" ref={makePicker}>
					<input
						type="text"
						value={searchMakes}
						onChange={(e) => setSearchMakes(e.target.value)}
						placeholder="Selecionar marca"
						onClick={() => setIsMakePickerSelected(true)}
						disabled={!isMakePickerEnabled}
					/>

					{isMakePickerSelected && (
						<div className="dropdown-menu">
							<ul>
								<li onClick={handleMakeIsAddClick}>Adicionar Marca</li>
								{makes.map((make) => (
									<li key={make.id} onClick={() => handleMakeSelectedClick(make)}>
										{make.name}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="make-section">
					<label htmlFor="make-name">Marca: </label>

					{isCreatingMake ? (
						<input
							id="make-name"
							type="text"
							ref={makeAddFormInput}
							value={makeName}
							onChange={(e) => setMakeName(e.target.value)}
						/>
					) : (
						<input
							id="make-name"
							type="text"
							ref={makeEditFormInput}
							value={makeName}
							onChange={(e) => setMakeName(e.target.value)}
							disabled={!isMakeFormEditable}
						/>
					)}

					<div className="buttons-card">
						{isCreatingMake ? (
							<>
								<button className="confirm" onClick={handleMakeActionAdd}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" onClick={handleMakeIsAddClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : isEditingMake ? (
							<>
								<button className="confirm" id="make-edit-confirm" onClick={handleMakeActionEdit}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" id="make-add-cancel" onClick={handleMakeIsEditClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : (
							<>
								<button className="options" id="make-edit-start" disabled={!selectedMake} onClick={handleMakeIsEditClick}>
									<i className="fa-solid fa-pen-to-square" />
								</button>
								<button className="cancel" id="make-select-cancel" disabled={!selectedMake} onClick={handleMakeSelectedClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="car-picker-container">
			<div className="car-picker" ref={carPicker}>
				<div className="car-input">
					<input
						ref={carInput}
						type="text"
						value={searchCars}
						onChange={(e) => setSearchCars(e.target.value)}
						placeholder="Selecionar Carro"
						onClick={() => setIsCarPickerSelected(true)}
					/>

					<div className="buttons-card">
						{isEditingCar ? (
							<>
								<button className="confirm" id="car-edit-confirm" onClick={handleCarActionEdit}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" id="car-add-cancel" onClick={handleCarIsEditClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : isCreatingCar ? (
							<>
								<button className="confirm" id="car-add-confirm" onClick={handleCarActionAdd}>
									<i className="fa-solid fa-check" />
								</button>
								<button className="cancel" id="car-add-cancel" onClick={handleCarIsAddClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						) : (
							<>
								<button className="options" id="car-edit-start" disabled={!selectedCar} onClick={handleCarIsEditClick}>
									<i className="fa-solid fa-pen-to-square" />
								</button>
								<button className="cancel" id="car-select-cancel" disabled={!selectedCar} onClick={handleCarSelectedClickCancel}>
									<i className="fa-solid fa-xmark" />
								</button>
							</>
						)}
					</div>
				</div>

				{isCarPickerSelected && (
					<div className="dropdown-menu">
						<ul>
							<li onClick={handleCarIsAddClick}>Adicionar Carro</li>
							{cars.map((car) => (
								<li key={car.id} onClick={() => handleCarSelectedClick(car)}>
									<span>{car.plate}</span>
									<span>{car.make_name}</span>
									<span>{car.model_name}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<div className="car-form">
				<div className="form-field car-plate">
					<label htmlFor="car-plate">Matrícula: </label>
					<input
						id="car-plate"
						ref={isCreatingCar ? carAddFormInput : carEditFormInput}
						type="text"
						placeholder="S/Matrícula"
						value={presentingCar.plate}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("plate", e.target.value)}
					/>
				</div>

				<div className="make-picker-wrapper">{showMakePicker()}</div>
				<div className="model-picker-wrapper">{showModelPicker()}</div>

				<div className="form-field car-chassi">
					<label htmlFor="car-chassi-nr">Nr. Chassi: </label>
					<input
						id="car-chassi-nr"
						type="text"
						placeholder="S/Nr. Chassi"
						value={presentingCar.chassi_nr}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("chassi_nr", e.target.value)}
					/>
				</div>

				<div className="form-field car-month">
					<label htmlFor="car-month">Mês: </label>
					<input
						id="car-month"
						type="number"
						placeholder="S/Mes"
						value={presentingCar.month}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("month", e.target.value)}
					/>
				</div>

				<div className="form-field car-year">
					<label htmlFor="car-year">Ano: </label>
					<input
						id="car-year"
						type="number"
						placeholder="S/Ano"
						value={presentingCar.year}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("year", e.target.value)}
					/>
				</div>

				<div className="form-field car-cc">
					<label htmlFor="car-cc">Cc: </label>
					<input
						id="car-cc"
						type="number"
						placeholder="S/Cc"
						value={presentingCar.cc}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("cc", e.target.value)}
					/>
				</div>

				<div className="form-field car-engine-code">
					<label htmlFor="car-engine-code">Cod. Motor: </label>
					<input
						id="car-engine-code"
						type="text"
						placeholder="S/Cod. Motor"
						value={presentingCar.engine_code}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("engine_code", e.target.value)}
					/>
				</div>

				<div className="form-field car-color-code">
					<label htmlFor="car-color-code">Cod. Cor: </label>
					<input
						id="car-color-code"
						type="text"
						placeholder="S/Cod. Cor"
						value={presentingCar.color_code}
						disabled={!isCarFormEditable}
						onChange={(e) => handleCarFieldChange("color_code", e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
}
