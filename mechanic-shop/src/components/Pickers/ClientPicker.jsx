import {useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/ClientPicker.css";

const SEARCHING = 1;
const SELECTED = 2;
const CREATING = 3;
const EDITING = 4;

const emptyClient = {
	id: "",
	name: "",
	phone: "",
	email: "",
	tax_nr: "",
	address:"",
	zip_code:"",
}

export const ClientPicker = ({
	client_id ="",
	onClientIdChange,
}) =>{
	const [clients, setClients] = useState([]);
	const [searchClient, setSearchClient] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [client, setClient] = useState(null);
	const [state, setState] = useState(-1);

	const [isInfoShowing, setIsInfoShowing] = useState(false);
	const [presentingClient, setPresentingClient] = useState(emptyClient);

	useEffect(() => {
		onClientIdChange(client?.id??"");
		setPresentingClient(client??emptyClient);
	},[client]);

	const postClient = async (newClient) =>{
		try{
			const response = await api.post('clients', {
				name: newClient?.name??"",
				phone: newClient?.phone??"",
				email: newClient?.email??"",
				tax_nr: newClient?.tax_nr??"",
				address: newClient?.address??"",
				zip_code: newClient?.zip_code??"",
			})
			if(typeof response.data.client !== "undefined"){
				return response.data.client;
			}else{
				return null;
			}
		} catch(error){console.error(error, error.response.data.error);}
	}

	const putClient = async (newClient, client) =>{
		try{
			const response = await api.put(`clients/${client.id}`, {
				name: newClient?.name??"",
				phone: newClient?.phone??"",
				email: newClient?.email??"",
				tax_nr: newClient?.tax_nr??"",
				address: newClient?.address??"",
				zip_code: newClient?.zip_code??"",
			})
			if(typeof response.data.client !== "undefined"){
				return response.data.client;
			}else{
				return null;
			}
		} catch(error){console.error(error, error.response.data.error);}
	}

	const getClients = async (searchClient) => {
		try{
			const response = await api.get("clients",{
				params : { 
					name:searchClient, 
				},
			})
			if(typeof response.data.client_list !== "undefined"){
				return response.data.client_list;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getClient = async (id) => {
		try{
			const response = await api.get(`clients/${id}`);
			if(typeof response.data.client !== "undefined"){
				return response.data.client;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	useEffect(() => {
		const load = async () => {
			if (client_id) {
				const c = await getClient(client_id);

				if (c) {
					setClient(c);
					setState(SELECTED);
				}
			}else{
				const list = await getClients("");
				setClients(list);
				setState(SEARCHING);
			}
		};

		load();
	}, [client_id]);

	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchClient);
		},300);
		return ()=>clearTimeout(timer);
	}, [searchClient]);

	useEffect(()=>{
		let isCurrent = true;

		const f = async () =>{
			const tempClients = await getClients(debouncedValue)
			if(isCurrent) setClients(tempClients);
		}	
		f();
		return () => (isCurrent=false);
	},[debouncedValue]);

	//For Debug
	useEffect(()=>{console.log("Clients: ", clients)}, [clients]);
	useEffect(()=>{console.log("Client: ", client)}, [client]);
	useEffect(()=>{console.log("State: ", state)},[state]);

	//Interactivity
	const refSearch = useRef(null);

	const [isSearchSelected, setIsSearchSelected] = useState(false);

	useEffect(()=>{
		function handleClickOutside(e){
			if( refSearch.current && !refSearch.current.contains(e.target)){
				setIsSearchSelected(false);
			}else{
				setIsSearchSelected(true);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		}
	},[])

	const handleClickStartAdd = (c) => {
		setIsInfoShowing(false);
		setIsSearchSelected(false);
		setClient(c);
		setState(SELECTED);
	}

	const handleClickSelect = (c) => {
		setIsInfoShowing(false);
		setIsSearchSelected(false);
		setClient(c);
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setSearchClient("");
		setClient(null);
		setClients(await getClients());
		setIsSearchSelected(false);
		setIsInfoShowing(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
		setIsInfoShowing(true);
	}

	const handleClickActionEdit = async () =>{
		const c = await putClient(presentingClient, client);
		if(c){
			setState(SELECTED);
			setClient(c);
		}
	}

	const handleClickStartEditCancel = async () => {
		setState(SELECTED);
		const c = await getClient(client.id);
		setClient(c);
	}

	const handleClickStartAddCancel = (e) => {handleClickSelectCancel(e);}

	const handleClickActionAdd = async (e) =>{
		e.preventDefault();
		const c = await postClient(presentingClient);
		if(c){
			setState(SELECTED);
			setClient(c);
		}
	}

	const renderSelectedButtons = () => {
		switch(state) {
			case CREATING:
				return (
					<div className="card-buttons">
						<button  className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button  className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button className="client" onClick={(e)=>{setIsInfoShowing(!isInfoShowing)}}><i className={`fa-solid fa-chevron-${isInfoShowing?"up":"down"}`}/></button>
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

	const renderSearching = () => {
		return(
			<div className="search-bar" 
					ref={refSearch}
			> 
				<span><i className="fa-solid fa-magnifying-glass"/></span>
				<input 
					onFocus={()=>setIsSearchSelected(true)}
					type="text"
					placeholder={"Pesquisar Cliente..."}
					value={searchClient}
					onChange={(e)=>{setSearchClient(e.target.value)}}
				/>
				{isSearchSelected && (<ul className="dropdown">
					<li >
						<button onClick={()=>handleClickStartAdd(searchClient)}>
							Adicionar Cliente <span>{searchClient}</span>
						</button>
					</li>
					{clients?.map(c => (<li  key={c.id}>
						<button onClick={()=>handleClickSelect(c)}>
							<span>{c.name}</span>
							<span>{c.phone}</span>
							<span>{c.tax_nr}</span>
						</button>
					</li>))}
				</ul>)}
			</div>
		);
	}

	const isEditable = state === CREATING || state === EDITING

	const renderNotSearching = () => {
		return(
			
			<div className="selected-item"> 
				<div className="client-header">
					<div className="client-input">
						<span>{client?.name??""}</span>
						<span>{client?.phone??""}</span>
						<span>{client?.tax_nr??""}</span>
					</div>
					{renderSelectedButtons()}
				</div>
				<div className={`client-info ${!isInfoShowing?"hidden":""}`}>
					<div className="client-field" id="client-name">
						<label htmlFor="client-name">Nome</label>
						<input 
							value={presentingClient?.name??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									name: e.target.value
								}))
							}
						/>
					</div>
					<div className="client-field" id="client-phone">
						<label htmlFor="client-phone">Telemóvel</label>
						<input 
							value={presentingClient?.phone??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									phone: e.target.value
								}))
							}
						/>
					</div>
					<div className="client-field" id="client-email">
						<label htmlFor="client-email">Email</label>
						<input 
							value={presentingClient?.email??""}
							type="email"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									email: e.target.value
								}))
							}
						/>
					</div>
					<div className="client-field" id="client-tax">
						<label htmlFor="client-tax">NIF</label>
						<input 
							value={presentingClient?.tax_nr??""}
							type="number"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									tax_nr: e.target.value
								}))
							}
						/>
					</div>
					<div className="client-field" id="client-address">
						<label htmlFor="client-address">Morada</label>
						<input 
							value={presentingClient?.address??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									address: e.target.value
								}))
							}
						/>
					</div>
					<div className="client-field" id="client-zip">
						<label htmlFor="client-zip">Cod. Postal</label>
						<input 
							value={presentingClient?.zip_code??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingClient(prev => ({
									...prev,
									zip_code: e.target.value
								}))
							}
						/>
					</div>
				</div>
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
		<div className="client-picker" id="client-picker">
			{renderState()}
		</div>
	);
}


