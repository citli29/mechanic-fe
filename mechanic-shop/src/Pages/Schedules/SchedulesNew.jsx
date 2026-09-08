import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { MakePicker } from "../../components/Pickers/MakePicker";
import { ModelPicker } from "../../components/Pickers/ModelPicker";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ScheduleForm.css";
import "./Style/SchedulesNew.css";

export default function SchedulesNew() {

	const navigate = useNavigate();

	const emptySchedule = {
		date: "",
		description: "",
		client_id: "",
		car_id: "",
		make_id: "",
		model_id: "",
	};

	const [editing, setEditing] = useState(emptySchedule);

	const today = new Date();
	const [calendarMonth, setCalendarMonth] = useState(
		new Date(today.getFullYear(), today.getMonth(), 1)
	);
	const [schedules, setSchedules] = useState([]);

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
			showMessage("error", "Ocorreu um erro.");
		}

		console.error(err);
	}


	async function loadSchedules() {
		try {
			const res = await api.get("/schedules");
			setSchedules(res.data.schedule_list || []);
		} catch {
			setSchedules([]);
		}
	}


	useEffect(() => { loadSchedules(); }, []);


	function formatDateKey(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return `${year}-${month}-${day}`;
	}


	function parseScheduleDate(value) {
		if (!value) return "";
		return String(value).slice(0, 10);
	}


	const appointmentsByDate = useMemo(() => {
		return schedules.reduce((result, schedule) => {
			const dateKey = parseScheduleDate(schedule.date);

			if (!dateKey) return result;

			result[dateKey] = (result[dateKey] || 0) + 1;

			return result;
		}, {});
	}, [schedules]);


	const calendarDays = useMemo(() => {
		const year = calendarMonth.getFullYear();
		const month = calendarMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const mondayOffset = (firstDay.getDay() + 6) % 7;
		const days = [];

		for (let index = 0; index < mondayOffset; index += 1) days.push(null);
		for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(year, month, day));
		while (days.length % 7 !== 0) days.push(null);

		return days;
	}, [calendarMonth]);


	const calendarTitle = new Intl.DateTimeFormat("pt-PT", {
		month: "long",
		year: "numeric",
	}).format(calendarMonth);


	function changeCalendarMonth(offset) {
		setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
	}


	function selectCalendarDate(date) {
		setEditing((prev) => ({ ...prev, date: formatDateKey(date) }));
	}


	function updateDate(e) {
		const { value } = e.target;

		setEditing((prev) => ({ ...prev, date: value }));

		if (value) {
			const [year, month] = value.split("-").map(Number);
			setCalendarMonth(new Date(year, month - 1, 1));
		}
	}


	function updateDescription(e) {
		const { value } = e.target;
		setEditing((prev) => ({ ...prev, description: value }));
	}


	function updateClientId(id) {
		setEditing((prev) => ({ ...prev, client_id: id }));
	}


	function updateCarId(id) {
		setEditing((prev) => ({
			...prev,
			car_id: id,
			...(id ? { make_id: "", model_id: "" } : {}),
		}));
	}


	function updateMakeId(id) {
		setEditing((prev) => ({ ...prev, make_id: id, model_id: "" }));
	}


	function updateModelId(id) {
		setEditing((prev) => ({ ...prev, model_id: id }));
	}


	async function createSchedule() {
		try {
			const data = {
				date: editing.date,
				description: editing.description,
			};

			if (editing.client_id) data.client_id = editing.client_id;

			if (editing.car_id) {
				data.car_id = editing.car_id;
			} else if (editing.model_id) {
				data.model_id = editing.model_id;
			}

			const res = await api.post("/schedules", data);

			showMessage("success", "Schedule created successfully.");

			navigate(`/schedules/${res.data.schedule.id}`);
		} catch (err) {
			handleApiError(err);
		}
	}


	return (
		<div className="page schedules-new-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-plus" />
						<h1>Nova Marcação</h1>
					</div>

					<div className="body">

						{message.text && (
							<div className={`api-message ${message.type}`}>
								{message.text}
							</div>
						)}

						<div className="schedule-new-layout">

							<section className="mini-calendar-card">

								<div className="mini-calendar-navigation">
									<button type="button" className="accent" onClick={() => changeCalendarMonth(-1)}>
										<i className="fa-solid fa-chevron-left" />
									</button>

									<h2>{calendarTitle}</h2>

									<button type="button" className="accent" onClick={() => changeCalendarMonth(1)}>
										<i className="fa-solid fa-chevron-right" />
									</button>
								</div>

								<div className="mini-calendar-weekdays">
									<span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
								</div>

								<div className="mini-calendar-grid">
									{calendarDays.map((date, index) => {
										if (!date) return <div key={`empty-${index}`} className="mini-calendar-day empty" />;

										const dateKey = formatDateKey(date);
										const count = appointmentsByDate[dateKey] || 0;
										const selected = editing.date === dateKey;
										const current = formatDateKey(today) === dateKey;

										return (
											<button
												key={dateKey}
												type="button"
												className={[
													"mini-calendar-day",
													count > 0 ? "has-appointments" : "",
													selected ? "selected" : "",
													current ? "today" : "",
												].filter(Boolean).join(" ")}
												onClick={() => selectCalendarDate(date)}
											>
												<span>{date.getDate()}</span>
												{count > 0 && <strong>{count}</strong>}
											</button>
										);
									})}
								</div>

								<div className="mini-calendar-legend">
									<span><i className="legend-dot appointments-dot" />Marcações</span>
									<span><i className="legend-dot selected-dot" />Selecionado</span>
								</div>

							</section>

							<div className="details-card">

								<div className="details-grid">

									<div className="field">
										<label>Data</label>

										<input
											type="date"
											name="date"
											value={editing.date || ""}
											onChange={updateDate}
										/>
									</div>

									<div className="field field-full">
										<label>Descrição</label>

										<textarea
											name="description"
											value={editing.description || ""}
											onChange={updateDescription}
										/>
									</div>

									<div className="picker-row">
										<ClientPicker
											client_id={editing.client_id}
											onClientIdChange={updateClientId}
											isAllowedEditing={true}
										/>
									</div>

									<div className="picker-row">
										<CarPicker
											car_id={editing.car_id}
											onCarIdChange={updateCarId}
											isAllowedEditing={true}
										/>
									</div>

									{!editing.car_id && (
										<>
											<div className="field">
												<label>Marca <span className="field-hint">(sem viatura escolhida)</span></label>

												<MakePicker
													make_id={editing.make_id}
													onMakeIdChange={updateMakeId}
												/>
											</div>

											<div className="field">
												<label>Modelo <span className="field-hint">(sem viatura escolhida)</span></label>

												<ModelPicker
													make_id={editing.make_id}
													model_id={editing.model_id}
													onModelIdChange={updateModelId}
												/>
											</div>
										</>
									)}

								</div>

								<div className="details-actions">
									<button className="confirm" onClick={createSchedule}>
										<i className="fa-solid fa-check" /> Criar
									</button>

									<button className="cancel" onClick={() => navigate("/schedules")}>
										<i className="fa-solid fa-xmark" /> Cancelar
									</button>
								</div>

							</div>

						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
