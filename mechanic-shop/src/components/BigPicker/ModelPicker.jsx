import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

export default function ModelPicker({
	onSelect,
	width="400px",
	has_edit=true,
	make_id=null
}) {

	const [selectedModel, setSelectedModel] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome"
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
	]

	useEffect(() => {
		setSelectedModel(null); 
		setIsCreate(false); 
		setSearchName(""); 
		if (make_id == null) { 
			onSelect?.(null); 
		} }, [make_id]);
	return (
		<div style={{width:width}}>
			{!selectedModel && !isCreate &&(<AddAndSearchBar
				disabled ={!make_id?true:false}
				url={`/models?make_id=${make_id}`}
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
			/>
			)}
			{make_id && isCreate ?(
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
					is_inline={true}
					has_title={false}
			/>
			):(make_id && selectedModel && (
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
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
					/>)
				)}

</div>
	);
}


