import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

import "./style/ClientPicker2.css";

export default function ClientPicker({
	onSelect,
	width = "100%",
	has_edit = true,
	client_id = null,
	has_fixed_s_bar=true,
	has_fixed_card=true
}) {
	const [selectedClient, setSelectedClient] = useState(
		client_id ? { id: client_id } : null
	);

	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome",
		},
		{
			name: "phone",
			label: "Telemóvel",
			emptyLabel: "S/Telemóvel",
		},
	];

	const clientFields = [
		{
			name: "name",
			label: "Nome",
			type: "text",
			value: searchName,
		},
		{
			name: "phone",
			label: "Telemóvel",
			type: "text",
		},
		{
			name: "tax_nr",
			label: "NIF",
			type: "text",
		},
		{
			name: "email",
			label: "Email",
			type: "email",
		},
		{
			name: "address",
			label: "Morada",
			type: "text",
		},
		{
			name: "zip_code",
			label: "Cod. Postal",
			type: "text",
		},
	];

	useEffect(() => {
		setIsCreate(false);
		setSearchName("");

		if (client_id) {
			setSelectedClient({ id: client_id });
		} else {
			setSelectedClient(null);
		}
	}, [client_id]);

	useEffect(() =>{onSelect(selectedClient)},[selectedClient]);

	return (
		<div
			className="client-picker"
			style={{ width, maxWidth: width }}
		>
			{(has_fixed_s_bar || (!selectedClient && !isCreate)) && (
				<AddAndSearchBar
					url="/clients"
					item_term="Cliente"
					list_term="client_list"
					search_term="name"
					onSelect={(client) => {setSelectedClient(client);}}
					onAdd={(name) => {
						setIsCreate(true);
						setSearchName(name);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="client-add-search-bar"
				/>
			)}

			{isCreate ? (
				<AddForm
					url="/clients"
					list_term="client"
					item_term="Cliente"
					fields={clientFields}
					onAdd={(response) => {
						setSelectedClient(response.data.client);
						setIsCreate(false);
					}}
					onCancel={() => {setIsCreate(false); }}
					css_class="client-add-form"
					is_inline={false}
					has_title={false}
				/>
			) 
			: 
			( 
				<EditAndInfoCard
					item_id={selectedClient?selectedClient.id:null}
					fields={clientFields}
					url="/clients"
					list_term="client"
					item_term="Cliente"
					onUpdate={(response) => {
						setSelectedClient(response.data.client);
					}}
					onRemove={() => { setSelectedClient(null);}}
					is_inline={false}
					has_title={false}
					has_edit={has_edit}
					css_class="client-edit-info-card"
				/>
			)}
		</div>
	);
}
