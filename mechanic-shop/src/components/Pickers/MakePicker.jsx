import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";

const SEARCHING = 1;
const SELECTED = 2;
const CREATING = 3;
const EDITING = 4;

// responsavel pela pesquisa, criacao, edicao e selecao de marcas
export const MakePicker = ({
		disabled=false,
		make_id="",
		onMakeIdChange,
	})=> {

	const [makes, setMakes] = useState([]);
	const [searchMake, setSearchMake] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [make, setMake] = useState(null)
	const [makeName, setMakeName] = useState(make?.name??"")
	const [state, setState] = useState(-1);


	useEffect(()=>{
		setMakeName(make?.name??"")
	},[make])

	const postMake = async (name) =>{
		try{
			const response = await api.post(`makes`,{
				 name: name ,
			})
			if(typeof response.data.make !== "undefined"){
				return response.data.make;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const putMake = async (name, make) =>{
		try{
			const response = await api.put(`makes/${make.id}`,{
				 name: name ,
			})
			if(typeof response.data.make !== "undefined"){
				return response.data.make;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getMakes = async (searchName) => {
		try{
			const response = await api.get("makes",{
				params : { name:searchName, },
			})
			if(typeof response.data.make_list !== "undefined"){
				return response.data.make_list;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getMake = async (id) => {
		try{
			const response = await api.get(`makes/${id}`);
			if(typeof response.data.make !== "undefined"){
				return response.data.make;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	useEffect(()=>{
		async function f1(){
			const m = await getMake(make_id); 
			setMake(m);
		}
		async function f2(){
			const m = await getMakes(""); 
			setMakes(m);
		}

		if(make_id) { f1(); setState(SELECTED);
		}else{ f2(); setState(SEARCHING); }
	} ,[make_id,]);

	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchMake);	
		},300);
		return () => clearTimeout(timer);
	},[searchMake]);
	
	useEffect(()=>{
		let isCurrent = true;

		async function f(){
			const tempMakes = await getMakes(debouncedValue);
			if(isCurrent) setMakes(tempMakes);
		}
		f();
		return ()=>{isCurrent=false};
	},[debouncedValue]);

	//For Debug
	useEffect(()=>{console.log("Makes: ", makes)},[makes]);
	useEffect(()=>{console.log("Make: ", make)},[make]);
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
		setMakeName(s);
	}

	const handleClickSelect = (m) => {
		setIsSearchSelected(false);
		setMake(m);
		onMakeIdChange(m.id);
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setMake(null);
		onMakeIdChange("");

		setSearchMake("");
		setMakes(await getMakes())
		setIsSearchSelected(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
	}

	const handleClickActionEdit = async () =>{
		const m = await putMake(makeName, make);
		if(m){
			setState(SELECTED);
			setMake(m);
			setMakeName(m.name);
		}
	}

	const handleClickStartEditCancel = () =>{
		setState(SELECTED);
		setMakeName(make.name);
	}

	const handleClickStartAddCancel = (e) =>{ handleClickSelectCancel(e); }

	const handleClickActionAdd = async (e) =>{
		e.preventDefault();
		const m = await postMake(makeName);
		if(m){
			setState(SELECTED);
			setMake(m);
			setMakeName(m.name);

			onMakeIdChange(m.id);
		}
	}

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
						<button disabled={disabled} className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={disabled} className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-x"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button disabled={disabled} className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pencil"/></button>
						<button disabled={disabled} className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-x"/></button>
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button disabled={disabled} className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button disabled={disabled} className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-x"/></button>
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
					placeholder={disabled?"S/Marca":"Pesquisar Marca..."}
					disabled={disabled}
					value={searchMake}
					onChange={(e)=>{setSearchMake(e.target.value)}}
				/>
				{isSearchSelected && (<ul className="dropdown">
					<li >
						<button onClick={()=>handleClickStartAdd(searchMake)}>
							<span><i className="fa-solid fa-plus"/>Adicionar Marca </span>
							<span>{searchMake}</span>
						</button>
					</li>
					{makes?.map(m => (<li  key={m.id}>
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
					placeholder="Marca"
					disabled={state===SELECTED}
					value={makeName}
					onChange={(e)=>setMakeName(e.target.value)}
				/>
				{!disabled && renderSelectedButtons()}
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
