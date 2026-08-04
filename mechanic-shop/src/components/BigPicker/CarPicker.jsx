import {useEffect, useState } from "react";

import AddAndSearchBar from "./../PickerComponents/AddAndSearchBar";
import AddForm from "./../PickerComponents/AddForm";
import EditAndInfoCard from "./../PickerComponents/EditAndInfoCard";
import MakePicker from "./MakePicker";
import ModelPicker from "./ModelPicker";

import "./style/CarPicker2.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";

export default function CarPicker({
	onSelect,
	width="100%",
	has_edit=true,
	has_fixed_s_bar=true
}) {


	const [selectedMake, setSelectedMake] = useState(null);
	const [selectedModel, setSelectedModel] = useState(null);
	const [selectedCar, setSelectedCar] = useState(null);
	const [isCreate, setIsCreate] = useState(false);
	const [searchName, setSearchName] = useState("");

	const defSearch = [
		{
			name: "plate",
			label: "Matrícula",
			emptyLabel: "S/Matrícula"
		},
		{
			name: "make_name",
			label: "Marca",
			emptyLabel: "S/Marca"
		},
		{
			name: "model_name",
			label: "Modelo",
			emptyLabel: "S/Modelo"
		},
	];
	const carFields =[
		{
			name: "plate",
			label: "Matrícula",
			type: "text",
			value: searchName,
		},
		{
			name: "month",
			label: "Mês",
			type: "number",
		},
		{
			name: "year",
			label: "Ano",
			type: "number",
		},
		{
			name: "chassi_nr",
			label: "Nr. Chassi",
			type: "text",
		},
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
			name: "model_id",
			label: "Modelo",
			type: "select",
			url: "/models",
			list_term: "model_list",
			column_value: "id",
			text: "name",
		},
	]

	const [freePlateFormat, setFreePlateFormat] = useState(false);

	const formatPlate = (value) => {
		const clean = value
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 6);

		return clean.match(/.{1,2}/g)?.join("-") ?? "";
	};

	// To create the button for the plate format
	useEffect(() => {
		const inputIds = ["field-plate", "edit-plate"];
		const cleanups = [];

		inputIds.forEach((inputId) => {
			const input = document.getElementById(inputId);

			if (!input) {
				return;
			}

			const inputContainer = input.parentElement;

			if (!inputContainer) {
				return;
			}

			const existingButton = inputContainer.querySelector(
				".plate-format-toggle"
			);

			if (existingButton) {
				existingButton.remove();
			}

			const button = document.createElement("button");

			button.type = "button";
			button.className = "plate-format-toggle";
			button.disabled = input.disabled;

			const observer = new MutationObserver(() => {
				button.disabled = input.disabled;
			});

			observer.observe(input, {
				attributes: true,
				attributeFilter: ["disabled"],
			});

			cleanups.push(() => {
				observer.disconnect();
				button.removeEventListener("click", handleToggle);
				input.removeEventListener("input", handleInput);
				button.remove();
				inputContainer.classList.remove("plate-input-container");
			});
			button.innerHTML = freePlateFormat
				? '<i class="fa-solid fa-lock-open"></i>'
				: '<i class="fa-solid fa-lock"></i>';
			button.title = freePlateFormat
				? "Ativar formatação automática"
				: "Desativar formatação automática";

			const handleToggle = () => {
				setFreePlateFormat((current) => !current);
			};

			const handleInput = (event) => {
				if (freePlateFormat) {
					const upper = event.target.value.toUpperCase();

					if (upper !== event.target.value) {
						event.target.value = upper;

						event.target.dispatchEvent(
							new Event("change", { bubbles: true })
						);
					}

					return;
				}

				const formattedValue = formatPlate(event.target.value);

				if (event.target.value !== formattedValue) {
					event.target.value = formattedValue;

					event.target.dispatchEvent(
						new Event("change", { bubbles: true })
					);
				}
			};
			button.addEventListener("click", handleToggle);
			input.addEventListener("input", handleInput);

			inputContainer.classList.add("plate-input-container");
			input.insertAdjacentElement("afterend", button);

			cleanups.push(() => {
				button.removeEventListener("click", handleToggle);
				input.removeEventListener("input", handleInput);
				button.remove();
				inputContainer.classList.remove("plate-input-container");
			});
		});

		return () => {
			cleanups.forEach((cleanup) => cleanup());
		};
	}, [isCreate, selectedCar, freePlateFormat]);

	useEffect(() => {
		const input = document.getElementById("edit-month");
		if (!input) return;

		input.type = "number";
		input.min = "1";
		input.max = "12";

		const input_2 = document.getElementById("field-month");
		if (!input_2) return;

		input_2.type = "number";
		input_2.min = "1";
		input_2.max = "12";
	}, []);

	useEffect(() => {
		const input= document.getElementById("field-month");
		if (!input) return;

		input.type = "number";
		input.min = "1";
		input.max = "12";
	}, [isCreate]);

	useEffect(()=>(onSelect(selectedCar)),[selectedCar]);

	return (
		<div 
			className="car-picker" 
			style={{width:width}}
		>
			{(has_fixed_s_bar || (!selectedCar && !isCreate)) && (<AddAndSearchBar
				url="/cars"
				item_term="Viatura"
				list_term="car_list"
				search_term="plate"
				onSelect={car => {setSelectedCar(car);}}
				onAdd={(name)=> {
					setIsCreate(true);
					setSearchName(name);
				}}
				fields={defSearch}
				hasAdd={!isCreate}
				css_class="car-add-search-bar"
			/>)}

			{isCreate ? (
				<AddForm
					url="/cars"
					list_term="car"
					item_term="Viatura"
					fields={carFields}
					onAdd={(response) => {
						setSelectedCar(response.data.car);
						setIsCreate(false);
					}}
					onCancel={()=>{setIsCreate(false);}}
					css_class="car-add-form"
					is_inline={false}
					has_title={false}
				/>
			)
			:
			(
				<EditAndInfoCard
					item_id = {selectedCar?selectedCar.id:null}
					fields={carFields}
					url="/cars"
					list_term="car"
					item_term="Viatura"
					onUpdate={(response) => {
						setSelectedCar(response.data.car);
					}}
					onRemove={()=>{setSelectedCar(null)}}
					is_inline={false}
					has_title={false}
					has_edit={has_edit}
					css_class="car-edit-info-card"
				/>
			)}

</div>
	);
}


