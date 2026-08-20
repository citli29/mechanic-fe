import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";

import { ServiceHeader } from "./Service/ServiceHeader";
import { CarPicker } from "../components/Pickers/CarPicker";

import "./Style/ServiceShow.css";
import { ClientPicker } from "../components/Pickers/ClientPicker";

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
		checkout: ""
	}
	const [service, setService] = useState(defaultService);

	async function loadService() {
		try {
			const response = await api.get(`/services/${id}`);
			setService({...defaultService, ...response.data.service});
		}catch(error){console.error(error, error.response.data.error)}
	}
	useEffect(()=>{loadService()},[]);
	useEffect(()=>{console.log("Servico: ",service);},[service]);
	useEffect(()=>{console.log("Carro: ",service.car_id);},[service.car_id]);
	useEffect(()=>{console.log("Cliente: ",service.client_id);},[service.client_id]);

	//For debug
	const [isAllowedEditing, setIsAllowedEditing] = useState(false);
	useEffect(()=>{console.log("AllowedEditing: ",isAllowedEditing);},[isAllowedEditing]);
	
	
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
				onCarIdChange={(value)=>setService(prev => ({...prev, car_id: value,}))}
				isAllowedEditing={isAllowedEditing}
			/>
			<ClientPicker
				client_id={service.client_id}
				onClientIdChange={(value)=>setService(prev => ({...prev, client_id: value,}))}
				isAllowedEditing={isAllowedEditing}
			/>
		</div>

	);
}
