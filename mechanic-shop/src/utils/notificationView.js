const STORAGE_KEY = "notification_view_type_id";
const LOCK_KEY = "notification_view_lock";
const CHANGE_EVENT = "notification-view-changed";
const UPDATED_EVENT = "notifications-updated";

// The logged-in account can be locked to one notification view (the
// "oficina" login → Oficina, "escritorio" → Escritório). "" = not locked:
// the account picks (admin). Comes from /auth/login and /auth/me.
export function getViewLock() {
	try {
		return localStorage.getItem(LOCK_KEY) || "";
	} catch {
		return "";
	}
}

export function setViewLock(id) {
	const value = id === null || id === undefined ? "" : String(id);
	if (value === getViewLock()) return;

	try {
		if (value) localStorage.setItem(LOCK_KEY, value);
		else localStorage.removeItem(LOCK_KEY);
	} catch {
		// ignore storage errors
	}

	window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getStoredViewTypeId() {
	const lock = getViewLock();
	if (lock) return lock;

	try {
		return localStorage.getItem(STORAGE_KEY) || "";
	} catch {
		return "";
	}
}

export function setStoredViewTypeId(id) {
	if (getViewLock()) return;

	try {
		localStorage.setItem(STORAGE_KEY, String(id));
	} catch {
		// ignore storage errors (private browsing, etc.)
	}

	window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Picks which notification type to show when nothing is stored yet (first
// visit, cleared storage, etc). Kept in one place so every consumer agrees —
// previously the navbar and the Notifications page each guessed differently,
// causing the badge to show a different type's count until the dropdown was
// touched at least once.
export function getDefaultViewTypeId(selectableTypes) {
	return (selectableTypes.find((t) => t.name === "Oficina") ?? selectableTypes[0])?.id ?? "";
}

export function onViewTypeChanged(handler) {
	// The storage event covers other tabs (e.g. a login there changing the lock).
	const onStorage = (e) => {
		if (e.key === STORAGE_KEY || e.key === LOCK_KEY) handler();
	};
	window.addEventListener(CHANGE_EVENT, handler);
	window.addEventListener("storage", onStorage);
	return () => {
		window.removeEventListener(CHANGE_EVENT, handler);
		window.removeEventListener("storage", onStorage);
	};
}

// Call after any action that reads/creates/changes notifications (marking
// one dealt with, finishing a service, ...) so the navbar badge - and any
// other mounted notifications list - can refresh without needing a navigation.
export function notifyNotificationsUpdated() {
	window.dispatchEvent(new Event(UPDATED_EVENT));
}

export function onNotificationsUpdated(handler) {
	window.addEventListener(UPDATED_EVENT, handler);
	return () => window.removeEventListener(UPDATED_EVENT, handler);
}

export { CHANGE_EVENT, UPDATED_EVENT };
