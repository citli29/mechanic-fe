import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";

import { ServiceHeader } from "./Service/ServiceHeader";
import { MakePicker } from "../components/Pickers/MakePicker";

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

	const [make_id, setMake_id] = useState("");
	useEffect(()=>{console.log("make_id: ", make_id)}, [make_id]);
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
			<MakePicker  
				make_id=""
				onMakeIdChange={(m_id)=>setMake_id(m_id)}
			/>
		</div>

	);
}
