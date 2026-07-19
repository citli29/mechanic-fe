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
							Calendário
						</NavLink>

						<NavLink
							to="/services"
							className={linkClass}
						>
							Serviços
						</NavLink>

						<NavLink
							to="/schedules"
							className={linkClass}
						>
							Marcações
						</NavLink>

					</div>

					<details className="navbar-dropdown">

						<summary>
							Gestão

							<span className="navbar-dropdown-arrow">
								⌄
							</span>
						</summary>

						<div className="navbar-dropdown-menu">

							<NavLink
								to="/clients"
								className={linkClass}
							>
								Clientes
							</NavLink>

							<NavLink
								to="/cars"
								className={linkClass}
							>
								Viaturas
							</NavLink>

							<NavLink
								to="/makes"
								className={linkClass}
							>
								Marcas
							</NavLink>

							<NavLink
								to="/models"
								className={linkClass}
							>
								Modelos
							</NavLink>

							<div className="navbar-dropdown-divider" />

							<NavLink
								to="/products"
								className={linkClass}
							>
								Produtos
							</NavLink>

							<NavLink
								to="/product_types"
								className={linkClass}
							>
								Tipos de Produtos
							</NavLink>

						</div>

					</details>

				</div>

			</div>

		</nav>

	);

}
