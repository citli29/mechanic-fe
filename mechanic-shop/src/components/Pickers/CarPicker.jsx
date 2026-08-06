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

				{isCreatingMake && (
					<form onSubmit={handleMakeActionAdd}>
						<label htmlFor="make-name">Nome: </label>
						<input type="text" id="make-name" ref={makeAddFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)}/>
						<button type="submit">
							A
						</button>
						<button type="button" onClick={(e)=>handleMakeIsAddClickCancel(e)}>
							X	
						</button>
					</form>
				)}

				{selectedMake && (
					<form onSubmit={handleMakeActionEdit}>
						<label htmlFor="make-name">Nome: </label>
						<input type="text" id="make-name" ref={makeEditFormInput} value={makeName} onChange={(e)=>setMakeName(e.target.value)}disabled={!isEditingMake}/>
						{isEditingMake ? (
							<>
								<button id="make-edit-confirm" type="submit">
									C
								</button>
								<button id="make-add-cancel"type="button" onClick={(e)=>handleMakeIsEditClickCancel(e)}>
									X	
								</button>

							</>
						):(
								<>
									<button id="make-edit-start" type="button" onClick={(e)=>handleMakeIsEditClick(e)}>
										E	
									</button>
									<button id="make-select-cancel" type="button" onClick={(e)=>handleMakeSelectedClickCancel(e)}>
										X	
									</button>
								</>
							)}
					</form>
				)}
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

				{isCreatingModel && (
					<form onSubmit={handleModelActionAdd}>
						<label htmlFor="model-name">Nome: </label>
						<input type="text" id="model-name" ref={modelAddFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)}/>
						<button type="submit">
							A
						</button>
						<button type="button" onClick={(e)=>handleModelIsAddClickCancel(e)}>
							X	
						</button>
					</form>
				)}

				{selectedModel && (
					<form onSubmit={handleModelActionEdit}>
						<label htmlFor="model-name">Nome: </label>
						<input type="text" id="model-name" ref={modelEditFormInput} value={modelName} onChange={(e)=>setModelName(e.target.value)}disabled={!isEditingModel}/>
						{isEditingModel ? (
							<>
								<button id="model-edit-confirm" type="submit">
									C
								</button>
								<button id="model-add-cancel"type="button" onClick={(e)=>handleModelIsEditClickCancel(e)}>
									X	
								</button>

							</>
						):(
								<>
									<button id="model-edit-start" type="button" onClick={(e)=>handleModelIsEditClick(e)}>
										E	
									</button>
									<button id="model-select-cancel" type="button" onClick={(e)=>handleModelSelectedClickCancel(e)}>
										X	
									</button>
								</>
							)}
					</form>
				)}
			</div>
		);
	}
	return (
		<div className="car-picker-container">
			{showMakePicker()}
			{showModelPicker()}
		</div>
	);
}
