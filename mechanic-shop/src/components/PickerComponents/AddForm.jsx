import { useEffect, useMemo, useState } from "react";
import api from "./../../api/axios";
//import "./AddForm.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faSquarePlus,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";

// @url: api call to create the item
// @list_term: name of the item that the api returns in json
// @item_term: name to present in the title
// @fields: fields included in the post request
// @onAdd: function called when the item is created
// @onCancel: function called when creation is cancelled
// @css_class: extra CSS class for the component
// @is_inline: inline or stacked layout
// @has_title: display the component title

export default function AddForm({
	url,
	list_term,
	item_term,
	fields,
	onAdd,
	onCancel,
	css_class = "",
	has_title = true,
}) {
	const initialForm = useMemo(
		() =>
			Object.fromEntries(
				fields.map((field) => [
					field.name,
					field.type === "checkbox"
						? Boolean(field.value)
						: field.value ?? "",
				])
			),
		[fields]
	);

	const visibleFields = useMemo(
		() =>
			fields.filter(
				(field) => field.type !== "hidden"
			),
		[fields]
	);

	const [form, setForm] = useState(initialForm);
	const [options, setOptions] = useState({});
	const [isSubmitting, setIsSubmitting] =
		useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setForm(initialForm);
	}, [initialForm]);

	useEffect(() => {
		const controller = new AbortController();

		async function loadOptions() {
			try {
				const selectFields = fields.filter(
					(field) =>
						field.type === "select" &&
						field.url
				);

				const requests = selectFields.map(
					async (field) => {
						const response = await api.get(
							field.url,
							{
								signal: controller.signal,
							}
						);

						return [
							field.name,
							response.data?.[
								field.list_term
							] ?? [],
						];
					}
				);

				const loadedOptions =
					Object.fromEntries(
						await Promise.all(requests)
					);

				if (!controller.signal.aborted) {
					setOptions(loadedOptions);
				}
			} catch (err) {
				if (
					err.code !== "ERR_CANCELED" &&
					!controller.signal.aborted
				) {
					console.error(
						"Erro ao carregar as opções de seleção:",
						err
					);

					setError(
						"Não foi possível carregar as opções."
					);
				}
			}
		}

		loadOptions();

		return () => {
			controller.abort();
		};
	}, [fields]);

	function handleChange(event) {
		const {
			name,
			value,
			type,
			checked,
		} = event.target;

		setForm((currentForm) => ({
			...currentForm,
			[name]:
				type === "checkbox"
					? checked
					: value,
		}));
	}

	async function handleSubmit(event) {
		event.preventDefault();

		if (isSubmitting) {
			return;
		}

		try {
			setIsSubmitting(true);
			setError("");

			const response = await api.post(url, form);

			onAdd?.(response);
			setForm(initialForm);
		} catch (err) {
			console.error(
				"Failed to create item:",
				err
			);

			setError(
				err.response?.data?.error ??
					"Não foi possível criar o item."
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleCancel() {
		setForm(initialForm);
		setError("");
		onCancel?.();
	}

	function formButtons() {
		return (
			<div className="card-buttons">
				<button
					className="confirm"
					type="submit"
					disabled={isSubmitting}
					aria-label="Criar"
					title="Criar"
				>
					<FontAwesomeIcon
						icon={faSquarePlus}
					/>
				</button>

				<button
					className="cancel"
					type="button"
					onClick={handleCancel}
					disabled={isSubmitting}
					aria-label="Cancelar"
					title="Cancelar"
				>
					<FontAwesomeIcon
						icon={faXmark}
					/>
				</button>
			</div>
		);
	}
	function renderField(field) {
		switch (field.type) {
			case "select":
				return (
					<select
						id={`field-${field.name}`}
						name={field.name}
						value={form[field.name] ?? ""}
						onChange={handleChange}
						required={field.required}
					>
						<option value="">
							{`Selecionar ${field.label}`}
						</option>

						{(options[field.name] ?? []).map(option => (
							<option
								key={option[field.column_value]}
								value={option[field.column_value] ?? ""}
							>
								{option[field.text]}
							</option>
						))}
					</select>
				);

			case "textarea":
				return (
					<textarea
						id={`field-${field.name}`}
						name={field.name}
						placeholder={ field.label }
						value={ form[field.name] ?? ""}
						onChange={handleChange}
						required={field.required}
						rows={field.rows ?? 4}
					/>
				)
			case "checkbox" : 
				return(
					<input
						id={`field-${field.name}`}
						type="checkbox"
						name={field.name}
						checked={Boolean(form[field.name])}
						onChange={handleChange}
					/>
				)
			default:
				return (
					<input
						id={`field-${field.name}`}
						type={ field.type ?? "text" }
						name={field.name}
						placeholder={field.label}
						value={form[field.name]??""}
						onChange={handleChange}
						required={field.required}
					/>
				);
		}
	}

	return (
		<form
			className={`add-form editing ${css_class}`}
			onSubmit={handleSubmit}
		>
			{has_title && (
				<div className="form-header">
					<h3>Criar {item_term}</h3>
				</div>
			)}

			<div className="form-fields">
				{visibleFields.map((field) => (
					<div className="form-field" key={field.name} >
						<label htmlFor={`field-${field.name}`} >
							{field.label}
						</label>
						{renderField(field)} 
					</div>
				))}
			</div>

			{error && (
				<div className="error-card">
					<p role="alert" aria-live="polite" >
						{error}
					</p>
				</div>
			)}

			{formButtons()}
		</form>
	);
}

