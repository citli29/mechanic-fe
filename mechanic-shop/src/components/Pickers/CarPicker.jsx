import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
import "./style/CPicker.css";

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
	const [carPlate, setCarPlate] = useState(car?.plate??"");
	const [state, setState] = useState(-1);

	useEffect(() => {
		onCarIdChange(car?.id??"");
		setCarPlate(car?.plate??"");
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
		async function f1(){
			const m = await getCar(car_id); 
			setCar(m);
		}
		async function f2(){
			const m = await getCars(""); 
			setCars(m);
		}

		if(car_id) { f1(); setState(SELECTED);
		}else{ f2(); setState(SEARCHING); }
	} ,[]);

	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchCar);	
		},300);
		return () => clearTimeout(timer);
	},[searchCar]);
	
	useEffect(()=>{
		let isCurrent = true;

		async function f(){
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
		setState(CREATING);
		setCarPlate(s);
	}

	const handleClickSelect = (c) => {
		setIsSearchSelected(false);
		setCar(c);
		setState(SELECTED);
	}

	const handleClickSelectCancel = async (e) => {
		e.preventDefault();
		setCar(null);
		setCarPlate("");
		setCars(await getCars())
		setIsSearchSelected(false);
		setState(SEARCHING);
	}

	const handleClickStartEdit = (e) => {
		e.preventDefault();
		setState(EDITING);
	}

	const handleClickActionEdit = async () =>{
		const c = await putCar([], car);
		if(c){
			setState(SELECTED);
			setCar(c);
			setCarPlate(c.plate);
		}
	}

	const handleClickStartEditCancel = () =>{
		setState(SELECTED);
		setCarPlate(car.plate);
	}

	const handleClickStartAddCancel = (e) =>{ handleClickSelectCancel(e); }

	const handleClickActionAdd = async (e) =>{
		e.preventDefault();
		const c = await postCar([]);
		if(c){
			setState(SELECTED);
			setCar(c);
			setCarPlate(c.plate);
		}
	}

	const renderSelectedButtons = () => {
		switch(state){
			case CREATING:
				return (
					<div className="card-buttons">
					</div>
				);
			case SELECTED:
				return (
					<div className="card-buttons">
					</div>

				);

			case EDITING:
				return(
					<div className="card-buttons">
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

	const renderNotSearching = () => {
		return(
			<div className="c-selected"> 
				<div className="car-input">
					<span>{car.plate}</span>
					<span>{car.make_name}</span>
					<span>{car.model_name}</span>
				</div>
				{renderSelectedButtons()}
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
