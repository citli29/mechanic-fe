import { useParams } from "react-router-dom";

export default function ServiceShow2() {
	const { id } = useParams();
	return(
		<div className="service-header">
			<h1>Service Type</h1>
			<h2>Service SubType</h2>
			<div className="service-info">
				<div className="service-info-field">
					<label htmlFor="checkin">Entrada: </label>
					<input id="checkin" type="date"/>
				</div>
				<div className="service-info-field">
					<label htmlFor="checkout">Saída: </label>
					<input id="checkout" type="date"/>
				</div>
				<div className="service-info-field">
					<label htmlFor="s-phone">Tel.: </label>
					<input id="s-phone" type="tel"/>
				</div>
				<div className="service-info-field">
					<label htmlFor="s-phone-name">Nome Tel.: </label>
					<input id="s-phone-name" type="text"/>
				</div>
				<div className="service-info-field">
					<label htmlFor="schedule-select">Marcação: </label>
					<select name="schedule" id="schedule-select">
						<option value="">Selecione Marcação</option>
						<option value="1">Marcação #1</option>
						<option value="2">Marcação #2</option>
					</select>
				</div>
				<div className="service-info-field">
					<label htmlFor="office-checked">Validado: </label>
					<input id="office-checked" type="checkbox"/>
				</div>
			</div>
			<div className="client-car-info">

			</div>	
			<div className="service-summary">

			</div>
		</div>	
	);
}
