import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import BackButton from "../../components/BackButton/BackButton";
import ServiceHistory from "../../components/ServiceHistory/ServiceHistory";

import { CarCard, CarDetails, CarForm } from "./CarCard";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/CarShow.css";
import { pushSuccessToast } from "../../utils/errorToast";

export default function CarShow() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [car, setCar] = useState(null);
	const [editingCar, setEditingCar] = useState(false);
	const [services, setServices] = useState([]);
	const [appliedByService, setAppliedByService] = useState({});
	const [loadingHistory, setLoadingHistory] = useState(true);


	async function loadHistory() {
		setLoadingHistory(true);

		try {
			const [servicesRes, appliedRes] = await Promise.all([
				api.get("/services", { params: { car_id: id, sort: "checkin", dir: "desc" } }),
				api.get("/services_applied_products", { params: { car_id: id } }),
			]);

			setServices(servicesRes.data.service_list || []);

			const grouped = {};

			(appliedRes.data.sap_list || []).forEach((ap) => {
				if (!grouped[ap.service_id]) grouped[ap.service_id] = [];
				grouped[ap.service_id].push(ap);
			});

			setAppliedByService(grouped);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingHistory(false);
		}
	}


	async function loadCar() {
		try {
			const res = await api.get(`/cars/${id}`);
			setCar(res.data.car || null);
		} catch (err) {
			console.error(err);
			setCar(null);
		}
	}


	useEffect(() => {
		setEditingCar(false);
		loadCar();
		loadHistory();
	}, [id]);


	// Moved here from the Viaturas list. The DB also refuses a car with
	// services, so the button is off while the history isn't empty.
	async function deleteCar() {
		if (!window.confirm("Apagar esta viatura?")) return;

		try {
			await api.delete(`/cars/${id}`);
			pushSuccessToast("Viatura apagada com sucesso.");
			navigate("/cars");
		} catch (err) {
			console.error(err);
		}
	}

	const hasServices = services.length > 0;


	return (
		<div className="page cars-show-page">
			<div className="content">

				<div className="details-actions">
					<BackButton fallback="/cars" />

					<button
						className="cancel detail-delete"
						onClick={deleteCar}
						disabled={loadingHistory || hasServices}
						title={hasServices ? "Não é possível apagar uma viatura com serviços." : "Apagar viatura"}
					>
						<i className="fa-solid fa-trash" /> Apagar
					</button>
				</div>

				{/* Same card as the Viaturas list, always open (no ⌄). Services
				   come from the history below (newest first). */}
				{car && (editingCar ? (
					<CarForm
						car={car}
						title={`Editar ${car.plate}`}
						onSaved={() => { setEditingCar(false); loadCar(); }}
						onCancel={() => setEditingCar(false)}
					/>
				) : (
					<CarCard
						car={car}
						className="is-expanded is-page"
						history={loadingHistory ? null : {
							count: services.length,
							lastDate: services[0]?.checkin,
							lastClient: services[0]?.client_name,
						}}
					>
						<CarDetails
							car={car}
							actions={
								<button className="options" onClick={() => setEditingCar(true)}>
									<i className="fa-solid fa-pencil" /> Editar
								</button>
							}
						/>
					</CarCard>
				))}

				<ServiceHistory
					services={services}
					appliedByService={appliedByService}
					loading={loadingHistory}
					emptyText="Sem serviços associados a esta viatura."
					showClient
				/>

			</div>
		</div>
	);
}
