import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import api from "../../api/axios";
import "./Navbar.css";

export default function Navbar() {

	const dropdownRef = useRef(null);
	const location = useLocation();

	const [unreadCount, setUnreadCount] = useState(0);

	useEffect(() => {
		let isCurrent = true;

		api.get("/notifications", { params: { is_checked: "false", p: 1, u: 1 } })
			.then((res) => {
				if (isCurrent) setUnreadCount(res.data.pagination?.total ?? 0);
			})
			.catch(() => {});

		return () => { isCurrent = false; };
	}, [location.pathname]);

	const linkClass = ({ isActive }) =>
		isActive
			? "navbar-link active"
			: "navbar-link";

	function isSectionActive(prefix) {
		return (
			location.pathname === prefix ||
			location.pathname.startsWith(`${prefix}_`) ||
			location.pathname.startsWith(`${prefix}/`)
		);
	}

	function sectionLinkClass(prefix) {
		return isSectionActive(prefix)
			? "navbar-link active"
			: "navbar-link";
	}

	useEffect(() => {

		function handleOutsideClick(event) {

			const dropdown = dropdownRef.current;

			if (
				dropdown &&
				dropdown.open &&
				!dropdown.contains(event.target)
			) {
				dropdown.removeAttribute("open");
			}

		}

		document.addEventListener(
			"mousedown",
			handleOutsideClick
		);

		return () => {

			document.removeEventListener(
				"mousedown",
				handleOutsideClick
			);

		};

	}, []);

	function closeDropdown() {

		dropdownRef.current?.removeAttribute("open");

	}

	return (

		<nav className="navbar">

			<div className="navbar-container">

				<NavLink
					to="/"
					className="navbar-logo"
					onClick={closeDropdown}
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
							className={() => sectionLinkClass("/schedules")}
							onClick={closeDropdown}
						>
							Marcações
						</NavLink>

						<NavLink
							to="/services"
							className={() => sectionLinkClass("/services")}
							onClick={closeDropdown}
						>
							Serviços
						</NavLink>

						<NavLink
							to="/products_requested"
							className={linkClass}
							onClick={closeDropdown}
						>
							Encomendas
						</NavLink>

						<NavLink
							to="/notifications"
							className={linkClass}
							onClick={closeDropdown}
						>
							Notificações
							{unreadCount > 0 && (
								<span className="navbar-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
							)}
						</NavLink>

					</div>

					<details
						ref={dropdownRef}
						className="navbar-dropdown"
					>

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
								onClick={closeDropdown}
							>
								Clientes
							</NavLink>

							<NavLink
								to="/cars"
								className={linkClass}
								onClick={closeDropdown}
							>
								Viaturas
							</NavLink>

							<NavLink
								to="/makes"
								className={linkClass}
								onClick={closeDropdown}
							>
								Marcas
							</NavLink>

							<NavLink
								to="/models"
								className={linkClass}
								onClick={closeDropdown}
							>
								Modelos
							</NavLink>

							<div className="navbar-dropdown-divider" />

							<NavLink
								to="/products"
								className={linkClass}
								onClick={closeDropdown}
							>
								Produtos
							</NavLink>

							<NavLink
								to="/product_types"
								className={linkClass}
								onClick={closeDropdown}
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
