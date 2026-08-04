import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

export default function ModelPicker({
	onSelect,
	width = "400px",
	has_edit = true,
	make_id = null,
	model_id = null,
}) {
	const [selectedModel, setSelectedModel] = useState(
		model_id ? { id: model_id } : null
	);

	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome",
		},
	];

	const modelFields = [
		{
			name: "make_id",
			type: "hidden",
			value: make_id,
		},
		{
			name: "name",
			label: "Modelo",
			type: "text",
			value: searchName,
		},
	];

	/*
	 * Keep the picker synchronized when the parent changes
	 * either the make or the selected model.
	 */
	useEffect(() => {
		setIsCreate(false);
		setSearchName("");

		if (!make_id) {
			setSelectedModel(null);
			onSelect?.(null);
			return;
		}

		if (model_id) {
			setSelectedModel({ id: model_id });
		} else {
			setSelectedModel(null);
		}
	}, [make_id, model_id]);

	return (
		<div style={{ width }}>
			{!selectedModel && !isCreate && (
				<AddAndSearchBar
					disabled={!make_id}
					url={`/models?make_id=${make_id}`}
					item_term="Modelo"
					list_term="model_list"
					search_term="name"
					onSelect={(model) => {
						setSelectedModel(model);
						onSelect?.(model);
					}}
					onAdd={(name) => {
						setIsCreate(true);
						setSearchName(name);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="model-add-search-bar"
				/>
			)}

			{make_id && isCreate ? (
				<AddForm
					url="/models"
					list_term="model"
					item_term="Modelo"
					fields={modelFields}
					onAdd={(response) => {
						const model = response.data.model;

						setIsCreate(false);
						setSelectedModel(model);
						onSelect?.(model);
					}}
					onCancel={() => {
						setIsCreate(false);
					}}
					css_class="model-add-form"
					is_inline={true}
					has_title={false}
				/>
			) : (
				make_id &&
				selectedModel && (
					<EditAndInfoCard
						item_id={selectedModel.id}
						fields={modelFields}
						url="/models"
						list_term="model"
						item_term="Modelo"
						onUpdate={(response) => {
							const model = response.data.model;

							setSelectedModel(model);
							onSelect?.(model);
						}}
						onRemove={() => {
							setSelectedModel(null);
							onSelect?.(null);
						}}
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
						css_class="model-edit-info-card"
					/>
				)
			)}
		</div>
	);
}
