// Whether the logged-in shop account is an admin (the "admin" login).
// Only decides what the menu shows: the API checks it again on every
// admin-only request, so changing this in the browser doesn't grant access.
// Comes from /auth/login and /auth/me.

const KEY = "oficina_is_admin";
const EVENT = "account-changed";

export function getIsAdmin() {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}

export function setIsAdmin(isAdmin) {
	const value = Boolean(isAdmin);
	if (value === getIsAdmin()) return;

	try {
		if (value) localStorage.setItem(KEY, "1");
		else localStorage.removeItem(KEY);
	} catch {
		// ignore storage errors
	}

	window.dispatchEvent(new Event(EVENT));
}

export function onAccountChanged(handler) {
	const onStorage = (e) => {
		if (e.key === KEY) handler();
	};
	window.addEventListener(EVENT, handler);
	window.addEventListener("storage", onStorage);
	return () => {
		window.removeEventListener(EVENT, handler);
		window.removeEventListener("storage", onStorage);
	};
}
