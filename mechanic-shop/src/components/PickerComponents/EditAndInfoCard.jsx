import { useEffect, useState } from "react";
import api from "./../../api/axios";
import "./EditAndInfoCard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faFloppyDisk,
	faPenToSquare,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";

// @url: api call to get the item
// @list_term: name of the item that the api returns in json
// @item_term: name to present in the placeholders (use singular)
// @fields: the fields presented and sent in the put request
// @onUpdate: function called when the item is updated
// @css_class: css class of the div around the component

export default function EditAndInfoCard({
	item_id,
	fields,
	url,
	list_term,
	item_term,
	onUpdate,
	onRemove,
	css_class = "",
	is_inline = false,
	has_title = true,
	has_edit = true,
}) {
	const [item, setItem] = useState(null);
	const [form, setForm] = useState({});
	const [options, setOptions] = useState({});
	const [isEditing, setIsEditing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!item_id) {
			setItem(null);
			setForm({});
			setIsEditing(false);
			setError("");
			return;
		}

		let isMounted = true;

		async function loadItem() {
			try {
				setError("");

				const response = await api.get(`${url}/${item_id}`);

				const loadedItem =
					response.data?.[list_term] ??
					response.data?.item ??
					response.data;

				if (isMounted) {
					setItem(loadedItem);
					setForm(createForm(loadedItem));
				}
			} catch (err) {
				console.error("Failed to load item:", err);

				if (isMounted) {
					setItem(null);
					setForm({});
					setError(err.response?.data?.error ?? "");
				}
			}
		}

		loadItem();

		return () => {
			isMounted = false;
		};
	}, [item_id, url, list_term, fields]);

	useEffect(() => {
		if (!item_id) {
			setOptions({});
			return;
		}

		let isMounted = true;

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
							field.url
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

				if (isMounted) {
					setOptions(loadedOptions);
				}
			} catch (err) {
				console.error(
					"Failed to load select options:",
					err
				);

				if (isMounted) {
					setError(err.response?.data?.error ?? "");
				}
			}
		}

		loadOptions();

		return () => {
			isMounted = false;
		};
	}, [item_id, fields]);

	function createForm(sourceItem) {
		return Object.fromEntries(
			fields.map((field) => [
				field.name,
				sourceItem?.[field.name] ??
					field.value ??
					"",
			])
		);
	}

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

	function handleEdit(event) {
		event.preventDefault();
		event.stopPropagation();

		setError("");
		setIsEditing(true);
	}

	function handleRemove(event) {
		event.preventDefault();
		event.stopPropagation();

		onRemove?.(item);
	}

	function handleCancel() {
		setForm(createForm(item));
		setError("");
		setIsEditing(false);
	}

	async function handleSubmit(event) {
		event.preventDefault();

		if (!isEditing || isSubmitting || !item) {
			return;
		}

		try {
			setIsSubmitting(true);
			setError("");

			const response = await api.put(
				`${url}/${item_id}`,
				form
			);

			const updatedItem =
				response.data[list_term];

			setItem(updatedItem);
			setForm(createForm(updatedItem));

			onUpdate?.(response);
			setIsEditing(false);
		} catch (err) {
			console.error("Failed to update item:", err);
			setError(err.response?.data?.error );
		} finally {
			setIsSubmitting(false);
		}
	}

	function card_buttons() {
		return (
			<div className={`card-buttons ${item ?"disabled":""}`}>
				{isEditing ? (
					<>
						<button
							className="confirm"
							type="submit"
							disabled={!item || isSubmitting}
						>
							<FontAwesomeIcon
								icon={faFloppyDisk}
							/>
						</button>

						<button
							className="cancel"
							type="button"
							onClick={handleCancel}
							disabled={!item ||isSubmitting}
						>
							<FontAwesomeIcon
								icon={faXmark}
							/>
						</button>
					</>
				) : (
					<>
						{has_edit && (
							<button
								className="option"
								type="button"
								onClick={handleEdit}
								disabled={!item }
							>
								<FontAwesomeIcon
									icon={faPenToSquare}
								/>
							</button>
						)}

						<button
							className="cancel"
							type="button"
							onClick={handleRemove}
							disabled={!item }
						>
							<FontAwesomeIcon
								icon={faXmark}
							/>
						</button>
					</>
				)}
			</div>
		);
	}

	return (
		<form
			className={`edit-info-card 
				${is_inline ? "inline" : "stacked"} 
				${isEditing ? "editing" : "viewing"} 
				${css_class}`}
			onSubmit={handleSubmit}
		>
			{has_title && (
				<div className="form-header">
					<h3>
						{item_term}
						{item_id ? ` #${item_id}` : ""}
					</h3>

					{error && (
						<p
							className="form-error"
							role="alert"
							aria-live="polite"
						>
							{error}
						</p>
					)}
				</div>
			)}

			<div className="card-fields">
				{fields
					.filter((field) => field.type !== "hidden")
					.map((field) => (
					<div
						className="card-field"
						key={field.name}
					>
						<label
							htmlFor={`edit-${field.name}`}
						>
							{`${field.label}${
								!isEditing ? ":" : ""
							}`}
						</label>

							{field.type === "select" ? (
								<select
									id={`edit-${field.name}`}
									name={field.name}
									value={form[field.name] ?? ""}
									onChange={handleChange}
									disabled={!isEditing}
									required={field.required}
								>
									<option value="">
										{is_inline
											? !isEditing
												? `S/${field.label}`
												: field.label
											: !isEditing
												? `S/${field.label}`
												: `Selecionar ${field.label}`}
									</option>

									{(
										options[field.name] ?? []
									).map((option) => (
										<option
											key={
												option[
													field.column_value
												]
											}
											value={
												option[
													field.column_value
												] ?? ""
											}
										>
											{
												option[
													field.text
												]
											}
										</option>
									))}
								</select>
							) : field.type === "textarea" ? (
								<textarea
									id={`edit-${field.name}`}
									name={field.name}
									placeholder={
										is_inline
											? field.label
											: ""
									}
									value={form[field.name] ?? ""}
									onChange={handleChange}
									disabled={!isEditing}
									required={field.required}
									rows={field.rows ?? 4}
								/>
							) : field.type === "checkbox" ? (
								<input
									id={`edit-${field.name}`}
									type="checkbox"
									name={field.name}
									checked={Boolean(
										form[field.name]
									)}
									onChange={handleChange}
									disabled={!isEditing}
								/>
							) : (
								<input
									id={`edit-${field.name}`}
									type={field.type ?? "text"}
									name={field.name}
									placeholder={
										is_inline
											? !isEditing
												? `S/${field.label}`
												: field.label
											: !isEditing
												? `S/${field.label}`
												: ""
									}
									value={form[field.name] ?? ""}
									onChange={handleChange}
									disabled={!isEditing}
									required={field.required}
								/>
									)}
					</div>
				))}

				{is_inline && card_buttons()}
			</div>

			{!has_title && (
				<div className="form-header">
					{error && (
						<p
							className="form-error"
							role="alert"
							aria-live="polite"
						>
							{error}
						</p>
					)}
				</div>
			)}

			{!is_inline && card_buttons()}
		</form>
	);
}

