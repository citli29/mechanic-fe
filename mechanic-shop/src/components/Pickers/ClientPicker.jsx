import {useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/Picker.css";

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
	isAllowedEditing,
}) =>{
	const [clients, setClients] = useState([]);
	const [searchClient, setSearchClient] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [client, setClient] = useState(null);
	const [state, setState] = useState(-1);

	const [isInfoShowing, setIsInfoShowing] = useState(false);
	const [presentingClient, setPresentingClient] = useState(emptyClient);

	useEffect(() => {
		if (!client) return;

		onClientIdChange(client.id);
		setPresentingClient(client);
	}, [client]);

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
		let cancelled = false;

		const load = async () => {
			if (!client_id) {
				setClient(null);
				setState(SEARCHING);
				return;
			}

			const c = await getClient(client_id);

			if (cancelled) return;

			if (c) {
				setClient(c);
				setState(SELECTED);
			} else {
				setClient(null);
				setState(SEARCHING);
			}
		};

		load();

		return () => {
			cancelled = true;
		};
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
		setIsSearchSelected(false);
		setIsInfoShowing(true);
		setState(CREATING);
		setPresentingClient({
			...emptyClient, 
			name: searchClient,
		});
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
						<button  className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-x"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button className="client" onClick={(e)=>{setIsInfoShowing(!isInfoShowing)}}><i className={`fa-solid fa-chevron-${isInfoShowing?"up":"down"}`}/></button>
						{isAllowedEditing && (<>
							<button className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pencil"/></button>
							<button className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-x"/></button>
						</>
						)}
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-x"/></button>
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
					disabled={!isAllowedEditing}
				/>
				{isAllowedEditing && isSearchSelected && (<ul className="dropdown">
					<li >
						<button onClick={()=>handleClickStartAdd(searchClient)}>
							Adicionar Cliente <span>{searchClient}</span>
						</button>
					</li>
					{clients?.map(c => (<li  key={c.id}>
						<button onClick={()=>handleClickSelect(c)}>
							<span>{c.name}</span>
							<span>{c?.phone && <i className="fa-solid fa-phone" /> }{c.phone}</span>
							<span>{c?.tax_nr && <i className="fa-solid fa-id-card" /> }{c.tax_nr}</span>
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
				<div className="item-header">
					<div className="item-input">
						<span><i className="fa-solid fa-person"/></span>
						<span> {client?.name??""}</span>
						<span>{state !== CREATING &&(<i className="fa-solid fa-phone"/>)}{client?.phone??(state!==CREATING?"S/ Tel.":"")}</span>
						<span>{state !== CREATING &&(
							<i className="fa-solid fa-id-card" />
						)}{client?.tax_nr??(state!==CREATING?"S/ NIF":"")}</span>
					</div>
					{renderSelectedButtons()}
				</div>
				<div className={`item-info ${!isInfoShowing?"hidden":""}`}>
					<div className="item-field" id="client-name">
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
					<div className="item-field" id="client-phone">
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
					<div className="item-field" id="client-email">
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
					<div className="item-field" id="client-tax">
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
					<div className="item-field" id="client-address">
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
					<div className="item-field" id="client-zip">
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
				return;
		}
		
	}

	return (
		<div className="client-picker" id="client-picker">
			{renderState()}
		</div>
	);
}


