import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ServicesList.css";

const PER_PAGE = 10;

export default function ServicesList() {

	const navigate = useNavigate();

	const [services, setServices] = useState([]);

	const [filters, setFilters] = useState({
		day: "",
		month: "",
		year: "",
		client_name: "",
		car_plate: "",
		car_make: "",
		car_model: "",
		only_unfinished: true,
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [loading, setLoading] = useState(true);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});


	function showMessage(type, text) {
		setMessage({ type, text });

		setTimeout(() => {
			setMessage({ type: "", text: "" });
		}, 4000);
	}


	function handleApiError(err) {
		if (err.response?.data?.error) {
			showMessage("error", err.response.data.error);
		} else {
			showMessage("error", "Something went wrong.");
		}

		console.error(err);
	}


	function buildDateFilter() {
		if (!filters.year) return "";

		let date = filters.year;

		if (filters.month) date += "-" + filters.month.padStart(2, "0");
		if (filters.day) date += "-" + filters.day.padStart(2, "0");

		return date;
	}


	async function loadServices() {
		try {
			setLoading(true);

			const params = {};

			const date = buildDateFilter();

			if (date) params.checkin = date;
			if (filters.client_name) params.client_name = filters.client_name;
			if (filters.car_plate) params.car_plate = filters.car_plate;
			if (filters.car_make) params.car_make = filters.car_make;
			if (filters.car_model) params.car_model = filters.car_model;
			if (filters.only_unfinished) params.is_finished = false;

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/services", { params });

			setServices(res.data.service_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.service_list || []).length);
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	}


	useEffect(() => { loadServices(); }, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadServices();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	function updateFilter(e) {
		const { name, value, type, checked } = e.target;

		let updatedValue = type === "checkbox" ? checked : value;

		if (type !== "checkbox" && ["day", "month", "year"].includes(name)) {
			updatedValue = updatedValue.replace(/\D/g, "");

			if (name === "day") updatedValue = updatedValue.slice(0, 2);
			if (name === "month") updatedValue = updatedValue.slice(0, 2);
			if (name === "year") updatedValue = updatedValue.slice(0, 4);
		}

		setFilters((prev) => {
			const updated = { ...prev, [name]: updatedValue };

			if (name === "year" && updatedValue === "") {
				updated.month = "";
				updated.day = "";
			}

			if (name === "month" && updatedValue === "") {
				updated.day = "";
			}

			return updated;
		});
	}


	function padDateField(e) {
		const { name } = e.target;

		if (!["day", "month"].includes(name)) return;

		setFilters((prev) => {
			let value = prev[name];

			if (value.length === 1) value = value.padStart(2, "0");

			return { ...prev, [name]: value };
		});
	}


	function clearFilters() {
		setFilters({
			day: "",
			month: "",
			year: "",
			client_name: "",
			car_plate: "",
			car_make: "",
			car_model: "",
			only_unfinished: true,
		});
	}

	return (
		<div className="page services-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Serviços</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="filters">
							<input
								className="date-field"
								name="year"
								placeholder="AAAA"
								maxLength={4}
								value={filters.year}
								onChange={updateFilter}
							/>

							<input
								className="date-field"
								name="month"
								placeholder="MM"
								maxLength={2}
								value={filters.month}
								onChange={updateFilter}
								onBlur={padDateField}
								disabled={!filters.year}
							/>

							<input
								className="date-field"
								name="day"
								placeholder="DD"
								maxLength={2}
								value={filters.day}
								onChange={updateFilter}
								onBlur={padDateField}
								disabled={!filters.month}
							/>

							<input
								name="client_name"
								placeholder="Cliente"
								value={filters.client_name}
								onChange={updateFilter}
							/>

							<input
								name="car_plate"
								placeholder="Matrícula"
								value={filters.car_plate}
								onChange={updateFilter}
							/>

							<input
								name="car_make"
								placeholder="Marca"
								value={filters.car_make}
								onChange={updateFilter}
							/>

							<input
								name="car_model"
								placeholder="Modelo"
								value={filters.car_model}
								onChange={updateFilter}
							/>

							<label className="unfinished-filter">
								<input
									type="checkbox"
									name="only_unfinished"
									checked={filters.only_unfinished}
									onChange={updateFilter}
								/>
								<span>Serviços por terminar</span>
							</label>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>

							<button className="confirm" onClick={() => navigate("/services/new")}>
								<i className="fa-solid fa-plus" /> Adicionar Serviço
							</button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Entrada</th>
									<th>Saída</th>
									<th>Cliente</th>
									<th>Telemóvel</th>
									<th>Matrícula</th>
									<th>Marca</th>
									<th>Modelo</th>
									<th>Kms</th>
									<th>Estado</th>
								</tr>
							</thead>

							<tbody>
								{loading && services.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
									</tr>
								) : !loading && services.length === 0 ? (
									<tr>
										<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem Serviços.</td>
									</tr>
								) : (
									services.map((service) => {
										const isFinished = Boolean(service.is_finished);
										const isDelivered = Boolean(service.checkout);

										return (
											<tr
												key={service.id}
												className={
													isDelivered
														? "service-delivered-row"
														: isFinished
															? "service-finished-row"
															: ""
												}
												onClick={() => navigate(`/s/${service.id}`)}
											>
												<td data-label="Entrada">{service.checkin || "-"}</td>
												<td data-label="Saída">{service.checkout || "-"}</td>
												<td data-label="Cliente">{service.client_name || "-"}</td>
												<td data-label="Telemóvel">{service.client_phone || "-"}</td>
												<td data-label="Matrícula">{service.car_plate || "-"}</td>
												<td data-label="Marca">{service.car_make_name || "-"}</td>
												<td data-label="Modelo">{service.car_model_name || "-"}</td>
												<td data-label="Kms">{service.kms ?? "-"}</td>

												<td data-label="Estado">
													<span
														className={`service-status ${
															isDelivered
																? "service-status-delivered"
																: isFinished
																	? "service-status-finished"
																	: "service-status-pending"
														}`}
													>
														{isDelivered ? "Entregue" : isFinished ? "Terminado" : "Por terminar"}
													</span>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} serviços)</span>

							<button
								className="options"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
