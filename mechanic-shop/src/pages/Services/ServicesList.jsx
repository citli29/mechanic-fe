import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import "./ServicesList.css";

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
		only_unfinished: true
	});

	const [loading, setLoading] = useState(true);

	const [message, setMessage] = useState({
		type: "",
		text: ""
	});

	function showMessage(type, text) {

		setMessage({
			type,
			text
		});

		setTimeout(() => {

			setMessage({
				type: "",
				text: ""
			});

		}, 4000);

	}

	function handleApiError(err) {

		if (err.response?.data?.error) {

			showMessage(
				"error",
				err.response.data.error
			);

		}
		else {

			showMessage(
				"error",
				"Something went wrong."
			);

		}

		console.error(err);

	}

	useEffect(() => {

		const timer = setTimeout(() => {

			loadServices();

		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);

	function buildDateFilter() {

		if (!filters.year)
			return "";

		let date = filters.year;

		if (filters.month)
			date += "-" + filters.month.padStart(2, "0");

		if (filters.day)
			date += "-" + filters.day.padStart(2, "0");

		return date;

	}

	async function loadServices() {

		try {

			setLoading(true);

			const params = {};

			const date = buildDateFilter();

			if (date)
				params.checkin = date;

			if (filters.client_name)
				params.client_name = filters.client_name;

			if (filters.car_plate)
				params.car_plate = filters.car_plate;

			if (filters.car_make)
				params.car_make = filters.car_make;

			if (filters.car_model)
				params.car_model = filters.car_model;

			if (filters.only_unfinished)
				params.is_finished = false;

			const res = await api.get(
				"/services",
				{
					params
				}
			);

			setServices(
				res.data.service_list || []
			);

		}
		catch (err) {

			handleApiError(err);

		}
		finally {

			setLoading(false);

		}

	}

	function updateFilter(e) {

		const {
			name,
			value,
			type,
			checked
		} = e.target;

		let updatedValue =
			type === "checkbox"
				? checked
				: value;

		if (
			type !== "checkbox" &&
			["day", "month", "year"].includes(name)
		) {

			updatedValue =
				updatedValue.replace(/\D/g, "");

			if (name === "day")
				updatedValue =
					updatedValue.slice(0, 2);

			if (name === "month")
				updatedValue =
					updatedValue.slice(0, 2);

			if (name === "year")
				updatedValue =
					updatedValue.slice(0, 4);

		}

		setFilters(prev => {

			const updated = {
				...prev,
				[name]: updatedValue
			};

			if (
				name === "year" &&
				updatedValue === ""
			) {

				updated.month = "";
				updated.day = "";

			}

			if (
				name === "month" &&
				updatedValue === ""
			) {

				updated.day = "";

			}

			return updated;

		});

	}

	function padDateField(e) {

		const { name } = e.target;

		if (!["day", "month"].includes(name))
			return;

		setFilters(prev => {

			let value = prev[name];

			if (value.length === 1)
				value = value.padStart(2, "0");

			return {
				...prev,
				[name]: value
			};

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
			only_unfinished: true
		});

	}

	return (

		<div className="container">

			<h1>Serviços</h1>

			{message.text && (

				<div
					className={
						`api-message ${message.type}`
					}
				>
					{message.text}
				</div>

			)}

			<div className="filters">

				<input
					name="year"
					placeholder="AAAA"
					maxLength={4}
					value={filters.year}
					onChange={updateFilter}
				/>

				<input
					name="month"
					placeholder="MM"
					maxLength={2}
					value={filters.month}
					onChange={updateFilter}
					onBlur={padDateField}
					disabled={!filters.year}
				/>

				<input
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
						checked={
							filters.only_unfinished
						}
						onChange={updateFilter}
					/>

					<span>
						Serviços por terminar
					</span>

				</label>

				<button
					type="button"
					onClick={clearFilters}
				>
					Limpar
				</button>

				<button
					type="button"
					onClick={() =>
						navigate("/services/new")
					}
				>
					Adicionar Serviço
				</button>

			</div>

			<div className="table-wrapper">

				<table className="table">

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

								<td colSpan={9}>
									A Carregar...
								</td>

							</tr>

						) : !loading && services.length === 0 ? (

							<tr>

								<td colSpan={9}>
									Sem Serviços.
								</td>

							</tr>

						) : (

							services.map(service => {

								const isFinished =
									Boolean(
										service.is_finished
									);
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
												}	onClick={() =>
											navigate(
												`/services/${service.id}`
											)
										}
										style={{
											cursor: "pointer"
										}}
									>

										<td>
											{service.checkin || "-"}
										</td>

										<td>
											{service.checkout || "-"}
										</td>

										<td>
											{service.client_name || "-"}
										</td>

										<td>
											{service.client_phone || "-"}
										</td>

										<td>
											{service.car_plate || "-"}
										</td>

										<td>
											{service.car_make_name || "-"}
										</td>

										<td>
											{service.car_model_name || "-"}
										</td>

										<td>
											{service.kms ?? "-"}
										</td>


												<td>
													<span
														className={
															`service-status ${
isDelivered
? "service-status-delivered"
: isFinished
? "service-status-finished"
: "service-status-pending"
}`
														}
													>
														{isDelivered
															? "Entregue"
															: isFinished
																? "Terminado"
																: "Por terminar"}
													</span>
												</td>

									</tr>

								);

							})

						)}

					</tbody>

				</table>

			</div>

		</div>

	);

}
