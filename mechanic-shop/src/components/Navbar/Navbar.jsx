import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {

	const linkClass = ({ isActive }) =>
		isActive
			? "navbar-link active"
			: "navbar-link";

	return (

		<nav className="navbar">

			<div className="navbar-container">

				<NavLink
					to="/"
					className="navbar-logo"
				>
					<span className="navbar-logo-icon">
						OL
					</span>

					<span className="navbar-logo-text">
						Oficina Lima
					</span>
				</NavLink>

				<div className="navbar-navigation">

					<div className="navbar-main-links">

						<NavLink
							to="/schedules_calendar"
							className={linkClass}
						>
							Calendar
						</NavLink>

						<NavLink
							to="/services"
							className={linkClass}
						>
							Services
						</NavLink>

						<NavLink
							to="/schedules"
							className={linkClass}
						>
							Schedules
						</NavLink>

					</div>

					<details className="navbar-dropdown">

						<summary>
							Management

							<span className="navbar-dropdown-arrow">
								⌄
							</span>
						</summary>

						<div className="navbar-dropdown-menu">

							<NavLink
								to="/clients"
								className={linkClass}
							>
								Clients
							</NavLink>

							<NavLink
								to="/cars"
								className={linkClass}
							>
								Cars
							</NavLink>

							<NavLink
								to="/makes"
								className={linkClass}
							>
								Makes
							</NavLink>

							<NavLink
								to="/models"
								className={linkClass}
							>
								Models
							</NavLink>

							<div className="navbar-dropdown-divider" />

							<NavLink
								to="/products"
								className={linkClass}
							>
								Products
							</NavLink>

							<NavLink
								to="/product_types"
								className={linkClass}
							>
								Product Types
							</NavLink>

						</div>

					</details>

				</div>

			</div>

		</nav>

	);

}
