import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

export default function MakePicker({
	onSelect,
	width="400px",
	has_edit=true
}) {


	const [selectedMake, setSelectedMake] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome"
		},
	];
	const makeFields = [
		{	name: "name",
			label: "Marca",
			type: "text",
			value: searchName,
		},

	]
	useEffect(()=>{
		onSelect(selectedMake);
	},[selectedMake])
	return (
		<div style={{width:width}}>
			{!selectedMake && !isCreate &&(<AddAndSearchBar
					url="/makes"
					item_term="Marca"
					list_term="make_list"
					search_term="name"
					onSelect={make => {
						setSelectedMake(make);
					}}
					onAdd={(n)=> {setIsCreate(true);
						setSearchName(n);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="make-search"
				/>)}

			{isCreate ?(
				<AddForm
					url="/makes"
					list_term="make"
					item_term="Marca"
					fields={makeFields}
					onAdd={response => {
						console.log(response);
						setIsCreate(false);
						setSelectedMake(response.data.make);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="make-form"
					is_inline={true}
					has_title={false}
			/>
			):( selectedMake && (
					<EditAndInfoCard
						item_id = {selectedMake?selectedMake.id:null}
						fields={makeFields}
						url="/makes"
						list_term="make"
						item_term="Marca"
						onUpdate={response => {
							console.log(response);
							setSelectedMake(response.data.make);
							onSelect(response.data.make)
						}}
						onRemove={()=>{setSelectedMake(null)}}
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
					/>
				))}

</div>
	);
}


