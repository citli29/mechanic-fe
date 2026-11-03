// Shared viatura pieces, used by the Viaturas list (CarsList) and the
// viatura page (CarShow) so both look and behave the same:
//   <CarCard>    plate + make/model + spec chips + service history
//   <CarDetails> every field, read-only (same layout as the form)
//   <CarForm>    create / edit, with "+ Adicionar Marca / Modelo"
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

import "./Style/CarCard.css";

export const emptyCar = {
	plate: "",
	make_id: "",
	model_id: "",
	month: "",
	year: "",
	cc: "",
	engine_code: "",
	color_code: "",
	chassi_nr: "",
};

const EDITABLE_FIELDS = Object.keys(emptyCar);

// Mês / Ano only take digits (typed or pasted): anything else is dropped.
const DIGIT_FIELDS = { month: 2, year: 4 };

export function digitsOnly(name, value) {
	if (!(name in DIGIT_FIELDS)) return value;
	return String(value).replace(/\D/g, "").slice(0, DIGIT_FIELDS[name]);
}

// "03/2003", "2003" or "" — registration date shown under the model.
export function formatRegistration(car) {
	if (!car.year) return "";
	if (!car.month) return String(car.year);
	return `${String(car.month).padStart(2, "0")}/${car.year}`;
}

// "2026-09-24" → "24/09/2026".
export function formatDay(date) {
	if (!date) return "";
	const [y, m, d] = String(date).slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
}

function isBlank(value) {
	return value === null || value === undefined || value === "";
}


/* ============================== CarCard ============================== */

// history: { count, lastDate, lastClient } — or null while it's loading.
// to: whole card links there (omit for no link). actions: buttons on the
// right. children: shown under the card's main row (e.g. <CarDetails>).
export function CarCard({ car, history, to, actions, className = "", children }) {
	const registration = formatRegistration(car);
	const specs = [
		car.cc && { icon: "fa-gauge-high", label: "Cilindrada", value: `${car.cc} cc` },
		car.engine_code && { icon: "fa-gears", label: "Motor", value: car.engine_code },
		car.color_code && { icon: "fa-palette", label: "Cor", value: car.color_code },
		car.chassi_nr && { icon: "fa-barcode", label: "Chassi", value: car.chassi_nr },
	].filter(Boolean);

	return (
		<div className={`car-card ${className}`}>
			{/* Whole card is a link (Ctrl/middle-click = new tab); the buttons
			   and the details sit above it. */}
			{to && <Link className="car-card-link" to={to} aria-label={`Abrir ${car.plate}`} />}

			<div className="car-plate" title={car.plate}>
				<span className="car-plate-country">P</span>
				<span className="car-plate-number">{car.plate}</span>
			</div>

			<div className="car-main">
				<div className="car-title">
					<span className="car-make">{car.make_name || "Sem marca"}</span>
					{car.model_name && <span className="car-model">{car.model_name}</span>}
				</div>

				<div className="car-specs">
					{registration && (
						<span className="car-spec" title="Data da matrícula">
							<i className="fa-regular fa-calendar" /> {registration}
						</span>
					)}
					{specs.map((spec) => (
						<span key={spec.label} className="car-spec" title={`${spec.label}: ${spec.value}`}>
							<i className={`fa-solid ${spec.icon}`} /> {spec.value}
						</span>
					))}
					{!registration && specs.length === 0 && (
						<span className="car-spec is-empty">Sem detalhes</span>
					)}
				</div>
			</div>

			<div className="car-history">
				{history ? (
					<>
						<span className="car-history-count">
							<b>{history.count ?? 0}</b> {Number(history.count) === 1 ? "serviço" : "serviços"}
						</span>
						{history.lastDate ? (
							<span className="car-history-last" title="Último serviço">
								Último: {formatDay(history.lastDate)}
								{history.lastClient && <> · {history.lastClient}</>}
							</span>
						) : (
							<span className="car-history-last">Sem serviços</span>
						)}
					</>
				) : (
					<span className="car-history-last">A carregar...</span>
				)}
			</div>

			{actions && <div className="car-actions">{actions}</div>}

			{children}
		</div>
	);
}


/* ============================= CarDetails ============================= */

// Read-only version of the form: same fields and layout. actions: the
// buttons under the fields (Editar, Abrir viatura...).
export function CarDetails({ car, actions }) {
	const rows = [
		["Matrícula", car.plate],
		["Marca", car.make_name],
		["Modelo", car.model_name],
		["Mês", car.month],
		["Ano", car.year],
		["Cilindrada (cc)", car.cc],
		["Código do motor", car.engine_code],
		["Código da cor", car.color_code],
		["Nº de chassi", car.chassi_nr],
	];

	return (
		<div className="car-details">
			<div className="car-form-grid">
				{rows.map(([label, value]) => (
					<div key={label} className="car-form-field">
						<span>{label}</span>
						<div className={`car-details-value ${isBlank(value) ? "is-empty" : ""}`}>
							{isBlank(value) ? "—" : value}
						</div>
					</div>
				))}
			</div>

			{actions && <div className="car-form-actions">{actions}</div>}
		</div>
	);
}


/* ============================== CarForm ============================== */

// car: the car to edit (has an id) or null to create one. onSaved(car)
// runs after a successful save; onCancel closes the form.
export function CarForm({ car, title, onSaved, onCancel }) {
	const isNew = !car?.id;

	const [values, setValues] = useState(() => {
		const start = { ...emptyCar };
		if (car) EDITABLE_FIELDS.forEach((f) => { start[f] = isBlank(car[f]) ? "" : String(car[f]); });
		return start;
	});

	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);

	const [creatingMake, setCreatingMake] = useState(false);
	const [creatingModel, setCreatingModel] = useState(false);
	const [newMakeName, setNewMakeName] = useState("");
	const [newModelName, setNewModelName] = useState("");

	const [saving, setSaving] = useState(false);


	useEffect(() => {
		api.get("/makes")
			.then((res) => setMakes(res.data.make_list || []))
			.catch((err) => { console.error(err); setMakes([]); });
	}, []);

	useEffect(() => { loadModels(values.make_id); }, []);


	async function loadModels(make_id) {
		if (!make_id) {
			setModels([]);
			return;
		}

		try {
			const res = await api.get("/models", { params: { make_id } });
			setModels(res.data.model_list || []);
		} catch (err) {
			console.error(err);
			setModels([]);
		}
	}


	function update(e) {
		const { name } = e.target;
		const value = digitsOnly(name, e.target.value);

		setValues((prev) => ({
			...prev,
			[name]: value,
			...(name === "make_id" ? { model_id: "" } : {}),
		}));

		if (name === "make_id") loadModels(value);
	}


	async function createMake() {
		if (!newMakeName.trim()) return;

		try {
			const res = await api.post("/makes", { name: newMakeName.trim() });
			const make = res.data.make;

			setMakes((prev) => [...prev, make]);
			setValues((prev) => ({ ...prev, make_id: String(make.id), model_id: "" }));
			setModels([]);
			setNewMakeName("");
			setCreatingMake(false);

			pushSuccessToast("Marca criada com sucesso.");
		} catch (err) {
			console.error(err);
		}
	}


	async function createModel() {
		if (!newModelName.trim() || !values.make_id) return;

		try {
			const res = await api.post("/models", { name: newModelName.trim(), make_id: values.make_id });
			const model = res.data.model;

			setModels((prev) => [...prev, model]);
			setValues((prev) => ({ ...prev, model_id: String(model.id) }));
			setNewModelName("");
			setCreatingModel(false);

			pushSuccessToast("Modelo criado com sucesso.");
		} catch (err) {
			console.error(err);
		}
	}


	async function save() {
		if (!values.plate.trim()) {
			pushErrorToast("A matrícula é obrigatória.");
			return;
		}
		if (!values.make_id) {
			pushErrorToast("Selecione uma marca.");
			return;
		}

		const data = Object.fromEntries(
			Object.entries(values).filter(([_, value]) => value !== "")
		);

		setSaving(true);
		try {
			const res = isNew
				? await api.post("/cars", data)
				: await api.put(`/cars/${car.id}`, data);

			pushSuccessToast(isNew ? "Viatura criada com sucesso." : "Viatura atualizada com sucesso.");
			onSaved?.(res.data.car);
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	}


	function inlineCreate(placeholder, value, setValue, onConfirm, onClose) {
		return (
			<div className="inline-create">
				<input
					placeholder={placeholder}
					value={value}
					autoFocus
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
				/>

				<div className="create-buttons">
					<button className="confirm" onClick={onConfirm}>
						<i className="fa-solid fa-check" />
					</button>
					<button className="cancel" onClick={() => { onClose(); setValue(""); }}>
						<i className="fa-solid fa-x" />
					</button>
				</div>
			</div>
		);
	}


	const field = (name, label, extra = {}) => (
		<label className="car-form-field">
			<span>{label}</span>
			<input name={name} value={values[name]} onChange={update} {...extra} />
		</label>
	);


	return (
		<div className="car-card car-form">
			<div className="car-form-title">
				<i className={`fa-solid ${isNew ? "fa-plus" : "fa-pen"}`} /> {title}
			</div>

			<div className="car-form-grid">
				{field("plate", "Matrícula *", { placeholder: "00-AA-00", autoFocus: true, className: "car-form-plate" })}

				<div className="car-form-field">
					<span>Marca *</span>
					{creatingMake
						? inlineCreate("Nova Marca", newMakeName, setNewMakeName, createMake, () => setCreatingMake(false))
						: (
							<select
								name="make_id"
								value={values.make_id}
								onChange={(e) => {
									if (e.target.value === "new") {
										setCreatingMake(true);
										return;
									}
									update(e);
								}}
							>
								<option value="">Marca</option>
								<option value="new">+ Adicionar Marca</option>
								{makes.map((make) => (
									<option key={make.id} value={make.id}>{make.name}</option>
								))}
							</select>
						)}
				</div>

				<div className="car-form-field">
					<span>Modelo</span>
					{creatingModel
						? inlineCreate("Novo Modelo", newModelName, setNewModelName, createModel, () => setCreatingModel(false))
						: (
							<select
								name="model_id"
								value={values.model_id}
								onChange={(e) => {
									if (e.target.value === "new") {
										setCreatingModel(true);
										return;
									}
									update(e);
								}}
							>
								<option value="">Modelo</option>
								{models.map((model) => (
									<option key={model.id} value={model.id}>{model.name}</option>
								))}
								{values.make_id && <option value="new">+ Adicionar Modelo</option>}
							</select>
						)}
				</div>

				{field("month", "Mês", { inputMode: "numeric", pattern: "[0-9]*", placeholder: "MM" })}
				{field("year", "Ano", { inputMode: "numeric", pattern: "[0-9]*", placeholder: "AAAA" })}
				{field("cc", "Cilindrada (cc)", { inputMode: "numeric" })}
				{field("engine_code", "Código do motor")}
				{field("color_code", "Código da cor")}
				{field("chassi_nr", "Nº de chassi")}
			</div>

			<div className="car-form-actions">
				<button className="options" onClick={onCancel} disabled={saving}>
					<i className="fa-solid fa-xmark" /> Cancelar
				</button>
				<button className="confirm" onClick={save} disabled={saving}>
					<i className="fa-solid fa-check" /> Guardar
				</button>
			</div>
		</div>
	);
}
