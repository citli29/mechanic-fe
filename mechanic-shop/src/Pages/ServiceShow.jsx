import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";

import { ServiceHeader } from "./Service/ServiceHeader";
import { CarPicker } from "../components/Pickers/CarPicker";

import "./Style/ServiceShow.css";
import { ClientPicker } from "../components/Pickers/ClientPicker";
import { MarkedTextarea } from "./MarkedTextarea";
import { AppliedProducts } from "./AppliedProducts";
import { UserTimes } from "./UserTimes";
import { UserTimePunches } from "./UserTimePunches";
import { ProductsRequested } from "./ProductsRequested";

export default function ServiceShow2() {
	const { id } = useParams();
	const defaultService = {
		id: "",
		client_id:"",
		kms:"",
		checkin: "",
		checkout: "",
		malfunction:"",
		service:"",
		car_id:"",
		schedule_id: "",
		note:"asd fa sd h fjashd fjhas",
		is_finished: false,
		
		service_type: "Tipo de Serviço",
		signed_service:"Serviço a realizar",
		checkout_predict: "2030-01-01",
		r_name: "",
		r_phone: "",

		office_check: false,
	}

	const markedTextarea = useRef();
	const hasLoaded = useRef(false);
	const [service, setService] = useState(defaultService);
	const [isAllowedEditing, setIsAllowedEditing] = useState(false);
	const skipSave = useRef(true);

	useEffect(() => { loadService(); }, []);
	useEffect(()=>{console.log("Servico: ",service);},[service]);

	useEffect(()=>{
		document.querySelectorAll(".info").forEach((element) => {
			element.addEventListener("mouseenter", () => {
				element.classList.add("show");
			});

			element.addEventListener("mouseleave", () => {
				element.classList.remove("show");
			});
		});
	},[])

	async function loadService() {
		try {
			const response = await api.get(`/services/${id}`);

			setService({
				...defaultService,
				...response.data.service
			});

			hasLoaded.current = true;
		} catch (error) {
			console.error(error);
		}
	}

	const putService = async (service) =>{
		try{
			if(service?.id){
				const response = await api.put(`services/${service.id}`,service)
				if(typeof response.data.service !== "undefined"){
					return response.data.service;
				}else{
					return null;
				}
			}
			return defaultService;
		}catch(error){console.error(error, error.response.data.error)}
	}


	useEffect(() => {
		const f = async () =>{
			const s = await putService(service); 
			if(!s) {
				loadService();
			}
		}

		if (!service?.id) return;

		if (skipSave.current) {
			skipSave.current = false;
			return;
		}

		const timer = setTimeout(() => {
			f();
		}, 300);

		return () => clearTimeout(timer);
	}, [service]);

	/* USER TIME */
	const[uts,setUts] = useState([]);
	const[utps,setUtps] = useState([]);
	const[timeSummary,setTimeSummary] = useState([]);
	useEffect(()=>{ setTimeSummary(sumUserMinutes(uts,utps)); },[uts,utps]);

	const  sumUserMinutes = (arr1, arr2) => { 
		const users = {};
		[...arr1, ...arr2].forEach(({ user_id, user_name, minutes }) => { 
			if (!users[user_id]) { 
				users[user_id] = { user_id, user_name, minutes: 0, }; 
			} 
			users[user_id].minutes += minutes??0; 
		}); 
		return Object.values(users); 
	}

	const getServiceStatus = () => {
		if(service?.checkout) return {index: 3, desc:"Entregue"};
		if(service?.office_check) return {index: 2, desc:"Validado"};
		if(service?.is_finished) return {index: 1, desc:"Terminado"};
		return {index: 0, desc:"Por Terminar"}; 
	}
	const getStateClass = () => {
		switch(getServiceStatus().index){
			case 0: return "state-not-finished-bg";
			case 1: return "state-finished-bg";
			case 2: return "state-validated-bg";
			case 3: return "state-delivered-bg";
			default: return "";
		}
	}
	const handleClickCheckIsFinished =async (checked) => {
		const s = await putService({...service,is_finished: checked});
		if(s) setService(s);
	}

	return(
		<div className={`service-page ${getStateClass()}`}>
			<div className="content">
				<ServiceHeader
					service={service}
					onServiceChange={
						(field, value) =>
							setService(prev => ({
								...prev,
								[field]: value,
							}))
					}
					lock={!isAllowedEditing}
					onLockChange={()=>{setIsAllowedEditing(!isAllowedEditing)}}
				/>
				<h1 className="print-title">
					Informação da viatura
				</h1>
				<CarPicker
					car_id={service.car_id}
					onCarIdChange={(value)=>setService(prev => (
						prev.car_id === value
							? prev :
							{...prev, car_id: value,}
					))}
					isAllowedEditing={isAllowedEditing}
				/>
				<h1 className="print-title">
					Informação do cliente
				</h1>
				<ClientPicker
					client_id={service.client_id}
					onClientIdChange={(value)=>setService(prev => (
						prev.client_id === value
							? prev :
							{...prev, client_id: value,}
					))}
					isAllowedEditing={isAllowedEditing}
				/>
				<div className="service-signed-info-card">
					<div className="header">
						<i className="fa-solid fa-pen-fancy"/> 
						<h1>Serviço Acordado</h1>
					</div>
					<div className="body">
						<div className="text-entry">
							<label htmlFor=""disabled={!isAllowedEditing}>Descrição de Avaria</label>
							<textarea 
								type="text" 
								value={service.malfunction} 
								onChange={(e)=>setService(prev => ({
									...prev,
									malfunction:e.target.value
								}))}
								disabled={!isAllowedEditing}/>
						</div>
						<div className="text-entry">
							<label htmlFor="malfunction">Serviço a Realizar</label>
							<textarea 
								type="text" 
								value={service.signed_service} 
								onChange={(e)=>setService(prev => ({
									...prev,
									signed_service:e.target.value
								}))}
								disabled={!isAllowedEditing}/>
						</div>
					</div>
					<div className="text-entry" id="signing">
						<p>Eu, <span>{service?.r_name??"".trim()?service?.r_name:"______________________________"}</span> , tomei conhecimento e autorizo a realização do serviço acima indicado e contacto através do nrº <span>{service?.r_phone??"".trim()?service?.r_phone:"______________________________"}</span>.</p>
						<p>Assinatura: ________________________________</p>
					</div>
				</div>
				<div className="service-done-info-card">
					<div className="header">
						<i className="fa-solid fa-wrench"></i>
						<h1>Serviço Realizado</h1>
					</div>	
					<div className="body">

						<div className="text-entry">
							<label htmlFor="malfunction">Serviço Realizado</label>
							<textarea 
								type="text" 
								value={service.service} 
								onChange={(e)=>setService(prev => ({
									...prev,
									service:e.target.value
								}))}
							/>
						</div>

						<div className="coloring-buttons">
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-red");
								}}
							><i className="fa-solid fa-square-pen note-red-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-yellow");
								}}
							><i className="fa-solid fa-square-pen note-yellow-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-green");
								}}
							><i className="fa-solid fa-square-pen note-green-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.unmarkSelection();
								}}
							><i className="fa-regular fa-square f"/></button>

						</div>

						<div className="text-entry">
							<label htmlFor="">Notas/Observações</label>

							<MarkedTextarea
								ref={markedTextarea}
								value={service.note}
								onChange={(newValue) => {
									setService(prev => ({
										...prev,
										note: newValue,
									}));
								}}
							/>
						</div>
					</div>
				</div>
				<div className="service-products-requested-card">
					<div className="header">
						<i className="fa-solid fa-cart-arrow-down"/>
						<h1>Pedido de Produtos</h1>
					</div>	
					<div className="body">
						<ProductsRequested id={id}/>
					</div>
				</div>
				<div className="service-applied-products-card">
					<div className="header">
						<i className="fa-solid fa-store"></i>
						<h1>Produtos Aplicados</h1>
					</div>	
					<div className="body">
						<AppliedProducts id={id}/>
					</div>
				</div>
				<div className="service-user-times-card">
					<div className="header">
						<i className="fa-solid fa-hourglass-half"></i>
						<h1>Tempos de Serviço</h1>
					</div>	
					<div className="body">
						<table className="times-summary">
							<thead>
								<tr>
									<th>Funcionário</th>
									<th>Tempo</th>
								</tr>
							</thead>
							<tbody>
								{timeSummary.map(ts=>(
									<tr key={ts.user_id}>
										<td>{ts.user_name}</td>
										<td>{ts.minutes}</td>
									</tr>
								))}
							</tbody>
						</table>
						<UserTimes id={id} copy_uts={setUts}/>
						<UserTimePunches id={id} copy_uts={setUtps}/>
					</div>
				</div>
				<div className="service-is-finished-card">
					<label htmlFor="is-finished">
						<div className="header">
							<i className="fa-solid fa-flag-checkered"></i>
							<h1>Finalizado</h1>
							<input
								id="is-finished"
								type="checkbox"
								checked={service.is_finished}
								onChange={(e) => {handleClickCheckIsFinished(e.target.checked); }}
							/>
						</div>	
					</label>
				</div>
			</div>
		</div>

	);
}
