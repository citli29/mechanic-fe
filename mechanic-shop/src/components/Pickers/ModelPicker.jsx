import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";

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
		const load = async () =>{
			if(!make_id){
				setIsSearchSelected(false);
				setModel(null);
				setModelName("");
				setModels([]);
				setState(SEARCHING);

				onModelIdChange("")

				setSearchModel("");
				setDebouncedValue("");

				return;
			}
			if(model_id){
				const m = await getModel(model_id);
				setModel(m);
				setState(SELECTED);
			}else{
				const m = await getModels("");
				setModels(m);
				setModel(null);
				setState(SEARCHING);
			}

		}
		load();
	} ,[make_id,model_id]);

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
		onModelIdChange(m.id);
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setModel(null);
		onModelIdChange("");
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
			onModelIdChange(m.id);
		}
	}
	const isDisabled = !Boolean(make_id) || disabled;

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
						<button disabled={isDisabled} className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-x"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button disabled={isDisabled} className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pencil"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-x"/></button>
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button disabled={isDisabled} className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={isDisabled} className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-x"/></button>
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
							<span><i className="fa-solid fa-plus"/>Adicionar Modelo </span>
							<span>{searchModel}</span>
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
				return;
		}
		
	}


	return (
		<div className="m-picker" id="make-picker">
			{renderState()}
		</div>
	);
}
