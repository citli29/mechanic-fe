import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import TestPage from "./components/TestPage";
import ServiceShow2 from "./Pages/ServiceShow";
import MakesList from "./Pages/Makes/MakesList";
import ProductTypesList from "./Pages/ProductTypes/ProductTypesList";

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
					<Route path="/test" element={<TestPage/>} />

				</Route>

			</Routes>

		</BrowserRouter>

	);

}

export default App;
