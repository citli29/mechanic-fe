import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/MPicker.css"

const SEARCHING = 1;
const SELECTED = 2;
const CREATING = 3;
const EDITING = 4;

export const ModelPicker = ({
	make_id="",
	model_id="",
	onModelIdChange,
	disabled=false
}) =>{

	const [models, setModels] = useState([]);
	const [searchModel, setSearchModel] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [model,setModel] = useState(null);
	const [modelName, setModelName] = useState(model?.name??"");
	const [state, setState] = useState(-1);

	useEffect(() => {
		onModelIdChange(model?.id??"");
		setModelName(model?.name??"");
	},[model]);

	const postModel = async (name, make_id) =>{
		try{
			const response = await api.post(`models`, {
				name: name ,
				make_id: make_id,
			})
			if(typeof response.data.model !== "undefined"){
				return response.data.model;
			}else{
				return null;
			}

		}catch(error){console.error(error, error.response.data.error)}
	}

	const putModel = async (name,make_id, model) =>{
		try{
			const response = await api.put(`models/${model.id}`,{
				name: name ,
				make_id: make_id,
			})
			if(typeof response.data.model !== "undefined"){
				return response.data.model;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getModels = async (searchName) => {
		try{
			if(!make_id) return [];

			const response = await api.get("models",{
				params : { 
					name:searchName, 
					make_id: make_id,
				},
			})
			if(typeof response.data.model_list !== "undefined"){
				return response.data.model_list;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getModel = async (id) => {
		try{
			const response = await api.get(`models/${id}`);
			if(typeof response.data.model !== "undefined"){
				return response.data.model;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	useEffect(()=>{
		if(!make_id){
			setIsSearchSelected(false);
			model_id = "";
			onModelIdChange("");
		}
		async function f1(){
			const m = await getModel(model_id); 
			setModel(m);
		}
		async function f2(){
			const m = await getModels(""); 
			setModels(m);
		}

		if(model_id) { f1(); setState(SELECTED);
		}else{ f2(); setState(SEARCHING); }
	} ,[make_id,]);

	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchModel);	
		},300);
		return () => clearTimeout(timer);
	},[searchModel]);
	
	useEffect(()=>{
		let isCurrent = true;

		async function f(){
			const tempModels = await getModels(debouncedValue);
			if(isCurrent) setModels(tempModels);
		}
		f();
		return ()=>{isCurrent=false};
	},[debouncedValue]);

	//For Debug
	useEffect(()=>{console.log("Models: ", models)},[models]);
	useEffect(()=>{console.log("Model: ", model)},[model]);
	useEffect(()=>{console.log("State: ", state)},[state]);
	
	//Interactivity
	const refSearch = useRef(null);
	const refNotSearchingInput= useRef(null);

	useEffect(()=>{
		if(state === CREATING || state === EDITING)
			refNotSearchingInput.current?.focus();
	},[state]);

	const [isSearchSelected, setIsSearchSelected] = useState(false);

	useEffect(() => {
		function handleClickOutside(e) {
			if ( refSearch.current && !refSearch.current.contains(e.target)) {
				setIsSearchSelected(false);
			}else{
				setIsSearchSelected(true);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleClickStartAdd = (s) => {
		setIsSearchSelected(false);
		setState(CREATING);
		setModelName(s);
	}

	const handleClickSelect = (m) => {
		setIsSearchSelected(false);
		setModel(m);
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setModel(null);
		setSearchModel("");
		setModels(await getModels())
		setIsSearchSelected(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
	}

	const handleClickActionEdit = async () =>{
		const m = await putModel(modelName,make_id, model);
		if(m){
			setState(SELECTED);
			setModel(m);
			setModelName(m.name);
		}
	}

	const handleClickStartEditCancel = () =>{
		setState(SELECTED);
		setModelName(model.name);
	}

	const handleClickStartAddCancel = (e) =>{ handleClickSelectCancel(e); }

	const handleClickActionAdd = async (e) =>{
		e.preventDefault();
		const m = await postModel(modelName,make_id);
		if(m){
			setState(SELECTED);
			setModel(m);
			setModelName(m.name);
		}
	}
	const isDisabled = !Boolean(make_id) || disabled;

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
						<button disabled={isDisabled} className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button disabled={isDisabled} className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pen-to-square"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button disabled={isDisabled} className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
		}
	}

	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();

			if (state === CREATING) {
				handleClickActionAdd(e);
			}

			if (state === EDITING) {
				handleClickActionEdit(e);
			}

		} else if (e.key === "Escape") {
			e.preventDefault();

			if (state === CREATING) {
				handleClickStartAddCancel(e);
			}

			if (state === EDITING) {
				handleClickStartEditCancel(e);
			}
		}
	};

	const renderSearching = () => {
		return(
			<div className="m-searching" 
					ref={refSearch}
			> 
				<input 
					onFocus={()=>setIsSearchSelected(true)}
					type="text"
					placeholder={isDisabled?"S/Modelo":"Pesquisar Modelo..."}
					disabled={isDisabled}
					value={searchModel}
					onChange={(e)=>{setSearchModel(e.target.value)}}
				/>
				{isSearchSelected && (<ul className="dropdown">
					<li >
						<button onClick={()=>handleClickStartAdd(searchModel)}>
							Adicionar Modelo <span>{searchModel}</span>
						</button>
					</li>
					{models?.map(m => (<li  key={m.id}>
						<button onClick={()=>handleClickSelect(m)}>
							{m.name}
						</button>
					</li>))}
				</ul>)}
			</div>
		);
	}

	const renderNotSearching = () => {
		return(
			<div className="m-selected"> 
				<input 
					onKeyDown={handleKeyDown}
					ref={refNotSearchingInput}
					type="text"
					placeholder="Modelo"
					disabled={state===SELECTED}
					value={modelName}
					onChange={(e)=>setModelName(e.target.value)}
				/>
				{!isDisabled && renderSelectedButtons()}
			</div>
		);
	}

	const renderState = () => {
		switch(state){
			case SEARCHING: 
				return renderSearching();
			case SELECTED:
				return renderNotSearching();
			case CREATING:
				return renderNotSearching();
			case EDITING:
				return renderNotSearching();
			default:
				console.error("Erro no estado: ", state);
		}
		
	}


	return (
		<div className="m-picker" id="make-picker">
			{renderState()}
		</div>
	);
}
