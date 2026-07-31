import { useState } from "react";

import MakePicker from "./BigPicker/MakePicker";
import ModelPicker from "./BigPicker/ModelPicker";
import ClientPicker from "./BigPicker/ClientPicker";
import ProductPicker from "./BigPicker/ProductPicker";
import CarPicker from "./BigPicker/CarPicker";

export default function TestPage() {

	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [selectedClient, setSelectedClient] = useState(null);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [selectedCar, setSelectedCar] = useState(null);

	return (
		<div >
			<MakePicker
				onSelect={model=>{
					console.log(model);
					setSelectedModel(model)
				}}
				make_id={1}
			/>
			<ModelPicker
				onSelect={model=>{
					console.log(model);
					setSelectedModel(model)
				}}
				make_id={1}
				model_id={1}
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
			<CarPicker 
				onSelect={car=>{
					console.log(car);
					setSelectedCar(car);
				}}
			/>
		</div>
	);
}


