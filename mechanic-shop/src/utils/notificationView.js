const STORAGE_KEY = "notification_view_type_id";
const CHANGE_EVENT = "notification-view-changed";
const UPDATED_EVENT = "notifications-updated";

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
