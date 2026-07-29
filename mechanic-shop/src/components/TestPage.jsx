import AddAndSearchBar from "./AddAndSearchBar";
import { useState } from "react";
import AddForm from "./AddForm";
import EditAndInfoCard from "./EditAndInfoCard";

export default function TestPage() {


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
			emptyLabel: "S/Ref"
		},
		{
			name: "product_type_name",
			label: "Tipo de Produto",
			emptyLabel: "S/Tipo de Produto",
		}
	];
	const productFields = [
						{
							name: "name",
							label: "Nome",
							type: "text",
							value: searchName,
						},
						{
							name: "reference",
							label: "Referência",
							type: "text",
						},
						{
							name: "product_type_id",
							label: "Tipo de Produto",
							type: "select",
							url: "/product_types",
							list_term:"product_type_list",
							column_value: "id",
							text: "name",
						}

	]
	return (
		<div>
			<AddAndSearchBar
				url="/products"
				item_term="Produto"
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
				css_class="products-search"
			/>

			{isCreate &&(
				<AddForm
					url="/products"
					item_term="Produto"
					fields={productFields}
					onAdd={response => {
						console.log(response);
						setIsCreate(false);
						setSelectedProduct(response.data.product);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="products-form"
					is_inline={false}
			/>
			)}

			{selectedProduct && (
				<EditAndInfoCard
					item_id = {selectedProduct.id}
					fields={productFields}
					url="/products"
					list_term="product"
					item_term="Produto"
					onUpdate={response => {
						console.log(response);
						setSelectedProduct(response.data.product);
					}}
					is_inline={true}
				/>
			)}
		</div>
	);
}


