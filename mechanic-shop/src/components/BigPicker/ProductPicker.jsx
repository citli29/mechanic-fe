import { useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";

import "./style/ProductPicker2.css";

export default function ProductPicker({
	value,
	onSelect,
	width = "100%",
	has_edit = true,
	product_id = null,
	has_fixed_s_bar = true
}) {
	const isControlled = value !== undefined;

	const [internalSelectedProduct, setInternalSelectedProduct] =
		useState(
			product_id
				? { id: product_id }
				: null
		);

	const selectedProduct = isControlled
		? value
		: internalSelectedProduct;

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
		{
			name: "name",
			label: "Nome",
			type: "text",
			value: searchName
		},
		{
			name: "reference",
			label: "Referência",
			type: "text"
		},
		{
			name: "product_type_id",
			label: "T. Produto",
			type: "select",
			url: "/product_types",
			list_term: "product_type_list",
			column_value: "id",
			text: "name",
			required: true
		}
	];

	useEffect(() => {
		setIsCreate(false);
		setSearchName("");

		if (isControlled) {
			return;
		}

		setInternalSelectedProduct(
			product_id
				? { id: product_id }
				: null
		);
	}, [product_id, isControlled]);

	function changeSelectedProduct(product) {
		if (!isControlled) {
			setInternalSelectedProduct(product);
		}

		onSelect?.(product);
	}

	return (
		<div
			className="product-picker"
			style={{
				width,
				maxWidth: width
			}}
		>
			{(
				has_fixed_s_bar ||
				(!selectedProduct && !isCreate)
			) && (
				<AddAndSearchBar
					url="/products"
					item_term="Produtos"
					list_term="product_list"
					search_term="name"
					onSelect={(product) => {
						changeSelectedProduct(product);
					}}
					onAdd={(name) => {
						setIsCreate(true);
						setSearchName(name);
					}}
					fields={defSearch}
					hasAdd={!isCreate}
					css_class="product-add-search-bar"
				/>
			)}

			{isCreate ? (
				<AddForm
					url="/products"
					list_term="product"
					item_term="Produto"
					fields={productFields}
					onAdd={(response) => {
						const product =
							response.data.product;

						setIsCreate(false);
						setSearchName("");

						changeSelectedProduct(product);
					}}
					onCancel={() => {
						setIsCreate(false);
						setSearchName("");
					}}
					css_class="product-add-form"
					is_inline={true}
					has_title={false}
				/>
			) : (
				selectedProduct && (
					<EditAndInfoCard
						item_id={selectedProduct.id}
						fields={productFields}
						url="/products"
						list_term="product"
						item_term="Produto"
						onUpdate={(response) => {
							const product =
								response.data.product;

							changeSelectedProduct(product);
						}}
						onRemove={() => {
							changeSelectedProduct(null);
						}}
						is_inline={true}
						has_title={false}
						has_edit={has_edit}
						css_class="product-edit-info-card"
					/>
				)
			)}
		</div>
	);
}

