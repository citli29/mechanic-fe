import { useCallback, useEffect, useState ,useRef } from "react";

import api from "./../api/axios";

import MakePicker from "./BigPicker/MakePicker";
import ModelPicker from "./BigPicker/ModelPicker";
import ClientPicker from "./BigPicker/ClientPicker";
import ProductPicker from "./BigPicker/ProductPicker";
import CarPicker from "./BigPicker/CarPicker";
import MiniCalendar from "./PickerComponents/MiniCalendar";
import AppliedProductsTable from "../pages/Services/AppliedProductsTable";


export default function TestPage() {

	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [selectedClient, setSelectedClient] = useState(null);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [selectedCar, setSelectedCar] = useState(null);
	const [selectedDate, setSelectedDate] = useState(null)

	const loadCalendarSchedules = useCallback(
		async ({ start, end }) => {
			const res = await api.get("/schedules", {
				params: {
					start_date: start,
					end_date: end
				}
			});

			return res.data.schedule_list ?? [];
		},
		[]
	);


	const appliedProductsTableRef = useRef(null);
	useEffect(()=>{
		if(selectedProduct === null) return;
		appliedProductsTableRef.current?.addProduct(selectedProduct);
		setSelectedProduct(null);
	},[selectedProduct]);

	return (
		<div >
			<MakePicker
				onSelect={model=>{
					console.log(model);
					setSelectedModel(model)
				}}
				//make_id={3}
			/>
			<ModelPicker
				onSelect={model=>{
					console.log(model);
					setSelectedModel(model)
				}}
				//make_id={1}
				//model_id={1}
			/>
			<ClientPicker 
				onSelect={client=>{
					console.log(client);
					setSelectedMake(client);
				}}
				//client_id={1}
			/>
			<CarPicker 
				onSelect={car=>{
					console.log(car);
					setSelectedCar(car);
				}}
			/>

			<MiniCalendar
				value={selectedDate}
				onSelect={date=>{
					console.log(date);
					if(selectedDate === date){
						setSelectedDate(null);
					}else{
						setSelectedDate(date)
					}
				}}
				loadSchedules={loadCalendarSchedules}
			/>
			<ProductPicker 
				onSelect={product=>{
					console.log(product);
					setSelectedProduct(product);
				}}
				value={selectedProduct}
				//product_id={1}
			/>
			<AppliedProductsTable 
				ref={appliedProductsTableRef}
				serviceId={1}
			/>
		</div>
	);
}


