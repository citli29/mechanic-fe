import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {

	return (

		<nav className="navbar">

			<div className="navbar-logo">
				<NavLink to="/">
					Oficina Lima
				</NavLink>
			</div>

			<div className="navbar-links">

				<NavLink to="/schedules_calendar">
					Calendar
				</NavLink>

				<NavLink to="/schedules">
					Schedules
				</NavLink>

				<NavLink to="/clients">
					Clients
				</NavLink>

				<NavLink to="/cars">
					Cars
				</NavLink>

				<NavLink to="/makes">
					Makes
				</NavLink>

				<NavLink to="/models">
					Models
				</NavLink>

				<NavLink to="/products">
					Products
				</NavLink>

				<NavLink to="/product_types">
					Product Types
				</NavLink>

			</div>

		</nav>

	);

}
