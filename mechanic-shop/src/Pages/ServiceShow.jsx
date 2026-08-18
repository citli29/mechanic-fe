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
		service_type: "ServiceType",
		service_sub_type: "ServiceSubType",
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

	//For debug
	const [disableCamps, setDisableCamps] = useState(false);
	
	const [make_id, setMake_id] = useState(1);
	const [model_id, setModel_id] = useState("");
	const [car_id, setCar_id] = useState("");
	const [car_id2, setCar_id2] = useState("");
	const [client_id, setClient_id] = useState("");
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
			/>

			<div className="car-client-info">
				<div className="car-info-card">
					<CarPicker
						car_id={car_id}
						onCarIdChange={(c_id)=>setCar_id(c_id)}
					/>
				</div>
				<div className="client-info-card">
				<ClientPicker
					client_id={client_id}
					onClientIdChange={(c_id)=>setClient_id(c_id)}
				/>
				</div>
			</div>
		</div>

	);
}
