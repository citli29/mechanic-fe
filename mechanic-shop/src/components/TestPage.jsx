import { useState } from "react";

import MakePicker from "./BigPicker/MakePicker";
import ModelPicker from "./BigPicker/ModelPicker";
import ClientPicker from "./BigPicker/ClientPicker";
import ProductPicker from "./BigPicker/ProductPicker";

export default function TestPage() {

	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [selectedClient, setSelectedClient] = useState(null);
	const [selectedProduct, setSelectedProduct] = useState(null);

	return (
		<div>
			<MakePicker 
				onSelect={make=>{
					console.log(make);
					setSelectedMake(make);
			}}
			/>
			<ModelPicker
				onSelect={model=>{
					console.log(model);
					setSelectedModel(model)
				}}
				make_id={selectedMake?selectedMake.id:null}
			/>
			<ClientPicker 
				onSelect={client=>{
					console.log(client);
					setSelectedMake(client);
			}}
				/>
			<ProductPicker 
				onSelect={product=>{
					console.log(product);
					setSelectedProduct(product);
			}}
			/>
		</div>
	);
}


