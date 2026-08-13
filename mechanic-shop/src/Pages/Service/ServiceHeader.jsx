import { useState } from "react";
import "./Style/ServiceHeader.css";

export const ServiceHeader = ({ service, onServiceChange }) => {

	const schedules = [];
	const [showDetails, setShowDetails] = useState(false);
	const [lockStartCamps, setLockStartCamps] = useState(true);

	const getServiceStatus = () => { return "Estado"; }

	return (
		<div className="service-header">
			<div className="service-type">
				<h1>Serviço #{service.id}</h1>
				<h2> {service.service_type} - {service.service_sub_type} </h2>
			</div>

			<div
				className="service-stat-grid"
				data-open={showDetails}
			>

				<div className="service-start">
					<div className="grid-entry r-name">
						<label htmlFor="service-r-name">Nome</label>
						<input
							type="text"
							placeholder={lockStartCamps?"S/ Nome":"Nome"}
							id="service-r-name"
							value={service.r_name}
							onChange={(e) => onServiceChange("r_name", e.target.value) }
							disabled={lockStartCamps}
						/>
					</div>

					<div className="grid-entry r-phone">
						<label htmlFor="service-r-name">Telemóvel</label>
						<input
							type="text"
							placeholder={lockStartCamps?"S/ Telemóvel":"Telemóvel"}
							id="service-r-phone"
							value={service.r_phone}
							onChange={(e) => onServiceChange("r_phone", e.target.value) }
							disabled={lockStartCamps}
						/>
					</div>

					<div className="grid-entry checkin">
						<label htmlFor="service-checkin">Entrada</label>
						<input
							type="date"
							id="service-checkin"
							value={service.checkin}
							onChange={(e) => onServiceChange("checkin", e.target.value) }
							disabled={lockStartCamps}
						/>
					</div>

					<div className="grid-entry kms">
						<label htmlFor="service-kms">Kms.</label>
						<input
							type="number"
							id="service-kms"
							value={service.kms}
							onChange={(e) => onServiceChange("kms", e.target.value) }
							disabled={lockStartCamps}
						/>
					</div>

					<div className="grid-entry checkout-predict">
						<label htmlFor="service-checkout-predict"> Prev. Saída </label>
						<input
							type="date"
							id="service-checkout-predict"
							value={service.checkout_predict}
							onChange={(e) => onServiceChange( "checkout_predict", e.target.value) }
							disabled={lockStartCamps}
						/>
					</div>

					<div className="grid-entry lock-start">
						<label htmlFor="lock-start"></label>
						<button className="accent" onClick={(e)=>{setLockStartCamps(!lockStartCamps);}}><i className={`fa-solid ${lockStartCamps?"fa-lock":"fa-unlock"}`} /></button>
					</div>
				</div>

				<div className="service-finish">
					<div className="grid-entry state">
						<label htmlFor="service-state">Estado</label>
						<input
							type="text"
							id="service-state"
							value={getServiceStatus()}
							disabled
						/>

						<button className="accent" onClick={() =>setShowDetails(prev => !prev)} >
							{showDetails ? "▲" : "▼"}
						</button>

					</div>

					<div className="grid-entry schedule">

						<label htmlFor="service-schedule"> Marcação</label>

						<select
							value={service.schedule_id}
							onChange={(e) => onServiceChange( "schedule_id", e.target.value) }
							name="service-schedule"
							id="service-schedule"
						>
							<option value=""> S/Marcação </option>
							{schedules.map((schedule) => (
								<option
									key={schedule.id}
									value={schedule.id}
								>
									{schedule.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid-entry o-check">
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

					<div className="grid-entry checkout">
						<label htmlFor="service-checkout"> Saída</label>
						<input
							type="date"
							id="service-checkout"
							value={service.checkout}
							onChange={(e) => onServiceChange( "checkout", e.target.value) }
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
