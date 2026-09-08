const STORAGE_KEY = "notification_view_type_id";
const CHANGE_EVENT = "notification-view-changed";

export function getStoredViewTypeId() {
	try {
		return localStorage.getItem(STORAGE_KEY) || "";
	} catch {
		return "";
	}
}

export function setStoredViewTypeId(id) {
	try {
		localStorage.setItem(STORAGE_KEY, String(id));
	} catch {
		// ignore storage errors (private browsing, etc.)
	}

	window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onViewTypeChanged(handler) {
	window.addEventListener(CHANGE_EVENT, handler);
	return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export { CHANGE_EVENT };
