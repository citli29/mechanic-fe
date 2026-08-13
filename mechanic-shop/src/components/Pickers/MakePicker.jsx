import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/MakePicker.css"

const SEARCHING = 1;
const SELECTED = 2;
const CREATING = 3;
const EDITING = 4;

// responsavel pela pesquisa, criacao, edicao e selecao de marcas
export const MakePicker = ({
		disabled,
		make_id,
		onMakeIdChange
	})=> {

	const [makes, setMakes] = useState([]);
	const [searchMake, setSearchMake] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [make, setMake] = useState(null)
	const [makeName, setMakeName] = useState(make?.name??"")
	const [state, setState] = useState(-1);


	useEffect(()=>{
		onMakeIdChange(make?.id??"");
		setMakeName(make?.name??"")
	},[make])

	const postMake = async (name, make) =>{
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
	} ,[]);

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
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setMake(null);
		setSearchMake("");
		setMakes(await getMakes())
		setIsSearchSelected(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
	}

	const renderSearching = () => {
		return(
			<div className="make-searching" 
					ref={refSearch}
			> 
				<input 
					type="text"
					placeholder={disabled?"S/Marca":"Pesquisar Marca..."}
					disabled={disabled}
					value={searchMake}
					onChange={(e)=>{setSearchMake(e.target.value)}}
				/>
				{isSearchSelected && (<ul className="dropdown">
					<li onClick={()=>handleClickStartAdd(searchMake)}>Adicionar Marca <span>{searchMake}</span></li>
					{makes?.map(m => (<li onClick={()=>handleClickSelect(m)} key={m.id}>{m.name}</li>))}
				</ul>)}
			</div>
		);
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
		}
	}

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
						<button className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pen-to-square"/></button>
						<button className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
		}
	}

	const renderNotSearching = () => {
		return(
			<div className="make-selected"> 
				<input 
					type="text"
					disabled={state===SELECTED}
					value={makeName}
					onChange={(e)=>setMakeName(e.target.value)}
				/>
				{renderSelectedButtons()}
				
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
		<div className="make-picker">
			{renderState()}
		</div>
	);
}
