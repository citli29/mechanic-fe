import { useEffect, useState } from "react";
import "./Style/ServiceHeader.css";
import api from "./../../api/axios";

export const ServiceHeader = ({ service, onServiceChange ,lock, onLockChange}) => {

	const [schedules, setSchedules] = useState([]);
	const [showDetails, setShowDetails] = useState(false);

	
	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => {
			setIsMobile(e.matches);
		};

		media.addEventListener("change", handleChange);

		return () => {
			media.removeEventListener("change", handleChange);
		};
	}, []);
	const getFreeSchedules = async () => {
		try{
			const response = await api.get("schedules/free")
			if(typeof response.data.schedule_list !== "undefined"){
				return response.data.schedule_list;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}
	const getServiceSchedule = async () => {
		if(!service.schedule_id) return [];
		try{
			const response = await api.get(`schedules/${service.schedule_id}`)
			if(typeof response.data.schedule!== "undefined"){
				return response.data.schedule;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	useEffect(() => {
		const f = async () =>{
			const l = await getFreeSchedules()
			if(service.schedule_id){
				const s = await getServiceSchedule();
				l.push(s);
				l.sort((a,b) => a.id - b.id);	
			}
			setSchedules(l);
		}
		f();
	},[service]);

	useEffect(()=>{
		console.log(schedules);
	},[schedules]);

	const getServiceStatus = () => {
		if(service?.checkout) return {index: 3, desc:"Entregue"};
		if(service?.office_check) return {index: 2, desc:"Validado"};
		if(service?.is_finished) return {index: 1, desc:"Terminado"};
		return {index: 0, desc:"Por Terminar"}; 
	}
	const getStateClass = () => {
		switch(getServiceStatus().index){
			case 0: return "state-not-finished";
			case 1: return "state-finished";
			case 2: return "state-validated";
			case 3: return "state-delivered";
			default: return "";
		}
		
	}

	const renderInfoBig = () => {
		return (
				<>
				<div className="service-info" id="service-info">
					<div className="logo"><i className="fa-regular fa-file-lines"/></div>
					<div className="not-logo">
						<h1>Serviço #{service.id}</h1>
						<h2>{service.service_type}</h2>
						<h3>{service.service_sub_type} </h3>
					</div>
				</div>
				<div className="item-field" id="r-name">
					<label htmlFor="service-r-name">Nome</label>
					<input
						type="text"
						placeholder={lock?"S/ Nome":"Nome"}
						id="service-r-name"
						value={service.r_name}
						onChange={(e) => onServiceChange("r_name", e.target.value) }
						disabled={lock}
					/>
				</div>

				<div className="item-field" id="r-phone">
					<label htmlFor="service-r-name">Telemóvel</label>
					<input
						type="text"
						placeholder={lock?"S/ Telemóvel":"Telemóvel"}
						id="service-r-phone"
						value={service.r_phone}
						onChange={(e) => onServiceChange("r_phone", e.target.value) }
						disabled={lock}
					/>
				</div>

				<div className="item-field" id="checkin">
					<label htmlFor="service-checkin">Entrada</label>
					<input
						type="date"
						id="service-checkin"
						value={service.checkin}
						onChange={(e) => onServiceChange("checkin", e.target.value) }
						disabled={lock}
					/>
				</div>

				<div className="item-field" id="checkout-predict">
					<label htmlFor="service-checkout-predict"> Prev. Saída </label>
					<input
						type="date"
						id="service-checkout-predict"
						value={service.checkout_predict}
						onChange={(e) => onServiceChange( "checkout_predict", e.target.value) }
						disabled={lock}
					/>
				</div>
				
				<div className="item-field" id="kms">
					<label htmlFor="service-kms">Kms.</label>
					<input
						type="number"
						id="service-kms"
						value={service.kms}
						onChange={(e) => onServiceChange("kms", e.target.value) }
						disabled={lock}
					/>
				</div>

				<div className="divider"/>

				<div className="item-field" id="state">
					<label htmlFor="service-state">Estado</label>
					<input
						type="text"
						id="service-state"
						value={getServiceStatus().desc}
						disabled
						className={getStateClass()}

					/>

					<button className="accent" onClick={() =>setShowDetails(prev => !prev)} >
						{showDetails ? "▲" : "▼"}
					</button>

				</div>

				<div className="item-field" id="schedule">

					<label htmlFor="service-schedule"> Marcação</label>

					<select
						value={service.schedule_id}
						onChange={(e) => onServiceChange( "schedule_id", e.target.value) }
						name="service-schedule"
						id="service-schedule"
						disabled={lock}
					>
						<option value=""> S/Marcação </option>
						{schedules.map((schedule) => (
							<option
								key={schedule.id}
								value={schedule.id}
							>
								# {schedule.id}
							</option>
						))}
					</select>
				</div>


				<div className="item-field" id="checkout">
					<label htmlFor="service-checkout"> Saída</label>
					<input
						type="date"
						id="service-checkout"
						value={service.checkout}
						onChange={(e) => onServiceChange( "checkout", e.target.value) }
						disabled={lock}
					/>
				</div>
				<div className="o-check no-border" id="o-check">
					<label htmlFor="service-o-check"></label>
					<label
						className={`checkbox-field ${service.office_check?"accent":""}`}
						htmlFor="service-office-check"
					>
						<input
							type="checkbox"
							id="service-office-check"
							checked={service.office_check}
							onChange={(e) => onServiceChange( "office_check", e.target.checked) }
						/>
						<span>Validado</span>
					</label>
				</div>

				<div className="lock-start no-border" id="lock-start">
					<label htmlFor="lock-start"></label>
					<button className="accent" onClick={(e)=>{onLockChange()}}><i className={`fa-solid ${lock?"fa-lock":"fa-unlock"}`} /></button>
				</div>
		</>
		);
	}

	const renderInfoSmall = () => {
		return (
				<>
				<div className="header">
					<div className="service-info" id="service-info">
						<div className="logo"><i className="fa-regular fa-file-lines"/></div>
						<div className="not-logo">
							<h1>Serviço #{service.id}</h1>
							<h2>{service.service_type}</h2>
							<h3>{service.service_sub_type} </h3>
						</div>
					</div>

					<div className="item-field" id="state">
						<label htmlFor="service-state">Estado</label>
						<input
							type="text"
							id="service-state"
							value={getServiceStatus().desc}
							disabled
							className={getStateClass()}
						/>

						<button className="accent" onClick={() =>setShowDetails(prev => !prev)} >
							{showDetails ? <i className="fa-solid fa-chevron-up"/> : <i className="fa-solid fa-chevron-down"/>}
						</button>

					</div>

				</div>
				<div className="body">

					<div className="item-field" id="r-name">
						<label htmlFor="service-r-name">Nome</label>
						<input
							type="text"
							placeholder={lock?"S/ Nome":"Nome"}
							id="service-r-name"
							value={service.r_name}
							onChange={(e) => onServiceChange("r_name", e.target.value) }
							disabled={lock}
						/>
					</div>

					<div className="item-field" id="r-phone">
						<label htmlFor="service-r-name">Telemóvel</label>
						<input
							type="text"
							placeholder={lock?"S/ Telemóvel":"Telemóvel"}
							id="service-r-phone"
							value={service.r_phone}
							onChange={(e) => onServiceChange("r_phone", e.target.value) }
							disabled={lock}
						/>
					</div>

					<div className="item-field" id="checkin">
						<label htmlFor="service-checkin">Entrada</label>
						<input
							type="date"
							id="service-checkin"
							value={service.checkin}
							onChange={(e) => onServiceChange("checkin", e.target.value) }
							disabled={lock}
						/>
					</div>

					<div className="item-field" id="checkout-predict">
						<label htmlFor="service-checkout-predict"> Prev. Saída </label>
						<input
							type="date"
							id="service-checkout-predict"
							value={service.checkout_predict}
							onChange={(e) => onServiceChange( "checkout_predict", e.target.value) }
							disabled={lock}
						/>
					</div>

					<div className="item-field" id="kms">
						<label htmlFor="service-kms">Kms.</label>
						<input
							type="number"
							id="service-kms"
							value={service.kms}
							onChange={(e) => onServiceChange("kms", e.target.value) }
							disabled={lock}
						/>
					</div>


					<div className="item-field" id="schedule">

						<label htmlFor="service-schedule"> Marcação</label>

						<select
							value={service.schedule_id}
							onChange={(e) => onServiceChange( "schedule_id", e.target.value) }
							name="service-schedule"
							id="service-schedule"
							disabled={lock}
						>
							<option value=""> S/Marcação </option>
							{service?.schedule_id && (
								<option 
									key={service.schedule_id}
									value={service.schedule_id.id}
								>
									# {service.schedule_id}
								</option>
						
							)}
							{schedules?.map((schedule) => (
								<option
									key={schedule.id}
									value={schedule.id}
								>
									# {schedule.id}
								</option>
							))}
						</select>
					</div>


					<div className="item-field" id="checkout">
						<label htmlFor="service-checkout"> Saída</label>
						<input
							type="date"
							id="service-checkout"
							value={service.checkout}
							onChange={(e) => onServiceChange( "checkout", e.target.value) }
							disabled={lock}
						/>
					</div>
					<div className="buttons">
						<div className="o-check no-border" id="o-check">
							<label htmlFor="service-o-check"></label>
							<label
								className={`checkbox-field ${service.office_check?"accent":""}`}
								htmlFor="service-office-check"
							>
								<input
									type="checkbox"
									id="service-office-check"
									checked={service.office_check}
									onChange={(e) => onServiceChange( "office_check", e.target.checked) }
								/>
								<span>Validado</span>
							</label>
						</div>

						<div className="lock-start no-border" id="lock-start">
							<label htmlFor="lock-start"></label>
							<button className="accent" onClick={(e)=>{onLockChange();}}><i className={`fa-solid ${lock?"fa-lock":"fa-unlock"}`} /></button>
						</div>
					</div>
				</div>
		</>
		);
	}

	return (
		<div className="service-header">
			<div className={`service-header-card ${!showDetails?"hidden":""}`} >
				{ !isMobile && renderInfoBig()}
				{ isMobile && renderInfoSmall()}
			</div>
		</div>
	);
}
