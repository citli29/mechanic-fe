// Cliente page (/clients/:id): the client's card (read-only, Editar turns
// it into a form), the cars that appear in their services, and the
// services themselves. Built like the viatura page (CarShow).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import BackButton from "../../components/BackButton/BackButton";
import ServiceHistory from "../../components/ServiceHistory/ServiceHistory";
import { CarCard } from "../Cars/CarCard";
import { ClientCard, ClientDetails, ClientForm } from "./ClientCard";
import { pushSuccessToast } from "../../utils/errorToast";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Cars/Style/CarCard.css";
import "./Style/ClientShow.css";

export default function ClientShow() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [client, setClient] = useState(null);
	const [editing, setEditing] = useState(false);

	const [services, setServices] = useState([]);
	const [appliedByService, setAppliedByService] = useState({});
	const [loadingHistory, setLoadingHistory] = useState(true);

	// Full car records (cc, codes...) for the cars in the services.
	const [carsById, setCarsById] = useState({});


	async function loadClient() {
		try {
			const res = await api.get(`/clients/${id}`);
			setClient(res.data.client || null);
		} catch (err) {
			console.error(err);
			setClient(null);
		}
	}


	async function loadHistory() {
		setLoadingHistory(true);

		try {
			const [servicesRes, appliedRes] = await Promise.all([
				api.get("/services", { params: { client_id: id, sort: "checkin", dir: "desc" } }),
				api.get("/services_applied_products", { params: { client_id: id } }),
			]);

			const list = servicesRes.data.service_list || [];
			setServices(list);

			const grouped = {};
			(appliedRes.data.sap_list || []).forEach((ap) => {
				if (!grouped[ap.service_id]) grouped[ap.service_id] = [];
				grouped[ap.service_id].push(ap);
			});
			setAppliedByService(grouped);

			// The service list only has plate / make / model; fetch each
			// car once for its details (a client has a handful at most).
			const carIds = [...new Set(list.map((s) => s.car_id).filter(Boolean))];
			const cars = await Promise.all(
				carIds.map((carId) => api.get(`/cars/${carId}`).then((r) => r.data.car).catch(() => null))
			);
			setCarsById(Object.fromEntries(cars.filter(Boolean).map((car) => [car.id, car])));
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingHistory(false);
		}
	}


	useEffect(() => {
		setEditing(false);
		setCarsById({});
		loadClient();
		loadHistory();
	}, [id]);


	// The client's cars = the cars of their services, most recent first,
	// with how many of this client's services each one had.
	const clientCars = useMemo(() => {
		const byCar = new Map();

		services.forEach((service) => {
			if (!service.car_id) return;

			const entry = byCar.get(service.car_id) || {
				car: {
					id: service.car_id,
					plate: service.car_plate,
					make_name: service.car_make_name,
					model_name: service.car_model_name,
				},
				count: 0,
				lastDate: null,
			};

			entry.count += 1;
			if (!entry.lastDate || (service.checkin && service.checkin > entry.lastDate)) {
				entry.lastDate = service.checkin;
			}

			byCar.set(service.car_id, entry);
		});

		return [...byCar.values()]
			.map((entry) => ({ ...entry, car: carsById[entry.car.id] || entry.car }))
			.sort((a, b) => String(b.lastDate || "").localeCompare(String(a.lastDate || "")));
	}, [services, carsById]);


	// The DB refuses a client with services, so the button is off then.
	async function deleteClient() {
		if (!window.confirm("Apagar este cliente?")) return;

		try {
			await api.delete(`/clients/${id}`);
			pushSuccessToast("Cliente apagado com sucesso.");
			navigate("/clients");
		} catch (err) {
			console.error(err);
		}
	}

	const hasServices = services.length > 0;
	const lastService = services[0];


	function renderClientCard() {
		if (editing) {
			return (
				<ClientForm
					client={client}
					title={`Editar ${client.name}`}
					onSaved={() => { setEditing(false); loadClient(); }}
					onCancel={() => setEditing(false)}
				/>
			);
		}

		return (
			<ClientCard
				client={client}
				className="is-expanded is-page"
				history={loadingHistory ? null : {
					count: services.length,
					carCount: clientCars.length,
					lastDate: lastService?.checkin,
				}}
			>
				<ClientDetails
					client={client}
					actions={
						<button className="options" onClick={() => setEditing(true)}>
							<i className="fa-solid fa-pencil" /> Editar
						</button>
					}
				/>
			</ClientCard>
		);
	}


	return (
		<div className="page client-show-page">
			<div className="content">

				<div className="details-actions">
					<BackButton fallback="/clients" />

					<button
						className="cancel detail-delete"
						onClick={deleteClient}
						disabled={loadingHistory || hasServices}
						title={hasServices ? "Não é possível apagar um cliente com serviços." : "Apagar cliente"}
					>
						<i className="fa-solid fa-trash" /> Apagar
					</button>
				</div>

				{/* Desktop: client on the left, their cars on the right. */}
				<div className="client-top">
				{client && renderClientCard()}

				<section className="detail-panel client-cars">
					<div className="detail-panel-head">
						<h2><i className="fa-solid fa-car" /> Viaturas</h2>
						{!loadingHistory && <span className="detail-panel-count">{clientCars.length}</span>}
					</div>

					{loadingHistory ? (
						<p className="detail-panel-empty">A carregar...</p>
					) : clientCars.length === 0 ? (
						<p className="detail-panel-empty">Sem viaturas nos serviços deste cliente.</p>
					) : (
						<div className="client-cars-list">
							{clientCars.map(({ car, count, lastDate }) => (
								<CarCard
									key={car.id}
									car={car}
									to={`/cars/${car.id}`}
									history={{ count, lastDate }}
								/>
							))}
						</div>
					)}
				</section>
				</div>

				<ServiceHistory
					services={services}
					appliedByService={appliedByService}
					loading={loadingHistory}
					emptyText="Sem serviços associados a este cliente."
					showCar
				/>

			</div>
		</div>
	);
}
