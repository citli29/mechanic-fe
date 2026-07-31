import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";
import "./style/ProductPicker.css";

export default function ProductPicker({
	onSelect,
	width="100%",
	has_edit=true
}) {


	const [selectedProduct, setSelectedProduct] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "name",
			label: "Nome",
			emptyLabel: "S/Nome"
		},
		{
			name: "reference",
			label: "Referência",
			emptyLabel: "S/Referência"
		},
		{
			name: "product_type_name",
			label: "Tipo de Produto",
			emptyLabel: "S/Tipo de Produto"
		}
	];
	const productFields = [
		{	name: "name",
			label: "Nome",
			type: "text",
			value: searchName,
		},
		{	name: "reference",
			label: "Referência",
			type: "text",
		},
			{
				name: "product_type_id",
				label: "T. Produto",
				type: "select",
				// Endpoint that returns the options
				url: "/product_types",
				// Property in the response containing the array
				list_term: "product_type_list",

				// Value stored in the form
				column_value: "id",

				// Text shown to the user
				text: "name",

				required: true,
			},

	];
	useEffect(()=>{
		onSelect(selectedProduct);
	},[selectedProduct]);

	return (
		<div style={{maxWidth:width}}>

			{!selectedProduct && !isCreate &&(<AddAndSearchBar
					url="/products"
					item_term="Produtos"
					list_term="product_list"
					search_term="name"
					onSelect={product => {
						setSelectedProduct(product);
					}}
					onAdd={(n)=> {setIsCreate(true);
						setSearchName(n);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="product-search"
				/>)}

			{isCreate ?(
				<AddForm
					url="/products"
					list_term="product"
					item_term="Produto"
					fields={productFields}
					onAdd={response => {
						console.log(response);
						setIsCreate(false);
						setSelectedProduct(response.data.product);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="product-form"
					is_inline={true}
					has_title={false}
			/>
			):( selectedProduct && (
					<EditAndInfoCard
						item_id = {selectedProduct?selectedProduct.id:null}
						fields={productFields}
						url="/products"
						list_term="product"
						item_term="Produto"
						onUpdate={response => {
							console.log(response);
							setSelectedProduct(response.data.product);
							onSelect(response.data.product)
						}}
						onRemove={()=>{setSelectedProduct(null)}}
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
						css_class="product-card"
					/>
				))}

</div>
	);
}



