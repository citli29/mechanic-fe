import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/CarPicker.css";
import { MakePicker } from "./MakePicker";
import { ModelPicker } from "./ModelPicker";

const SEARCHING = 1;
const SELECTED = 2;
const CREATING = 3;
const EDITING = 4;

const emptyCar = {
	id: "",
	plate: "",
	make_id: "",
	model_id: "",
	chassi_nr: "",
	year: "",
	month: "",
	cc: "",
	engine_code: "",
	color_code: "",
};

export const CarPicker = ({
	car_id="",
	onCarIdChange,
}) => {
	const [cars, setCars] = useState([]);
	const [searchCar, setSearchCar] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");
	const [car,setCar] = useState(null);
	const [state, setState] = useState(-1);

	const [isInfoShowing, setIsInfoShowing] = useState(false);
	const [presentingCar, setPresentingCar] = useState(emptyCar);

	useEffect(() => {
		onCarIdChange(car?.id??"");
		setPresentingCar(car??emptyCar);
		setIsPlateLocked(car?formatPlate(car.plate)===car.plate: true);
	},[car]);
	
	const postCar = async (newCar) =>{
		try{
			const response = await api.post(`cars`, {
				plate: newCar?.plate??"",
				make_id: newCar?.make_id??"",
				model_id: newCar?.model_id??"",
				chassi_nr: newCar?.chassi_nr??"",
				year: newCar?.year??"",
				month: newCar?.month??"",
				cc: newCar?.cc??"",
				engine_code: newCar?.engine_code??"",
				color_code: newCar?.color_code??"",
			})
			if(typeof response.data.car !== "undefined"){
				return response.data.car;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const putCar = async (newCar, car) =>{
		try{
			const response = await api.put(`cars/${car.id}`,{
				plate: newCar?.plate??"",
				make_id: newCar?.make_id??"",
				model_id: newCar?.model_id??"",
				chassi_nr: newCar?.chassi_nr??"",
				year: newCar?.year??"",
				month: newCar?.month??"",
				cc: newCar?.cc??"",
				engine_code: newCar?.engine_code??"",
				color_code: newCar?.color_code??"",
			})
			if(typeof response.data.car !== "undefined"){
				return response.data.car;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getCars = async (searchCar) => {
		try{
			const response = await api.get("cars",{
				params : { 
					plate:searchCar, 
				},
			})
			if(typeof response.data.car_list !== "undefined"){
				return response.data.car_list;
			}else{
				return [];
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const getCar = async (id) => {
		try{
			const response = await api.get(`cars/${id}`);
			if(typeof response.data.car !== "undefined"){
				return response.data.car;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	useEffect(()=>{
		const load = async () => {
			if (car_id) {
				const c = await getCar(car_id);

				if (c) {
					setCar(c);
					setState(SELECTED);
				}
			} else {
				const list = await getCars("");
				setCars(list);
				setState(SEARCHING);
			}
		}
		load();
	} ,[car_id]);

	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchCar);	
		},300);
		return () => clearTimeout(timer);
	},[searchCar]);
	
	useEffect(()=>{
		let isCurrent = true;

		const f = async () =>{
			const tempCars = await getCars(debouncedValue);
			if(isCurrent) setCars(tempCars);
		}
		f();
		return ()=>{isCurrent=false};
	},[debouncedValue]);

	//For Debug
	useEffect(()=>{console.log("Cars: ", cars)},[cars]);
	useEffect(()=>{console.log("Car: ", car)},[car]);
	useEffect(()=>{console.log("State: ", state)},[state]);

	//Interactivity
	const refSearch = useRef(null);

	const [isSearchSelected, setIsSearchSelected] = useState(false);

	useEffect(() => {
		function handleClickOutside(e) {
			if ( refSearch.current && !refSearch.current.contains(e.target)) {
				setIsSearchSelected(false);
			}else{
				setIsSearchSelected(true);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleClickStartAdd = (s) => {
		setIsSearchSelected(false);
		setIsInfoShowing(true);
		setState(CREATING);
		setPresentingCar({...emptyCar,
			plate : formatPlate(searchCar),
		});
		setIsPlateLocked(true);
	}

	const handleClickSelect = (c) => {
		setIsInfoShowing(false);
		setIsSearchSelected(false);
		setCar(c);
		setState(SELECTED);
		setIsPlateLocked(isPlateFormatted(c.plate));
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setSearchCar("")
		setCar(null);
		setCars(await getCars())
		setIsSearchSelected(false);
		setIsInfoShowing(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
		setIsInfoShowing(true);
	}

	const handleClickActionEdit = async () =>{
		const c = await putCar(presentingCar, car);
		if(c){
			setState(SELECTED);
			setCar(c);
		}
	}

	const handleClickStartEditCancel = async () =>{
		setState(SELECTED);
		const c = await getCar(car.id);
		setCar(c);
	}

	const handleClickStartAddCancel = (e) =>{ handleClickSelectCancel(e); }

	const handleClickActionAdd = async (e) =>{
		e.preventDefault();
		const c = await postCar(presentingCar);
		if(c){
			setState(SELECTED);
			setCar(c);
		}
	}

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
						<button  className="confirm" onClick={(e)=>handleClickActionAdd(e)}><i className="fa-solid fa-check"/></button>
						<button  className="cancel" onClick={(e)=>{handleClickStartAddCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
						<button className="car" onClick={(e)=>{setIsInfoShowing(!isInfoShowing)}}><i className={`fa-solid fa-chevron-${isInfoShowing?"up":"down"}`}/></button>
						<button className="options" onClick={(e)=>handleClickStartEdit(e)}><i className="fa-solid fa-pen-to-square"/></button>
						<button className="cancel" onClick={(e)=>{handleClickSelectCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
						<button className="confirm" onClick={(e)=>handleClickActionEdit(e)}><i className="fa-solid fa-check"/></button>
						<button className="cancel" onClick={(e)=>{handleClickStartEditCancel(e)}}><i className="fa-solid fa-xmark"/></button>
					</div>
				);
		}
	}

	const renderSearching = () => {
		return(
			<div className="m-searching c-searching" 
					ref={refSearch}
			> 
				<input 
					onFocus={()=>setIsSearchSelected(true)}
					type="text"
					placeholder={"Pesquisar Viatura..."}
					value={searchCar}
					onChange={(e)=>{setSearchCar(e.target.value)}}
				/>
				{isSearchSelected && (<ul className="dropdown">
					<li >
						<button onClick={()=>handleClickStartAdd(searchCar)}>
							Adicionar Viatura <span>{searchCar}</span>
						</button>
					</li>
					{cars?.map(c => (<li  key={c.id}>
						<button onClick={()=>handleClickSelect(c)}>
							<span>{c.plate}</span>
							<span>{c.make_name}</span>
							<span>{c.model_name}</span>
						</button>
					</li>))}
				</ul>)}
			</div>
		);
	}
	const isEditable = state === CREATING || state === EDITING
	const [isPlateLocked, setIsPlateLocked ] = useState(true);

	const isPlateFormatted = (plate) =>{
		 const regex = /^(?:[A-Z]{2}-\d{2}-[A-Z]{2}|\d{2}-\d{2}-[A-Z]{2}|\d{2}-[A-Z]{2}-\d{2}|[A-Z]{2}-\d{2}-\d{2})$/;

		return regex.test(plate.trim().toUpperCase())
	}

	const formatPlate = (value) => {
		const clean = value
		.replace(/[^a-zA-Z0-9]/g, "")
		.toUpperCase()
		.slice(0, 6);

		return clean.match(/.{1,2}/g)?.join("-") ?? "";
	};
	const handleClickLockPlate = () =>{
		if(isPlateLocked){ setIsPlateLocked(false);
		}else{
			const p = formatPlate(presentingCar.plate);
			setPresentingCar((prev)=>({...prev, plate:p}));
			setIsPlateLocked(true);
		}
	}

	const renderNotSearching = () => {
		return(
			
			<div className="c-selected"> 
				<div className="car-header">
					<div className="car-input">
						<span>{car?.plate??""}</span>
						<span>{car?.make_name??""}</span>
						<span>{car?.model_name??""}</span>
					</div>
					{renderSelectedButtons()}
				</div>
				<div className={`car-info ${!isInfoShowing?"hidden":""}`}>
					<div className="car-field" id="car-plate">
						<label htmlFor="car-plate">Matrícula</label>
						<div className="car-field-plate">
							<input 
								value={presentingCar?.plate??""}
								type="text"
								disabled= {!isEditable}
								onChange={(e) =>
									setPresentingCar(prev => ({
										...prev,
										plate: isPlateLocked?formatPlate(e.target.value):e.target.value.toUpperCase()
									}))
								}
							/>
						<button disabled={!isEditable} className="car" onClick={(()=>handleClickLockPlate())}><i className={`fa-solid ${isPlateLocked?"fa-lock":"fa-unlock"}`}/></button>
						</div>
					</div>
					<div className="car-field" id="car-make">
						<label htmlFor="car-make">Marca</label>
						<div className="make-picker-container">
							<MakePicker
								make_id={presentingCar?.make_id??""}
								onMakeIdChange={(id)=>{
									setPresentingCar(prev => ({
										...prev,
										make_id: id,
										model_id: ""
									}));
								} }
								disabled= {!isEditable}
							/>
						</div>
					</div>
					<div className="car-field" id="car-model">
						<label htmlFor="car-model">Modelo</label>
						<div className="make-picker-container">
							<ModelPicker
								make_id={presentingCar?.make_id??""}
								model_id={presentingCar?.model_id??""}
								onModelIdChange={(id)=>{
									setPresentingCar(prev => ({
										...prev,
										model_id: id
									}));
								} }
								disabled= {!isEditable}
							/>
						</div>
					</div>
					<div className="car-field" id="car-chassi">
						<label htmlFor="car-chassi">Nr. Chassi</label>
						<input 
							value={presentingCar?.chassi_nr??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									chassi_nr: e.target.value
								}))
							}
						/>
					</div>
					<div className="car-field" id="car-date">
						<label htmlFor="car-date">Mês / Ano</label>
						<div className="car-field-date">
							<input 
								placeholder="Mês"
								value={presentingCar?.month??""}
								type="number"
								disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									month: e.target.value
								}))
							}
							/>
							<span>/</span>
							<input 
								placeholder="Ano"
								value={presentingCar?.year??""}
								type="number"
								disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									year: e.target.value
								}))
							}
							/>
						</div>
					</div>
					<div className="car-field" id="car-cc">
						<label htmlFor="car-cc">CC</label>
						<input 
							value={presentingCar?.cc??""}
							type="number"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									cc: e.target.value
								}))
							}
						/>
					</div>
					<div className="car-field" id="car-engine-code">
						<label htmlFor="car-engine-code">Cod. Motor</label>
						<input 
							value={presentingCar?.engine_code??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									engine_code: e.target.value
								}))
							}
						/>
					</div>
					<div className="car-field" id="car-color-code">
						<label htmlFor="car-color-code">Cod. Cor</label>
						<input 
							value={presentingCar?.color_code??""}
							type="text"
							disabled= {!isEditable}
							onChange={(e) =>
								setPresentingCar(prev => ({
									...prev,
									color_code: e.target.value
								}))
							}
						/>
					</div>
				</div>
			</div>
		);
	}

	const renderState = () => {
		switch(state){
			case SEARCHING: 
				return renderSearching();
			case SELECTED:
				return renderNotSearching();
			case CREATING:
				return renderNotSearching();
			case EDITING:
				return renderNotSearching();
			default:
				console.error("Erro no estado: ", state);
		}
		
	}

	return (
		<div className="car-picker" id="car-picker">
			{renderState()}
		</div>
	);
}
