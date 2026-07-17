import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import MakesList from "./pages/Makes/MakesList";
import ModelsList from "./pages/Models/ModelsList";
import CarsList from "./pages/Cars/CarsList";
import ProductTypesList from "./pages/ProductTypes/ProductTypesList";
import ProductsList from "./pages/Products/ProductsList";
import SchedulesCalendar from "./pages/Schedules/SchedulesCalendar";
import SchedulesList from "./pages/Schedules/SchedulesList";
import SchedulesShow from "./pages/Schedules/SchedulesShow";
import ClientsList from "./pages/Clients/ClientsList";
import ServicesList from "./pages/Services/ServicesList";
import Home from "./pages/Home/Home";

import "./style/crud.css";
import SchedulesNew from "./pages/Schedules/SchedulesNew";

function App() {

	return (

		<BrowserRouter>

			<Routes>

				<Route element={<Layout />}>

					<Route path="/" element={<Home />} />
					<Route path="/makes" element={<MakesList />} />
					<Route path="/models" element={<ModelsList />} />
					<Route path="/cars" element={<CarsList />} />
					<Route path="/product_types" element={<ProductTypesList />} />
					<Route path="/products" element={<ProductsList />} />
					<Route path="/clients" element={<ClientsList />} />
					<Route path="/schedules_calendar" element={<SchedulesCalendar />} />
					<Route path="/schedules" element={<SchedulesList />} />
					<Route path="/schedules/:id" element={<SchedulesShow />} />
					<Route path="/services" element={<ServicesList />} />
					<Route path="/schedules/new" element={<SchedulesNew />} />

				</Route>

			</Routes>

		</BrowserRouter>

	);

}

export default App;
