import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";


export default function Layout() {

	return (

		<div style={{ minHeight: "100vh", position:"relative", }} className="app-layout">

			<Navbar />

			<main className="app-main">
				<div className="app-content">
					<Outlet />
				</div>
			</main>

			<Footer />

		</div>

	);

}

