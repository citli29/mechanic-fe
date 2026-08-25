import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";

import { ServiceHeader } from "./Service/ServiceHeader";
import { CarPicker } from "../components/Pickers/CarPicker";

import "./Style/ServiceShow.css";
import { ClientPicker } from "../components/Pickers/ClientPicker";
import { MarkedTextarea } from "./MarkedTextarea";

export default function ServiceShow2() {
	const { id } = useParams();
	const defaultService = {
		id: "",
		service_type: "Tipo de Serviço",
		service_sub_type: "Sub-tipo",
		r_name: "",
		r_phone: "",
		checkin: "",
		checkout_predict: "2030-01-01",
		schedule_id: "",
		office_check: false,
		kms:"",
		checkout: "",
		car_id:"",
		client_id:"",
		note:"asdfjasjkfhsadf",
		signed_service:"Serviço a realizar",
		service:"",
		malfunction:"",
	}
	const markedTextarea = useRef();
	const [service, setService] = useState(defaultService);

	const hasLoaded = useRef(false);
	const [showInfo, setShowInfo]= useState(false);

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
	useEffect(()=>{loadService()},[]);
	useEffect(()=>{console.log("Servico: ",service);},[service]);
	useEffect(()=>{console.log("Carro: ",service.car_id);},[service.car_id]);
	useEffect(()=>{console.log("Cliente: ",service.client_id);},[service.client_id]);

	//For debug
	const [isAllowedEditing, setIsAllowedEditing] = useState(false);
	useEffect(()=>{console.log("AllowedEditing: ",isAllowedEditing);},[isAllowedEditing]);


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

	const skipSave = useRef(true);

	useEffect(() => {
		loadService();
	}, []);

	useEffect(() => {
		if (!service?.id) return;

		if (skipSave.current) {
			skipSave.current = false;
			return;
		}

		const timer = setTimeout(() => {
			putService(service);
		}, 300);

		return () => clearTimeout(timer);
	}, [service]);

	const MARKERS = {
		red: {
			char: "\uE000",
			className: "note-red",
		},
		green: {
			char: "\uE001",
			className: "note-green",
		},
		yellow: {
			char: "\uE002",
			className: "note-yellow",
		},
	};

	return(
		<div className="service-page">
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
			<CarPicker
				car_id={service.car_id}
				onCarIdChange={(value)=>setService(prev => (
					prev.car_id === value
						? prev :
						{...prev, car_id: value,}
				))}
				isAllowedEditing={isAllowedEditing}
			/>
			<ClientPicker
				client_id={service.client_id}
				onClientIdChange={(value)=>setService(prev => (
					prev.car_id === value
						? prev :
						{...prev, car_id: value,}
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
					<div className="note-info">
						<div 
							onClick={()=>setShowInfo(!showInfo)}
							className={showInfo?"info show":"info"}>
							<i className="fa-solid fa-circle-question"/>
							<p>Uso:
								<br/>&nbsp;&nbsp;&nbsp;&nbsp;&#8227;&nbsp; 
								<span style={{
									color:"#de1f42",
								}}>[[ vermelho ]]&#32;
								</span> 
								<br/>&nbsp;&nbsp;&nbsp;&nbsp;&#8227;&nbsp;
								<span style={{
									color:"#22c55e",
								}}>(( verde ))&#32;
								</span> 
								<br/>&nbsp;&nbsp;&nbsp;&nbsp;&#8227;&nbsp;
								<span style={{
									color:"#d18f02",
								}} >&#123;&#123; amarelo &#125;&#125;
								</span>
							</p>
						</div>		
						<button
							onClick={()=>{
								markedTextarea.current.markSelection();

							}}
						>Clica</button>
					</div>

					<div className="text-entry">
						<label htmlFor=""disabled={!isAllowedEditing}>Notas/Observações</label>

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
				</div>
			</div>
			<i className="fa-solid fa-store"></i>
			<i className="fa-solid fa-hourglass-half"></i>
		</div>

	);
}
