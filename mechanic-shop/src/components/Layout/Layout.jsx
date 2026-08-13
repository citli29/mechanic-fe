import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";


export default function Layout() {

	return (

		<div className="app-layout">

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

