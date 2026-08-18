import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import TestPage from "./components/TestPage";
import ServiceShow2 from "./Pages/ServiceShow";

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

					<Route path="/test" element={<TestPage/>} />

				</Route>

			</Routes>

		</BrowserRouter>

	);

}

export default App;
