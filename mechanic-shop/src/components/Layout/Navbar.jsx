import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { getDefaultViewTypeId, getStoredViewTypeId, onNotificationsUpdated, onViewTypeChanged } from "../../utils/notificationView";
import { claimNotificationDing, isNotificationSoundMuted, playNotificationSound, setNotificationSoundMuted, unlockNotificationSound } from "../../utils/notificationSound";
import "./Navbar.css";

// Each view cares about a different stage of the same Encomendas pipeline:
// Oficina wants to know what's ready to use (delivered), Escritório wants to
// know what still needs to be ordered. Filters match ProductRequestsDashboard's
// own tabs exactly, so this count is always consistent with that page.
const RELATED_PRODUCT_COUNTS = {
	"Oficina": { filters: { is_delivered: "true" } },
	"Escritório": { filters: { is_ordered: "false" } },
};

export default function Navbar() {

	const dropdownRef = useRef(null);
	const location = useLocation();

	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationTypes, setNotificationTypes] = useState([]);
	const [soundMuted, setSoundMuted] = useState(() => isNotificationSoundMuted());
	const [viewTypeName, setViewTypeName] = useState(null);
	const [productCount, setProductCount] = useState(null);

	// Highest notification id already dinged for, per view-type scope (e.g.
	// "3,5" for Geral+Oficina) — null until that scope's first real fetch, so
	// we never "ding" just for loading the page with pre-existing unread
	// notifications. Id-based rather than count-based: a raw count is
	// ambiguous (if one notification gets marked read the same moment a new
	// one arrives, the count can stay flat and the new one silently never
	// dings) — an id higher than anything seen before is unambiguous
	// regardless of what else happened concurrently. Scoped per view so
	// switching between Escritório/Oficina never causes a false ding (the
	// "most recent" notification id jumps when the filter changes) and never
	// suppresses a real one for the other view.
	const prevTopIdByScopeRef = useRef({});

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

	// Tracks which view (Oficina/Escritório) is currently selected — same
	// source of truth the notification poll below uses — so the Encomendas
	// badge always matches. Recomputed whenever the stored view changes
	// (e.g. switched via the dropdown on the Notifications page), not just
	// when notificationTypes first loads.
	useEffect(() => {
		function updateViewTypeName() {
			const selectableTypes = notificationTypes.filter((t) => t.name !== "Geral");

			if (selectableTypes.length === 0) {
				setViewTypeName(null);
				return;
			}

			const storedId = getStoredViewTypeId();
			const viewTypeId = selectableTypes.some((t) => String(t.id) === String(storedId))
				? storedId
				: getDefaultViewTypeId(selectableTypes);

			setViewTypeName(selectableTypes.find((t) => String(t.id) === String(viewTypeId))?.name ?? null);
		}

		updateViewTypeName();

		return onViewTypeChanged(updateViewTypeName);
	}, [notificationTypes]);

	useEffect(() => {
		const relatedProductInfo = viewTypeName ? RELATED_PRODUCT_COUNTS[viewTypeName] : null;

		if (!relatedProductInfo) {
			setProductCount(null);
			return;
		}

		let isCurrent = true;

		function loadProductCount() {
			api.get("/services_products_requested", { params: { ...relatedProductInfo.filters, p: 1, u: 1 } })
				.then((res) => {
					if (isCurrent) setProductCount(res.data.pagination?.total ?? 0);
				})
				.catch(() => {});
		}

		loadProductCount();
		const pollId = setInterval(loadProductCount, 5000);

		return () => {
			isCurrent = false;
			clearInterval(pollId);
		};
	}, [viewTypeName]);

	useEffect(() => {
		if (notificationTypes.length === 0) return;

		let isCurrent = true;

		// Three independent triggers can call loadUnreadCount() close together
		// (the 5s poll, a same-tab notification-updated event, a view-type
		// change) — without this guard, two overlapping in-flight requests
		// would both read the same stale prevUnreadCountRef before either
		// writes it, so a single new notification could "ding" twice.
		let isFetching = false;
		let stuckFetchTimeoutId = null;

		function loadUnreadCount() {
			if (isFetching) return;
			isFetching = true;

			// Safety net: if a request never settles for some reason axios's own
			// timeout doesn't catch (a suspended background tab, etc.), don't
			// let that wedge this lock — and with it, all future polling —
			// forever. Force it open again after a bounded wait so the next
			// poll can retry cleanly.
			clearTimeout(stuckFetchTimeoutId);
			stuckFetchTimeoutId = setTimeout(() => {
				isFetching = false;
			}, 15000);

			const generalId = notificationTypes.find((t) => t.name === "Geral")?.id;
			const selectableTypes = notificationTypes.filter((t) => t.name !== "Geral");
			const storedId = getStoredViewTypeId();

			const viewTypeId = selectableTypes.some((t) => String(t.id) === String(storedId))
				? storedId
				: getDefaultViewTypeId(selectableTypes);

			const typeIds = [generalId, viewTypeId].filter(Boolean);
			const scopeKey = typeIds.join(",");

			const params = { is_checked: "false", p: 1, u: 1 };
			if (typeIds.length) params["n-type-in"] = typeIds.join(",");

			api.get("/notifications", { params })
				.then((res) => {
					if (!isCurrent) return;

					const newCount = res.data.pagination?.total ?? 0;
					// Sorted newest-first server-side, so this is the most recent
					// unread notification's id, if there is one.
					const latestId = res.data.notification_list?.[0]?.id ?? null;

					const prevTopId = prevTopIdByScopeRef.current[scopeKey] ?? null;

					if (prevTopId !== null && latestId !== null && latestId > prevTopId) {
						// Still per-tab gated above (never dings on this tab's own
						// first load for this scope) — the shared claim only dedups
						// the same rise being noticed by more than one open tab.
						if (claimNotificationDing(scopeKey, latestId)) {
							playNotificationSound();
						}
					}

					if (latestId !== null) {
						prevTopIdByScopeRef.current[scopeKey] = latestId;
					}

					setUnreadCount(newCount);
				})
				.catch(() => {})
				.finally(() => {
					clearTimeout(stuckFetchTimeoutId);
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
			clearTimeout(stuckFetchTimeoutId);
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
							{productCount > 0 && (
								<span className="navbar-badge">{productCount > 99 ? "99+" : productCount}</span>
							)}
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
