import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/CarPicker.css";

export default function CarPicker() {

	// Arrays
	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [searchMakes, setSearchMakes] = useState("");
	const [searchModels, setSearchModels] = useState("");
	const [searchCars, setSearchCars] = useState("");

	// Inputs For POST/PUT requests
	const emptyCar = {
		id:"",
		plate:"",
		make_id:"",
		model_id:"",
		chassi_nr:"",
		year:"",
		month:"",
		cc:"",
		engine_code:"",
		color_code:"",
	}

	const [presentingCar, _setPresentingCar] = useState(emptyCar);

	function setPresentingCar(car) {
		_setPresentingCar({
			id: car?.id ?? "",
			plate: car?.plate ?? "",
			make_id: car?.make_id ?? "",
			model_id: car?.model_id ?? "",
			chassi_nr: car?.chassi_nr ?? "",
			year: car?.year ?? "",
			month: car?.month ?? "",
			cc: car?.cc ?? "",
			engine_code: car?.engine_code ?? "",
			color_code: car?.color_code ?? "",
		});
	}

	const [makeName, setMakeName] = useState("");
	const [modelName, setModelName] = useState("");

	// GET: populate arrays
	async function loadMakes() {
		try {
			const response = await api.get("/makes", {
				params: {
					name: searchMakes,
				},
			});
			setMakes(response.data?.make_list);
		} catch (error) {
			console.error(error);
		}
	}

	async function loadCars() {
		try {
			const response = await api.get("/cars", {
				params: {
					plate: searchCars,
				},
			});
			setCars(response.data?.car_list);
		} catch (error) {
			console.error(error);
		}
	}

	async function loadModels() {
		if(!selectedMake) {
			setModels([]);
			return;
		}

		try {
			const response = await api.get("/models", {
				params: {
					name: searchModels,
					make_id: selectedMake.id
				},
			});
			setModels(response.data?.model_list);
		} catch (error) {
			console.error(error);
		}
	}

	useEffect(() => {loadCars(); }, [searchCars]);
	useEffect(() => {loadMakes(); }, [searchMakes]);
	useEffect(() => {loadModels(); }, [searchModels]);

	// Selected Objects
	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [selectedCar, setSelectedCar] = useState(null);

	// Boolean States
	const [isCarPickerSelected, setIsCarPickerSelected] = useState(false);
	const [isMakePickerSelected, setIsMakePickerSelected] = useState(false);
	const [isModelPickerSelected, setIsModelPickerSelected] = useState(false);

	const [isCreatingCar, setIsCreatingCar] = useState(false);
	const [isCreatingMake, setIsCreatingMake] = useState(false);
	const [isCreatingModel, setIsCreatingModel] = useState(false);

	const [isEditingCar, setIsEditingCar] = useState(false);
	const [isEditingMake, setIsEditingMake] = useState(false);
	const [isEditingModel, setIsEditingModel] = useState(false);

	// Input behaviour
	const [isCarCampsEditable,setIsCarCampsEditable]=useState(false);
	const [isMakeCampsEditable,setIsMakeCampsEditable]=useState(false);
	const [isModelCampsEditable,setIsModelCampsEditable]=useState(false);

	useEffect(()=>{ setIsMakeCampsEditable(Boolean(isCarCampsEditable && (isCreatingMake || isEditingMake) && !isMakePickerSelected));
	},[isCreatingMake, isEditingMake, isMakePickerSelected, isCarCampsEditable]);

	useEffect(()=>{ setIsModelCampsEditable(Boolean(isCarCampsEditable && selectedMake && (isCreatingModel || isEditingModel) && !isModelPickerSelected));
	},[isCreatingModel, isEditingModel, isModelPickerSelected, isCarCampsEditable, selectedMake]);

	useEffect(()=>{ setIsCarCampsEditable(Boolean((isCreatingCar || isEditingCar) && !isCarPickerSelected));
	},[isCreatingCar, isEditingCar, isCarPickerSelected]);

	const carPicker = useRef(null);
	const carAddFormInput = useRef(null);
	const carEditFormInput = useRef(null);
	const makePicker = useRef(null);
	const makeAddFormInput = useRef(null);
	const makeEditFormInput = useRef(null);
	const modelPicker = useRef(null);
	const modelAddFormInput = useRef(null);
	const modelEditFormInput = useRef(null);

	useEffect(()=>{ if(isCreatingMake) makeAddFormInput.current?.focus(); },[isCreatingMake]);

	useEffect(()=>{ if(isEditingMake) makeEditFormInput.current?.focus(); },[isEditingMake]);

	useEffect(()=>{ if(isCreatingModel) modelAddFormInput.current?.focus(); },[isCreatingModel]);

	useEffect(()=>{ if(isEditingModel) modelEditFormInput.current?.focus(); },[isEditingModel]);

	useEffect(()=>{ if(isCreatingCar) carAddFormInput.current?.focus(); },[isCreatingCar]);

	useEffect(()=>{ if(isEditingCar) carEditFormInput.current?.focus(); },[isEditingCar]);

	useEffect(() => {
		function handleClickOutside(event) {
			if (
			carPicker.current &&
					!carPicker.current.contains(event.target)
			) {
				setIsCarPickerSelected(false);
			}
		}

		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		function handleClickOutside(event) {
			if (
				makePicker.current &&
					!makePicker.current.contains(event.target)
			) {
				setIsMakePickerSelected(false);
			}
		}

		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		function handleClickOutside(event) {
			if (
				modelPicker.current &&
					!modelPicker.current.contains(event.target)
			) {
				setIsModelPickerSelected(false);
			}
		}

		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	//Sync Pickers
	useEffect(()=>{ setModelName(selectedModel?.name??"") },[selectedModel])

	useEffect(()=>{
		setMakeName(selectedMake?.name??"")
		loadModels();
	},[selectedMake])

	useEffect(() => {
		if (!selectedCar) {
			setSelectedMake(null);
			setSelectedModel(null);
			setPresentingCar(emptyCar);
			return;
		}else{
			setPresentingCar(selectedCar);
		}

		async function syncPickers() {
			try {

				const makesResponse = await api.get("/makes");

				const loadedMakes = makesResponse.data?.make_list ?? [];
				setMakes(loadedMakes);

				const make = loadedMakes.find(
					(item) => item.id === selectedCar.make_id
				);

				setSelectedMake(make ?? null);

				if (!make) {
					setModels([]);
					setSelectedModel(null);
					return;
				}

				const modelsResponse = await api.get("/models", {
					params: {
						name: "",
						make_id: make.id,
					},
				});

				const loadedModels = modelsResponse.data?.model_list ?? [];
				setModels(loadedModels);

				const model = loadedModels.find(
					(item) => item.id === selectedCar.model_id
				);

				setSelectedModel(model ?? null);
			} catch (error) {
				console.error(error);
			}
		}

		syncPickers();
	}, [selectedCar]);

	//Reset Camps
	function resetMake(){
		setSelectedMake(null);
		setSelectedModel(null);
		setIsMakePickerSelected(false);
		setIsCreatingMake(false);
		setIsEditingMake(false);
	}

	function resetModel(){
		setSelectedModel(null);
		setIsModelPickerSelected(false);
		setIsCreatingModel(false);
		setIsEditingModel(false);
	}

	function resetCar(){
		setSelectedCar(null);
		setIsCarPickerSelected(false);
		setIsCreatingCar(false);
		setIsEditingCar(false);
		setPresentingCar(emptyCar);
	}

	// Input text change
	function handleCarInputChange(value) { setSearchCars(value);}
	function handleMakeInputChange(value) { setSearchMakes(value);}
	function handleModelInputChange(value) { setSearchModels(value); }

	// Opening the dropdown menu
	function handleCarInputClick() { setIsCarPickerSelected(true);}
	function handleMakeInputClick() { setIsMakePickerSelected(true);}
	function handleModelInputClick() { setIsModelPickerSelected(true); }

	// Selecting from the dropdown
	function handleCarSelectedClick(car) {
		setIsCarPickerSelected(false);
		setSelectedCar(car);
	}
	function handleMakeSelectedClick(make) {
		setSelectedMake(make);
		setSelectedModel(null);
		setIsMakePickerSelected(false);
	}
	function handleModelSelectedClick(model) {
		setSelectedModel(model);
		setIsModelPickerSelected(false);
	}

	// Removing car selected
	function handleCarSelectedClickCancel(e){
		e.preventDefault();
		resetCar();
	}
	function handleMakeSelectedClickCancel(e){
		e.preventDefault();
		resetMake();
	}
	function handleModelSelectedClickCancel(e){
		e.preventDefault();
		resetModel();
	}

	// Start creating a new element
	function handleMakeIsAddClick(){
		setIsCreatingMake(true);
		setIsMakePickerSelected(false);
		setSelectedMake(null);
	}
	function handleModelIsAddClick(){
		setIsCreatingModel(true);
		setIsModelPickerSelected(false);
		setSelectedModel(null);
	}
	function handleCarIsAddClick(){
		setIsCreatingCar(true);
		setIsCarPickerSelected(false);
		setSelectedCar(null);
	}

	// Cancel creating a new element
	function handleCarIsAddClickCancel(e){
		e.preventDefault();
		resetCar();
	}
	function handleMakeIsAddClickCancel(e){
		e.preventDefault();
		resetMake();
	}
	function handleModelIsAddClickCancel(e){
		e.preventDefault();
		resetModel()
	}

	// Start editing an element
	function handleCarIsEditClick(e){
		e.preventDefault();
		setIsEditingCar(true);
	}
	function handleMakeIsEditClick(e){
		e.preventDefault();
		setMakeName(selectedMake.name);
		setIsEditingMake(true);
	}
	function handleModelIsEditClick(e){
		e.preventDefault();
		setModelName(selectedModel.name);
		setIsEditingModel(true);
	}

	// Cancel editing an element
	function handleCarIsEditClickCancel(e){
		e.preventDefault();
		setIsEditingCar(false);
		setPresentingCar(selectedCar);
	}
	function handleMakeIsEditClickCancel(e){
		e.preventDefault();
		setMakeName(selectedMake.name);
		setIsEditingMake(false);
	}
	function handleModelIsEditClickCancel(e){
		e.preventDefault();
		setModelName(selectedModel.name);
		setIsEditingModel(false);
	}

	// POST requests:
	async function handleCarActionAdd(e){
		e.preventDefault();

		if(!presentingCar.plate.trim()){
			console.error("Preencha o campo: matrícula.")
			return;
		}

		try {
			const response = await api.post("/cars", {
				name: makeName,
			});
			const car = response.data?.car;
			console.log(`${car.plate} - ${car.make_name}${car.model_id?" " + car.model_name:""} criado com sucesso.`);
			setIsCreatingCar(false);
			setSelectedCar(car)
			loadCars();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}
	async function handleMakeActionAdd(e){
		e.preventDefault();

		if(!makeName.trim()){
			console.error("Preencha o campo: nome.")
			return;
		}

		try {
			const response = await api.post("/makes", {
				name: makeName,
			});
			const make = response.data?.make;
			console.log(make.name + " criado com sucesso.");
			setIsCreatingMake(false);
			setSelectedMake(make)
			loadMakes();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}
	async function handleModelActionAdd(e){
		e.preventDefault();

		if(!selectedMake){
			console.error("Selecione a marca.")
			return;
		}

		if(!modelName.trim()){
			console.error("Preencha o campo: nome.")
			return;
		}

		try {
			const response = await api.post("/models", {
				name: modelName,
				make_id: selectedMake.id,
			});
			const model =response.data?.model;
			console.log(model.name + " criado com sucesso.");
			setIsCreatingModel(false);
			setSelectedModel(model);
			loadModels();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}

	// PUT requests:
	async function handleCarActionEdit(e){
		e.preventDefault();

		if(!selectedCar){
			console.error("Selecione o carro.")
		}

		if(!presentingCar.plate.trim()){
			console.error("Preencha o campo: matricula.")
			return;
		}
		if(!selectedMake){
			console.error("Selecione a marca.")
			return;
		}

		try {
			const response = await api.put(`/cars/${selectedCar.id}`, {
				plate: presentingCar.plate,
				make_id: selectedMake.id,
				model_id: selectedModel.id,
				chassi_nr: presentingCar.chassi_nr,
				month: presentingCar.month,
				year: presentingCar.year,
				cc: presentingCar.cc,
				engine_code: presentingCar.engine_code,
				color_code: presentingCar.color_code,
				
			});
			const car = response.data?.car;

			console.log(car.plate + " editado com sucesso.");
			setSelectedCar(car)
			setIsEditingCar(false);
			loadCars();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}
	async function handleMakeActionEdit(e){
		e.preventDefault();

		if(!selectedMake){
			console.error("Selecione a marca.")
		}
		if(!makeName.trim()){
			console.error("Preencha o campo: nome.")
			return;
		}

		try {
			const response = await api.put(`/makes/${selectedMake.id}`, {
				name: makeName,
			});
			const make = response.data?.make;

			console.log(make.name + " editado com sucesso.");
			setMakeName(make.name);
			setSelectedMake(make);
			setIsEditingMake(false);
			loadMakes();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}
	async function handleModelActionEdit(e){
		e.preventDefault();

		if(!selectedModel){
			console.error("Selecione a modelo.")
			return;
		}
		if(!selectedMake){
			console.error("Selecione a marca.")
		}
		if(!modelName.trim()){
			console.error("Preencha o campo: nome.")
			return;
		}

		try {
			const response = await api.put(`/models/${selectedModel.id}`, {
				name: modelName,
				make_id: selectedMake.id,
			});
			const model = response.data?.model;

			console.log(model.name + " editado com sucesso.");
			setModelName(model.name);
			setSelectedModel(model);
			setIsEditingModel(false);
			loadModels();
		} catch (error) {
			console.error(error.response.data.error);
		}
	}

	// HTML components
	function showModelPicker(){
		return(
			<div className="model-picker-container">
				<div className="model-picker" ref={modelPicker}>
					<input
						type="text"
						value={searchModels}
						onChange={(e) => handleModelInputChange(e.target.value)}
						placeholder="Selecionar modelo"
						onClick={() =>handleModelInputClick()}
						disabled={!isModelCampsEditable}
					/>

					{isModelPickerSelected && (<div className="dropdown-menu">
						<ul>
							<li key="addModel" onClick={()=>handleModelIsAddClick()}>Adicionar Modelo</li>
							{models.map((model) =>(
								<li key={model.id} onClick={()=>handleModelSelectedClick(model)}>{model.name}</li>
							))}
						</ul>
					</div>)}
				</div>

				<div className="model-section">
					{isCreatingModel && (
						<>
							<label htmlFor="model-name">Modelo: </label>
							<input type="text" disabled={!isModelCampsEditable} id="model-name" ref={modelAddFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)}/>
							<div className="buttons-card">
								<button disabled={!isModelCampsEditable} className="confirm" type="submit">
									<i className="fa-solid fa-check"/>
								</button>
								<button disabled={!isModelCampsEditable} className="cancel"type="button" onClick={(e)=>handleModelIsAddClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
								</button>
							</div>
						</>
					)}

					{!isCreatingModel && (
						<>
							<label htmlFor="model-name">Modelo: </label>
							<input type="text" id="model-name" ref={modelEditFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)} disabled={!isModelCampsEditable}/>
							<div className="buttons-card">
								{isEditingModel ? (
									<>
										<button className="confirm" id="model-edit-confirm"  disabled={!isModelCampsEditable} type="submit">
									<i className="fa-solid fa-check"/>
										</button>
										<button className="cancel" id="model-add-cancel" disabled={!isModelCampsEditable} type="button" onClick={(e)=>handleModelIsEditClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
										</button>

									</>
								):(
										<>
											<button className="options" id="model-edit-start" disabled={!isModelCampsEditable} type="button" onClick={(e)=>handleModelIsEditClick(e)}>
												<i className="fa-solid fa-pen-to-square"/>
											</button>
											<button className="cancel" id="model-select-cancel" disabled={!isModelCampsEditable} type="button" onClick={(e)=>handleModelSelectedClickCancel(e)}>
									<i className="fa-solid fa-xmark" />	
											</button>
										</>
									)}
							</div>
						</>
					)}
				</div>
			</div>
		);
	}

	function showMakePicker(){
		return(
			<div className="make-picker-container">
				<div className="make-picker" ref={makePicker}>
					<input
						type="text"
						value={searchMakes}
						onChange={(e) => handleMakeInputChange(e.target.value)}
						placeholder="Selecionar marca"
						onClick={() =>handleMakeInputClick()}
						disabled={!isMakeCampsEditable}
					/>

					{isMakePickerSelected && (<div className="dropdown-menu">
						<ul>
							<li key="addMake" onClick={()=>handleMakeIsAddClick()}>Adicionar Marca</li>
							{makes.map((make) =>(
								<li key={make.id} onClick={()=>handleMakeSelectedClick(make)}>{make.name}</li>
							))}
						</ul>
					</div>)}
				</div>

				// a meio de trocar quando os botoes ficam disabled
				<div className="make-section">
					{isCreatingMake && (
						<>
							<label htmlFor="make-name">Marca: </label>
							<input type="text" id="make-name" ref={makeAddFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)}/>
							<div className="buttons-card">
								<button disabled={!isMakeCampsEditable} className="confirm" type="button" onClick={(e)=>handleMakeActionAdd(e)}>
									<i className="fa-solid fa-check"/>
								</button>
								<button disabled={!isMakeCampsEditable} className="cancel" type="button" onClick={(e)=>handleMakeIsAddClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
								</button>
							</div>
						</>
					)}

					{!isCreatingMake && (
						<>
							<label htmlFor="make-name">Marca: </label>
							<input type="text" id="make-name" ref={makeEditFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)} disabled={!isMakeCampsEditable}/>
							<div className="buttons-card">
								{isEditingMake ? (
									<>
										<button className="confirm" id="make-edit-confirm" type="submit" disabled={!isMakeCampsEditable}>
											<i className="fa-solid fa-check"/>
										</button>
										<button className="cancel" id="make-add-cancel"type="button" onClick={(e)=>handleMakeIsEditClickCancel(e)} disabled={!isMakeCampsEditable} >
											<i className="fa-solid fa-xmark"/>
										</button>

									</>
								):(
										<>
											<button className="options" disabled={!isMakeCampsEditable}  id="make-edit-start" type="button" onClick={(e)=>handleMakeIsEditClick(e)}>
												<i className="fa-solid fa-pen-to-square"/>
											</button>
											<button className="cancel" disabled={!isMakeCampsEditable} id="make-select-cancel" type="button" onClick={(e)=>handleMakeSelectedClickCancel(e)}>
												<i className="fa-solid fa-xmark"/>
											</button>
										</>
									)}
							</div>
						</>
					)}
				</div>
			</div>
		);
	}
	//Unsupervised
	function handleCarFieldChange(field, value) {
		_setPresentingCar(prev => ({
			...prev,
			[field]: value,
		}));
}

	return (
		<div className="car-picker-container">
			<div className="car-picker" ref={carPicker}>
				<div className="car-input">
					<input
						type="text"
						value={searchCars}
						onChange={(e) => handleCarInputChange(e.target.value)}
						placeholder="Selecionar Carro"
						onClick={() =>handleCarInputClick()}
						disabled={isCarCampsEditable}
					/>

					<div className="buttons-card">
						{isEditingCar ? (
							<>
								<button className="confirm" id="car-edit-confirm" onClick={(e)=>handleCarActionEdit(e)}>
									<i className="fa-solid fa-check"/>
								</button>
								<button className="cancel"id="car-add-cancel" type="button" onClick={(e)=>handleCarIsEditClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
								</button>

							</>
						):(isCreatingCar?(
								<>
									<button className="confirm" id="car-edit-confirm" onClick={(e)=>handleCarActionAdd(e)}>
										<i className="fa-solid fa-check"/>
									</button>
									<button className="cancel"id="car-add-cancel" type="button" onClick={(e)=>handleCarIsAddClickCancel(e)}>
										<i className="fa-solid fa-xmark"/>
									</button>
								</>):(<>
									<button className="options"id="car-edit-start" disabled={!Boolean(selectedCar)} type="button"
										onClick={(e)=>handleCarIsEditClick(e)}>
												<i className="fa-solid fa-pen-to-square"/>
									</button>
									<button className="cancel"id="car-select-cancel" disabled={!Boolean(selectedCar)} type="button"
										onClick={(e)=>{handleCarSelectedClickCancel(e)}}
									> 
									<i className="fa-solid fa-xmark"/>
									</button>
								</>)
							)}
					</div>

				</div>

				{isCarPickerSelected && (
				<div className="dropdown-menu">
					<ul>
						<li key="addCar" onClick={()=>handleCarIsAddClick()}>Adicionar Carro</li>
						{cars.map((car) =>(
							<li key={car.id} onClick={()=>handleCarSelectedClick(car)}><span>{car.plate}</span><span>{car.make_name}</span><span>{car.model_name}</span></li>
						))}
					</ul>
				</div>)}
			</div>
			<div className="car-form">
				<div className="form-field car-plate">
					<label htmlFor="car-plate">Matrícula: </label>
					<input 
						type="text"
						placeholder="S/Matrícula"
						value={presentingCar.plate}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("plate", e.target.value)}
					/>
				</div>
				<div className="make-picker-wrapper">
					{showMakePicker()}
				</div>
				<div className="model-picker-wrapper">
					{showModelPicker()}
				</div>
				<div className="form-field car-chassi" >
					<label htmlFor="car-chassi-nr">Nr. Chassi: </label>
					<input 
						type="text"
						placeholder="S/Nr. Chassi"
						value={presentingCar.chassi_nr}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("chassi_nr", e.target.value)}
					/>
				</div>
				<div className="form-field car-month">
					<label htmlFor="car-month">Mês: </label>
					<input 
						type="number"
						placeholder="S/Mes"
						value={presentingCar.month}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("month", e.target.value)}
					/>
				</div>
				<div className="form-field car-year">
					<label htmlFor="car-year">Ano: </label>
					<input 
						type="number"
						placeholder="S/Ano"
						value={presentingCar.year}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("year", e.target.value)}
					/>
				</div>
				<div className="form-field car-cc" >
					<label htmlFor="car-cc">Cc: </label>
					<input 
						type="number"
						placeholder="S/Cc"
						value={presentingCar.cc}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("cc", e.target.value)}
					/>
				</div>
				<div className="form-field car-engine-code">
					<label htmlFor="car-engine-code">Cod. Motor: </label>
					<input 
						type="text"
						placeholder="S/Cod. Motor"
						value={presentingCar.engine_code}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("engine_code", e.target.value)}
					/>
				</div>
				<div className="form-field car-color-code">
					<label htmlFor="car-color-code">Cod. Cor: </label>
					<input 
						type="text"
						placeholder="S/Cod. Cor"
						value={presentingCar.color_code}
						disabled={!isCarCampsEditable}
						onChange={(e) => handleCarFieldChange("color_code", e.target.value)}
					/>
				</div>
			</div>
		</div>
	);
}
