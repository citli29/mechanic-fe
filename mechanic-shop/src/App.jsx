import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import TestPage from "./components/TestPage";
import ServiceShow2 from "./Pages/ServiceShow";
import MakesList from "./Pages/Makes/MakesList";
import ProductTypesList from "./Pages/ProductTypes/ProductTypesList";
import ModelsList from "./Pages/Models/ModelsList";
import ClientsList from "./Pages/Clients/ClientsList";
import ProductsList from "./Pages/Products/ProductsList";
import CarsList from "./Pages/Cars/CarsList";
import SchedulesCalendar from "./Pages/Schedules/SchedulesCalendar";
import SchedulesNew from "./pages/Schedules/SchedulesNew";
import SchedulesShow from "./pages/Schedules/SchedulesShow";
import ServicesList from "./Pages/Services/ServicesList";
import ServicesNew from "./pages/Services/ServicesNew";

import "./style/variables.css";
import { useEffect } from "react";

function App() {

	useEffect(()=>{
		document.addEventListener("wheel", function(event){ 
			if(document.activeElement.type === "number"){
				document.activeElement.blur();    
			}
		});
	},[]);
	//<Route path="/services/:id" element={<ServicesShow />} />
	return (

		<BrowserRouter>

			<Routes>

				<Route element={<Layout />}>

					<Route path="/s/:id" element={<ServiceShow2/>} />
					<Route path="/makes" element={<MakesList/>} />
					<Route path="/product_types" element={<ProductTypesList/>} />
					<Route path="/models" element={<ModelsList/>} />
					<Route path="/clients" element={<ClientsList/>} />
					<Route path="/products" element={<ProductsList/>} />
					<Route path="/cars" element={<CarsList/>} />
					<Route path="/schedules_calendar" element={<SchedulesCalendar/>} />
					<Route path="/schedules/new" element={<SchedulesNew/>} />
					<Route path="/schedules/:id" element={<SchedulesShow/>} />
					<Route path="/services" element={<ServicesList/>} />
					<Route path="/services/new" element={<ServicesNew/>} />
					<Route path="/test" element={<TestPage/>} />

				</Route>

			</Routes>

		</BrowserRouter>

	);

}

export default App;
