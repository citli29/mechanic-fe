import { useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

export default function CarPicker({
	onSelect,
	width="300px",
	has_edit=true
}) {


	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "make_name",
			label: "Marca",
			emptyLabel: "S/Marca"
		},
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome"
		},
	];
	const modelFields = [
		{
			name: "make_id",
			label: "Marca",
			type: "select",
			url: "/makes",
			list_term: "make_list",
			column_value: "id",
			text: "name",
			required: true
		},
		{
			name: "name",
			label: "Modelo",
			type: "text",
			value: searchName,
		},
	]
	return (
		<div style={{width:width}}>
			<div style={{margin:"0 0 7px 0 "}}>
			<AddAndSearchBar
				url="/models"
				item_term="Modelo"
				list_term="model_list"
				search_term="name"
				onSelect={model => {
					setSelectedModel(model);
				}}
				onAdd={(n)=> {setIsCreate(true);
					setSearchName(n);
				}}
				fields={defSearch}
				hasAdd={!isCreate}
				css_class="make-search"
			/></div>

			{isCreate ?(
				<AddForm
					url="/models"
					list_term="model"
					item_term="Marca"
					fields={modelFields}
					onAdd={response => {
						console.log(response);
						setIsCreate(false);
						setSelectedModel(response.data.model);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="make-form"
					is_inline={false}
					has_title={false}
			/>
			):(
					<EditAndInfoCard
						item_id = {selectedModel?selectedModel.id:null}
						fields={modelFields}
						url="/models"
						list_term="model"
						item_term="Marca"
						onUpdate={response => {
							console.log(response);
							setSelectedModel(response.data.model);
							onSelect(response.data.model)
						}}
						onRemove={()=>{setSelectedModel(null)}}
						is_inline={false}
						has_title={false}
						has_edit={has_edit}
					/>
				)}

</div>
	);
}


