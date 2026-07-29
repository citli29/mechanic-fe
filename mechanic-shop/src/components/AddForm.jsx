import { useEffect, useMemo, useState } from "react";
import api from "./../api/axios";
import "./AddForm.css";

// @url: api call to get the items
// @list_term: name of the list that the api returns in json
// @item_term: name to present in the placeholders (use singular)
// @fields: the fields on the post request to create the item
// @hasAdd: boolean -> Add functionality toggle
// @onAdd: function called when the item is created (passed as argument the created item)
// @css_class: css class of the div around the component

export default function AddForm({
	url,
	list_term,
	item_term,
	fields,
	onAdd,
	onCancel,
	css_class = "",
	is_inline = false,
}) {
	const initialForm = useMemo(
		() =>
			Object.fromEntries(
				fields.map((field) => [
					field.name,
					field.value ?? "",
				])
			),
		[fields]
	);

	const [form, setForm] = useState(initialForm);
	const [options, setOptions] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setForm(initialForm);
	}, [initialForm]);

	useEffect(() => {
		let isMounted = true;

		async function loadOptions() {
			try {
				const selectFields = fields.filter(
					(field) => field.type === "select"
				);

				const requests = selectFields.map(async (field) => {
					const response = await api.get(field.url);

					return [
						field.name,
						response.data?.[field.list_term] ?? [],
					];
				});

				const loadedOptions = Object.fromEntries(
					await Promise.all(requests)
				);

				if (isMounted) {
					setOptions(loadedOptions);
				}
			} catch (err) {
				console.error("Erro ao carregar as opções de seleção:", err);

				if (isMounted) {
					setError("Não foi possível carregar as opções.");
				}
			}
		}

		loadOptions();

		return () => {
			isMounted = false;
		};
	}, [fields]);

	function handleChange(event) {
		const { name, value, type, checked } = event.target;

		setForm((currentForm) => ({
			...currentForm,
			[name]: type === "checkbox" ? checked : value,
		}));
	}

	async function handleSubmit(event) {
		event.preventDefault();

		try {
			setIsSubmitting(true);
			setError("");

			const response = await api.post(url, form);

			onAdd(response.data[list_term]);
			setForm(initialForm);
		} catch (err) {
			console.error("Failed to create item:", err);
			setError(err.response.data.error);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleCancel() {
		setForm(initialForm);
		setError("");
		onCancel?.();
	}

	return (
		<form
			className={`add-form ${is_inline ? "inline" : "stacked"} ${css_class}`}

			onSubmit={handleSubmit}
		>
			<div className="form-header">
				<h3>Criar {item_term}</h3>
				<p
					className="form-error"
					role="alert"
					aria-live="polite"
				>
					{error}
				</p>
			</div>

			<div className="form-fields">
				{fields.map((field) => 
						field.type === "select" ? (
							<div className="form-field" key={field.name}>
								{!is_inline && (
									<label htmlFor={`field-${field.name}`}>
										{field.label}
									</label>
								)}

								<select
									id={`field-${field.name}`}
									name={field.name}
									value={form[field.name] ?? ""}
									onChange={handleChange}
									required={field.required}
								>
									<option value="">
										{is_inline ? field.label : `Selecionar ${field.label}`}
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
							</div>
						) : 
							<div className="form-field" key={field.name}>
								{!is_inline && (
									<label htmlFor={`field-${field.name}`}>
										{field.label}
									</label>
								)}

								<input
									id={`field-${field.name}`}
									type={field.type ?? "text"}
									name={field.name}
									placeholder={is_inline ? field.label : ""}
									value={form[field.name] ?? ""}
									onChange={handleChange}
									required={field.required}
								/>
							</div>
				)}
			</div>

			<div className="form-buttons">
				<button
					type="submit"
					disabled={isSubmitting}
				>
					{isSubmitting ? "A criar..." : "Criar"}
				</button>

				<button
					type="button"
					onClick={handleCancel}
					disabled={isSubmitting}
				>
					Cancelar
				</button>
			</div>
		</form>
	);
}
