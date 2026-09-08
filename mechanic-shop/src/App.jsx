import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import TestPage from "./components/TestPage";
import ServiceShow2 from "./Pages/ServiceShow";
import Home from "./Pages/Home/Home";
import MakesList from "./Pages/Makes/MakesList";
import ProductTypesList from "./Pages/ProductTypes/ProductTypesList";
import ModelsList from "./Pages/Models/ModelsList";
import ClientsList from "./Pages/Clients/ClientsList";
import ProductsList from "./Pages/Products/ProductsList";
import CarsList from "./Pages/Cars/CarsList";
import SchedulesCalendar from "./Pages/Schedules/SchedulesCalendar";
import SchedulesList from "./Pages/Schedules/SchedulesList";
import SchedulesNew from "./Pages/Schedules/SchedulesNew";
import SchedulesShow from "./Pages/Schedules/SchedulesShow";
import ServicesList from "./Pages/Services/ServicesList";
import ServicesCalendar from "./Pages/Services/ServicesCalendar";
import ServicesNew from "./Pages/Services/ServicesNew";
import ProductRequestsDashboard from "./Pages/ProductRequests/ProductRequestsDashboard";
import NotificationsList from "./Pages/Notifications/NotificationsList";

import "./style/variables.css";
import { useEffect } from "react";
import ErrorToasts from "./components/ErrorToasts/ErrorToasts";

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

		<>
		<ErrorToasts/>
		<BrowserRouter>

			<Routes>

				<Route element={<Layout />}>

					<Route path="/" element={<Home/>} />
					<Route path="/service/:id" element={<ServiceShow2/>} />
					<Route path="/makes" element={<MakesList/>} />
					<Route path="/product_types" element={<ProductTypesList/>} />
					<Route path="/models" element={<ModelsList/>} />
					<Route path="/clients" element={<ClientsList/>} />
					<Route path="/products" element={<ProductsList/>} />
					<Route path="/cars" element={<CarsList/>} />
					<Route path="/schedules_calendar" element={<SchedulesCalendar/>} />
					<Route path="/schedules" element={<SchedulesList/>} />
					<Route path="/schedules/new" element={<SchedulesNew/>} />
					<Route path="/schedules/:id" element={<SchedulesShow/>} />
					<Route path="/services" element={<ServicesList/>} />
					<Route path="/services_calendar" element={<ServicesCalendar/>} />
					<Route path="/services/new" element={<ServicesNew/>} />
					<Route path="/products_requested" element={<ProductRequestsDashboard/>} />
					<Route path="/notifications" element={<NotificationsList/>} />
					<Route path="/test" element={<TestPage/>} />

				</Route>

			</Routes>

		</BrowserRouter>
		</>

	);

}

export default App;
