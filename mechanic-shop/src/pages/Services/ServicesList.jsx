import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

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
		car_model: ""
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

			const res = await api.get("/services", {
				params
			});

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

		let { name, value } = e.target;

		if (["day", "month", "year"].includes(name)) {

			value = value.replace(/\D/g, "");

			if (name === "day")
				value = value.slice(0, 2);

			if (name === "month")
				value = value.slice(0, 2);

			if (name === "year")
				value = value.slice(0, 4);

		}

		setFilters(prev => {

			const updated = {
				...prev,
				[name]: value
			};

			if (name === "year" && value === "") {

				updated.month = "";
				updated.day = "";

			}

			if (name === "month" && value === "") {

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
			car_model: ""
		});

	}

	return (
		<div className="container">

			<h1>Serviços</h1>

			{message.text && (

				<div className={`api-message ${message.type}`}>
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

				<button onClick={clearFilters}>
					Limpar
				</button>

				<button
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
							<th>Client</th>
							<th>Telemóvel</th>
							<th>Matrícula</th>
							<th>Marca</th>
							<th>Modelo</th>
							<th>Kms</th>

						</tr>

					</thead>

					<tbody>

						{loading && services.length === 0 ? (

							<tr>

								<td colSpan={8}>
									A Carregar...
								</td>

							</tr>

						) : !loading && services.length === 0 ? (

							<tr>

								<td colSpan={8}>
									Sem Serviços.
								</td>

							</tr>

						) : (

							services.map(service => (

								<tr
									key={service.id}
									onClick={() =>
										navigate(`/services/${service.id}`)
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

								</tr>

							))

						)}

					</tbody>

				</table>

			</div>

		</div>
	);

}

