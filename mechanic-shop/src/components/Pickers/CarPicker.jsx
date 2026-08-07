import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/CarPicker.css";

export default function CarPicker() {

	const [makes, setMakes] = useState([]);
	const [searchMakes, setSearchMakes] = useState("");

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

	const [selectedMake, setSelectedMake] = useState(null);

	const [isMakePickerSelected, setIsMakePickerSelected] = useState(false);
	const [isCreatingMake, setIsCreatingMake] = useState(false);
	const [makeName, setMakeName] = useState("");
	const [isEditingMake, setIsEditingMake] = useState(false);

	const makePicker = useRef(null);
	const makeAddFormInput = useRef(null);
	const makeEditFormInput = useRef(null);

	function resetMake(){
		setSelectedMake(null);
		setIsMakePickerSelected(false);
		setIsCreatingMake(false);
		setIsEditingMake(false);
	}

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

	useEffect(()=>{ console.log(makes); },[makes])

	useEffect(()=>{
		console.log(selectedMake);
		setMakeName(selectedMake?.name??"")
		setSelectedModel(null);
		loadModels();
	},[selectedMake])

	useEffect(() => {loadMakes();}, [searchMakes]);

	function handleMakeInputChange(value) {setSearchMakes(value);}

	function handleMakeInputClick() {setIsMakePickerSelected(true);}

	function handleMakeIsAddClick(){
		setIsCreatingMake(true);
		setIsMakePickerSelected(false);
		setSelectedMake(null);
	}

	useEffect(()=>{if(isCreatingMake) makeAddFormInput.current?.focus();},[isCreatingMake])

	function handleMakeIsAddClickCancel(e){
		e.preventDefault();
		resetMake();
	}

	function handleMakeSelectedClick(make) {
		setSelectedMake(make);
		setIsMakePickerSelected(false);
	}

	function handleMakeSelectedClickCancel(e){
		e.preventDefault();
		resetMake();
	}

	function handleMakeIsEditClick(e){
		e.preventDefault();
		setMakeName(selectedMake.name);
		setIsEditingMake(true);
	}

	useEffect(()=>{
		if(isEditingMake)
			makeEditFormInput.current?.focus();
	},[isEditingMake])

	function handleMakeIsEditClickCancel(e){
		e.preventDefault();
		setMakeName(selectedMake.name);
		setIsEditingMake(false);
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
						disabled={isCreatingMake}
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

				<div className="make-section">
					{isCreatingMake && (
						<>
							<label htmlFor="make-name">Nome: </label>
							<input type="text" id="make-name" ref={makeAddFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)}/>
							<div className="buttons-card">
								<button className="confirm" type="button" onClick={(e)=>handleMakeActionAdd(e)}>
									<i className="fa-solid fa-check"/>
								</button>
								<button className="cancel" type="button" onClick={(e)=>handleMakeIsAddClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
								</button>
							</div>
						</>
					)}

					{!isCreatingMake && (
						<>
							<label htmlFor="make-name">Nome: </label>
							<input type="text" id="make-name" ref={makeEditFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)}disabled={!isEditingMake}/>
							<div className="buttons-card">
								{isEditingMake ? (
									<>
										<button className="confirm" disabled={!selectedMake} id="make-edit-confirm" type="submit">
									<i className="fa-solid fa-check"/>
										</button>
										<button className="cancel" disabled={!selectedMake} id="make-add-cancel"type="button" onClick={(e)=>handleMakeIsEditClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
										</button>

									</>
								):(
									<>
										<button className="options" disabled={!selectedMake} id="make-edit-start" type="button" onClick={(e)=>handleMakeIsEditClick(e)}>
												<i className="fa-solid fa-pen-to-square"/>
										</button>
										<button className="cancel"disabled={!selectedMake} id="make-select-cancel" type="button" onClick={(e)=>handleMakeSelectedClickCancel(e)}>
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

	const [models, setModels] = useState([]);
	const [searchModels, setSearchModels] = useState("");

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

	const [modelName, setModelName] = useState("");

	const [selectedModel, setSelectedModel] = useState(null);

	const [isModelPickerSelected, setIsModelPickerSelected] = useState(false);
	const [isCreatingModel, setIsCreatingModel] = useState(false);
	const [isEditingModel, setIsEditingModel] = useState(false);

	const modelPicker = useRef(null);
	const modelAddFormInput = useRef(null);
	const modelEditFormInput = useRef(null);

	function resetModel(){
		setSelectedModel(null);
		setIsModelPickerSelected(false);
		setIsCreatingModel(false);
		setIsEditingModel(false);
	}

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

	useEffect(()=>{ console.log(models); },[models])
	useEffect(()=>{
		console.log(selectedModel);
		setModelName(selectedModel?.name??"")
	},[selectedModel])

	useEffect(() => { loadModels(); }, [searchModels]);

	function handleModelInputChange(value) { setSearchModels(value); }

	function handleModelInputClick() { setIsModelPickerSelected(true); }

	function handleModelIsAddClick(){
		setIsCreatingModel(true);
		setIsModelPickerSelected(false);
		setSelectedModel(null);
	}

	useEffect(()=>{ if(isCreatingModel) modelAddFormInput.current?.focus(); },[isCreatingModel])

	function handleModelIsAddClickCancel(e){
		e.preventDefault();
		resetModel()
	}

	function handleModelSelectedClick(model) {
		setSelectedModel(model);
		setIsModelPickerSelected(false);
	}

	function handleModelSelectedClickCancel(e){
		e.preventDefault();
		resetModel();
	}

	function handleModelIsEditClick(e){
		e.preventDefault();
		setModelName(selectedModel.name);
		setIsEditingModel(true);
	}

	useEffect(()=>{ if(isEditingModel) modelEditFormInput.current?.focus(); },[isEditingModel])

	function handleModelIsEditClickCancel(e){
		e.preventDefault();
		setModelName(selectedModel.name);
		setIsEditingModel(false);
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
						disabled={isCreatingModel || !selectedMake}
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
							<label htmlFor="model-name">Nome: </label>
							<input type="text" id="model-name" ref={modelAddFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)}/>
							<div className="buttons-card">
								<button className="confirm" type="submit">
									<i className="fa-solid fa-check"/>
								</button>
								<button className="cancel"type="button" onClick={(e)=>handleModelIsAddClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
								</button>
							</div>
						</>
					)}

					{!isCreatingModel && (
						<>
							<label htmlFor="model-name">Nome: </label>
							<input type="text" id="model-name" ref={modelEditFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)}disabled={!isEditingModel}/>
							<div className="buttons-card">
								{isEditingModel ? (
									<>
										<button className="confirm" id="model-edit-confirm" disabled={!selectedModel} type="submit">
									<i className="fa-solid fa-check"/>
										</button>
										<button className="cancel" id="model-add-cancel" disabled={!selectedModel} type="button" onClick={(e)=>handleModelIsEditClickCancel(e)}>
									<i className="fa-solid fa-xmark"/>
										</button>

									</>
								):(
										<>
											<button className="options" id="model-edit-start" disabled={!selectedModel} type="button" onClick={(e)=>handleModelIsEditClick(e)}>
												<i className="fa-solid fa-pen-to-square"/>
											</button>
											<button className="cancel" id="model-select-cancel" disabled={!selectedModel} type="button" onClick={(e)=>handleModelSelectedClickCancel(e)}>
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
	const [cars, setCars] = useState([]);
	const [searchCars, setSearchCars] = useState("");

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

	const [selectedCar, setSelectedCar] = useState(null);

	const [isCarPickerSelected, setIsCarPickerSelected] = useState(false);
	const [isCreatingCar, setIsCreatingCar] = useState(false);
	const [carPlate, setCarPlate] = useState("");
	const [isEditingCar, setIsEditingCar] = useState(false);

	const carPicker = useRef(null);
	const carAddFormInput = useRef(null);
	const carEditFormInput = useRef(null);

	function resetCar(){
		setSelectedCar(null);
		setIsCarPickerSelected(false);
		setIsCreatingCar(false);
		setIsEditingCar(false);
	}

	const emptyCar = {
		id:null,
		plate:null,
		make_id:null,
		model_id:null,
		chassi_nr:null,
		year:null,
		month:null,
		cc:null,
		engine_code:null,
		color_code:null,
	}
		
	const [editingCar, setEditingCar] = useState([]);

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

	useEffect(()=>{ console.log(cars); },[cars])

	useEffect(() => {
		if (!selectedCar) {
			setCarPlate("");
			setSelectedMake(null);
			setSelectedModel(null);
			return;
		}

		async function syncPickers() {
			try {
				setCarPlate(selectedCar.plate ?? "");

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

	useEffect(() => {loadCars();}, [searchCars]);

	function handleCarInputChange(value) {setSearchCars(value);}

	function handleCarInputClick() {setIsCarPickerSelected(true);}

	function handleCarIsAddClick(){
		setIsCreatingCar(true);
		setIsCarPickerSelected(false);
		setSelectedCar(null);
	}

	useEffect(()=>{if(isCreatingCar) carAddFormInput.current?.focus();},[isCreatingCar])

	function handleCarIsAddClickCancel(e){
		e.preventDefault();
		resetCar();
	}

	function handleCarSelectedClick(car) {
		setSelectedCar(car);
		setIsCarPickerSelected(false);
	}

	function handleCarSelectedClickCancel(e){
		e.preventDefault();
		resetCar();
	}

	function handleCarIsEditClick(e){
		e.preventDefault();
		setIsEditingCar(true);
		setEditingCar(selectedCar);
	}

	useEffect(()=>{
		if(isEditingCar)
			carEditFormInput.current?.focus();
	},[isEditingCar])

	function handleCarIsEditClickCancel(e){
		e.preventDefault();
		setCarPlate(selectedCar.plate);
		setIsEditingCar(false);
	}

	async function handleCarActionAdd(e){
		e.preventDefault();

		if(!carPlate.trim()){
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

	async function handleCarActionEdit(e){
		e.preventDefault();

		if(!selectedCar){
			console.error("Selecione o carro.")
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
	// Make the makes synced with the car selected
	/*	---------------------------------------------------------------------------------
		|	[			]	|	Nr. Chassi	:	--	|
		|	Matricula:	--		|	Mes		:	--	|
		|	[			]	|	Ano		:	--	|
		|	Marca:		--		|	CC		:	--	|
		|	[			]	|	Cod. Motor	:	--	|
		|	Modelo		--		|	Cod. Cor	:	--	|
		---------------------------------------------------------------------------------
		|							[Editar][Apagar]	|
		---------------------------------------------------------------------------------
	 */
	
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
						disabled={isCreatingCar}
					/>

					<div className="buttons-card">
						{isEditingCar ? (
							<>
								<button className="confirm" id="car-edit-confirm" disabled={!selectedCar}>
									<i className="fa-solid fa-check"/>
								</button>
								<button className="cancel"id="car-add-cancel" disabled={!selectedCar} type="button" >
									<i className="fa-solid fa-xmark"/>
								</button>

							</>
						):(
								<>
									<button className="options"id="car-edit-start" disabled={!selectedCar} type="button">
												<i className="fa-solid fa-pen-to-square"/>
									</button>
									<button className="cancel"id="car-select-cancel" disabled={!selectedCar} type="button"> 
									<i className="fa-solid fa-xmark"/>
									</button>
								</>
							)}
					</div>

				</div>

					{isCarPickerSelected && (<div className="dropdown-menu">
						<ul>
							<li key="addCar" onClick={()=>handleCarIsAddClick()}>Adicionar Carro</li>
							{cars.map((car) =>(
								<li key={car.id} onClick={()=>handleCarSelectedClick(car)}><span>{car.plate}</span><span>{car.make_name}</span><span>{car.model_name}</span></li>
							))}
						</ul>
					</div>)}
				</div>
			<form className="car-form">
				<div className="form-field car-plate">
					<label htmlFor="car-plate">Matrícula: </label>
					<input 
						type="text"
						placeholder="S/Matrícula"
						value={selectedCar?.plate}
						disabled={isCreatingCar || selectedCar}
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
						value={selectedCar?.chassi_nr}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
				<div className="form-field car-month">
					<label htmlFor="car-month">Mês: </label>
					<input 
						type="number"
						placeholder="S/Mes"
						value={selectedCar?.month}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
				<div className="form-field car-year">
					<label htmlFor="car-year">Ano: </label>
					<input 
						type="number"
						placeholder="S/Ano"
						value={selectedCar?.year}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
				<div className="form-field car-cc" >
					<label htmlFor="car-cc">Cc: </label>
					<input 
						type="number"
						placeholder="S/Cc"
						value={selectedCar?.cc}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
				<div className="form-field car-engine-code">
					<label htmlFor="car-engine-code">Cod. Motor: </label>
					<input 
						type="text"
						placeholder="S/Cod. Motor"
						value={selectedCar?.engine_code}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
				<div className="form-field car-color-code">
					<label htmlFor="car-color-code">Cod. Cor: </label>
					<input 
						type="text"
						placeholder="S/Cod. Cor"
						value={selectedCar?.color_code}
						disabled={isCreatingCar || selectedCar}
					/>
				</div>
			</form>
		</div>
	);
}
