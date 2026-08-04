import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

export default function MakePicker({
	onSelect,
	width = "400px",
	has_edit = true,
	make_id = null,
}) {
	const [selectedMake, setSelectedMake] = useState(
		make_id ? { id: make_id } : null
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

	const makeFields = [
		{
			name: "name",
			label: "Marca",
			type: "text",
			value: searchName,
		},
	];

	/*
	 * Keep the picker synchronized if the make_id
	 * received from the parent changes.
	 */
	useEffect(() => {
		setIsCreate(false);
		setSearchName("");

		if (make_id) {
			setSelectedMake({ id: make_id });
		} else {
			setSelectedMake(null);
		}
	}, [make_id]);

	return (
		<div style={{ width }}>
			{!selectedMake && !isCreate && (
				<AddAndSearchBar
					url="/makes"
					item_term="Marca"
					list_term="make_list"
					search_term="name"
					onSelect={(make) => {
						setSelectedMake(make);
						onSelect?.(make);
					}}
					onAdd={(name) => {
						setIsCreate(true);
						setSearchName(name);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="make-add-search-bar"
				/>
			)}

			{isCreate ? (
				<AddForm
					url="/makes"
					list_term="make"
					item_term="Marca"
					fields={makeFields}
					onAdd={(response) => {
						const make = response.data.make;

						setIsCreate(false);
						setSelectedMake(make);
						onSelect?.(make);
					}}
					onCancel={() => {
						setIsCreate(false);
					}}
					css_class="make-add-form"
					is_inline={true}
					has_title={false}
				/>
			) : (
				selectedMake && (
					<EditAndInfoCard
						item_id={selectedMake.id}
						fields={makeFields}
						url="/makes"
						list_term="make"
						item_term="Marca"
						onUpdate={(response) => {
							const make = response.data.make;

							setSelectedMake(make);
							onSelect?.(make);
						}}
						onRemove={() => {
							setSelectedMake(null);
							onSelect?.(null);
						}}
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
						css_class="make-edit-info-card"
					/>
				)
			)}
		</div>
	);
}
