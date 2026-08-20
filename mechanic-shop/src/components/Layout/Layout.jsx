import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";


export default function Layout() {

	return (

		<div style={{ minHeight: "100vh", display: "flex",alignItems:"center", flexDirection: "column"}} className="app-layout">

			<Navbar />

			<main style={{ flex: 1, width:"100%"}} className="app-main">
				<div className="app-content">
					<Outlet />
				</div>
			</main>

			<Footer />

		</div>

	);

}

