import { useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";


export default function Layout() {

	const { pathname, hash } = useLocation();
	const navigationType = useNavigationType();

	// A new page opens at the top — the browser keeps the previous page's
	// scroll otherwise (a new service opened halfway down). Back/Forward
	// keep the browser's own restore, a #section link scrolls itself, and
	// only the path counts so changing a list's filters doesn't jump.
	useEffect(() => {
		if (navigationType === "POP" || hash) return;
		window.scrollTo(0, 0);
	}, [pathname]);

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
