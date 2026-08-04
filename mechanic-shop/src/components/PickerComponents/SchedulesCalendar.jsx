import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DateItemsCalendar from "./DateItemsCalendar";
import "./SchedulesCalendar.css";

export default function SchedulesCalendar() {
	const navigate = useNavigate();

	const [filters, setFilters] = useState({
		car_plate: "",
		car_make: "",
		car_model: "",
		client_name: ""
	});

	function updateFilter(event) {
		const { name, value } = event.target;

		setFilters(previousFilters => ({
			...previousFilters,
			[name]: value
		}));
	}

	function clearFilters() {
		setFilters({
			car_plate: "",
			car_make: "",
			car_model: "",
			client_name: ""
		});
	}

	const requestParams = useMemo(() => {
		return Object.fromEntries(
			Object.entries(filters).filter(
				([, value]) =>
					value !== "" &&
					value !== null &&
					value !== undefined
			)
		);
	}, [filters]);

	function getCarComoponent(schedule){
		if(schedule.car_id){
			return(
				<>
					<div>{schedule.car_plate}</div>
					<div>{schedule.car_make??"S/Marca"}{schedule.car_model? " ":""}{schedule.car_model}</div>
				</>
			);
		}
		return( 
			<>
				<div>S/Viatura</div>
			</>
		);
	}
	function getClientComoponent(schedule){
		if(schedule.client_id){
			return(
				<>
					<div>{schedule.client_name}{schedule.client_phone ?` (${schedule.client_phone})`:"" }</div>
				</>
			);
		}
		return( 
			<>
				<div>S/Cliente</div>
			</>
		);
	}

	return (
		<div className="schedules-calendar">
			<div className="filters">
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
				<input
					name="client_name"
					placeholder="Cliente"
					value={filters.client_name}
					onChange={updateFilter}
				/>
				<button
					type="button"
					onClick={clearFilters}
				>
					Limpar
				</button>
			</div>

			<DateItemsCalendar
				url="/schedules"
				list_term="schedule_list"
				date_term="date"
				params={requestParams}
				getItemKey={schedule => schedule.id}
				onItemClick={schedule => navigate(`/schedules/${schedule.id}`)}
				renderItem={schedule => (
					<div className="appointment">
						{getCarComoponent(schedule)}
						{getClientComoponent(schedule)}
						<div>
							{schedule.description}
						</div>
					</div>
				)}
			/>
		</div>
	);
}
