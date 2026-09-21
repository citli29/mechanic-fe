import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { getDefaultViewTypeId, getStoredViewTypeId, onNotificationsUpdated, onViewTypeChanged } from "../../utils/notificationView";
import { isNotificationSoundMuted, playNotificationSound, setNotificationSoundMuted, unlockNotificationSound } from "../../utils/notificationSound";
import "./Navbar.css";

export default function Navbar() {

	const dropdownRef = useRef(null);
	const location = useLocation();

	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationTypes, setNotificationTypes] = useState([]);
	const [soundMuted, setSoundMuted] = useState(() => isNotificationSoundMuted());

	// null until the first real fetch resolves, so we never "ding" just for
	// loading the page with pre-existing unread notifications.
	const prevUnreadCountRef = useRef(null);

	// Browsers require a real user gesture before an AudioContext can play
	// audible sound — a background notification poll doesn't count. This
	// unlocks it on the very first interaction with the page (any click,
	// key press or tap), so it's already running well before a real
	// notification needs to ding.
	useEffect(() => {
		function unlock() {
			unlockNotificationSound();
			document.removeEventListener("click", unlock);
			document.removeEventListener("keydown", unlock);
			document.removeEventListener("touchstart", unlock);
		}

		document.addEventListener("click", unlock);
		document.addEventListener("keydown", unlock);
		document.addEventListener("touchstart", unlock);

		return () => {
			document.removeEventListener("click", unlock);
			document.removeEventListener("keydown", unlock);
			document.removeEventListener("touchstart", unlock);
		};
	}, []);

	useEffect(() => {
		api.get("/notification_types")
			.then((res) => setNotificationTypes(res.data.notification_type_list || []))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (notificationTypes.length === 0) return;

		let isCurrent = true;

		// Three independent triggers can call loadUnreadCount() close together
		// (the 5s poll, a same-tab notification-updated event, a view-type
		// change) — without this guard, two overlapping in-flight requests
		// would both read the same stale prevUnreadCountRef before either
		// writes it, so a single new notification could "ding" twice.
		let isFetching = false;

		function loadUnreadCount() {
			if (isFetching) return;
			isFetching = true;

			const generalId = notificationTypes.find((t) => t.name === "Geral")?.id;
			const selectableTypes = notificationTypes.filter((t) => t.name !== "Geral");
			const storedId = getStoredViewTypeId();

			const viewTypeId = selectableTypes.some((t) => String(t.id) === String(storedId))
				? storedId
				: getDefaultViewTypeId(selectableTypes);

			const typeIds = [generalId, viewTypeId].filter(Boolean);

			const params = { is_checked: "false", p: 1, u: 1 };
			if (typeIds.length) params["n-type-in"] = typeIds.join(",");

			api.get("/notifications", { params })
				.then((res) => {
					if (!isCurrent) return;

					const newCount = res.data.pagination?.total ?? 0;

					if (prevUnreadCountRef.current !== null && newCount > prevUnreadCountRef.current) {
						playNotificationSound();
					}

					prevUnreadCountRef.current = newCount;
					setUnreadCount(newCount);
				})
				.catch(() => {})
				.finally(() => {
					isFetching = false;
				});
		}

		loadUnreadCount();

		// Same-tab actions refresh instantly via the events below; this poll
		// is what picks up changes made by other users/devices/tabs.
		const pollId = setInterval(loadUnreadCount, 5000);

		const unsubscribeView = onViewTypeChanged(loadUnreadCount);
		const unsubscribeUpdated = onNotificationsUpdated(loadUnreadCount);

		return () => {
			isCurrent = false;
			clearInterval(pollId);
			unsubscribeView();
			unsubscribeUpdated();
		};
	}, [location.pathname, notificationTypes]);

	useEffect(() => {
		document.title = unreadCount > 0 ? `(${unreadCount}) Oficina Lima` : "Oficina Lima";

		return () => {
			document.title = "Oficina Lima";
		};
	}, [unreadCount]);

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

				<div className="navbar-top-row">

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

					<div className="navbar-top-row-icons">

						<button
							type="button"
							className="navbar-sound-toggle"
							onClick={() => {
								const next = !soundMuted;
								setSoundMuted(next);
								setNotificationSoundMuted(next);
							}}
							aria-label={soundMuted ? "Ativar som de notificações" : "Silenciar som de notificações"}
							title={soundMuted ? "Ativar som de notificações" : "Silenciar som de notificações"}
						>
							<i className={`fa-solid ${soundMuted ? "fa-volume-xmark" : "fa-volume-high"}`} />
						</button>

						<NavLink
							to="/notifications"
							className={({ isActive }) => isActive ? "navbar-notif-mobile active" : "navbar-notif-mobile"}
							onClick={closeDropdown}
							aria-label="Notificações"
						>
							<i className="fa-solid fa-bell" />
							{unreadCount > 0 && (
								<span className="navbar-notif-mobile-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
							)}
						</NavLink>

					</div>

				</div>

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
							className={(navData) => `${linkClass(navData)} navbar-link-notif-desktop`}
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
								to="/services_manage"
								className={linkClass}
								onClick={closeDropdown}
							>
								Gestão de Serviços
							</NavLink>

							<div className="navbar-dropdown-divider" />

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

							<div className="navbar-dropdown-divider" />

							<NavLink
								to="/user_times_stats"
								className={linkClass}
								onClick={closeDropdown}
							>
								Tempos dos Utilizadores
							</NavLink>

						</div>

					</details>

				</div>

			</div>

		</nav>

	);

}
