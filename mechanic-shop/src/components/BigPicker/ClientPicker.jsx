import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";
import "./style/ClientPicker.css";

export default function ClientPicker({
	onSelect,
	width="100%",
	has_edit=true
}) {


	const [selectedClient, setSelectedClient] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome"
		},
		{
			name: "phone",
			label: "Telemóvel",
			emptyLabel: "S/Telemóvel"
		}
	];
	const clientFields = [
		{	name: "name",
			label: "Nome",
			type: "text",
			value: searchName,
		},
		{	name: "phone",
			label: "Telemóvel",
			type: "text",
		},
		{	name: "tax_nr",
			label: "NIF",
			type: "text",
		},
		{	name: "email",
			label: "Email",
			type: "text",
		},
		{	name: "address",
			label: "Morada",
			type: "text",
		},
		{	name: "zip_code",
			label: "Cod.Postal",
			type: "text",
		},

	];
	useEffect(()=>{
		onSelect(selectedClient);
	},[selectedClient]);

	return (
		<div className="client-picker" style={{maxWidth:width}}>
			{!selectedClient && !isCreate &&(<AddAndSearchBar
					url="/clients"
					item_term="Cliente"
					list_term="client_list"
					search_term="name"
					onSelect={client => {
						setSelectedClient(client);
					}}
					onAdd={(n)=> {setIsCreate(true);
						setSearchName(n);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="client-search"
				/>)}

			{isCreate ?(
				<AddForm
					url="/clients"
					list_term="client"
					item_term="Cliente"
					fields={clientFields}
					onAdd={response => {
						console.log(response);
						setIsCreate(false);
						setSelectedClient(response.data.client);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="client-form"
					is_inline={false}
					has_title={true}
			/>
			):( selectedClient && (
					<EditAndInfoCard
						item_id = {selectedClient?selectedClient.id:null}
						fields={clientFields}
						url="/clients"
						list_term="client"
						item_term="Cliente"
						onUpdate={response => {
							console.log(response);
							setSelectedClient(response.data.client);
							onSelect(response.data.client)
						}}
						onRemove={()=>{setSelectedClient(null)}}
						is_inline={false}
						has_title={true}
						has_edit={has_edit}
						css_class="client-card"
					/>
				))}

</div>
	);
}



