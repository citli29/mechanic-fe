// Shop login token. Kept in localStorage so the device stays logged in
// across reloads, browser restarts and reboots, until someone presses
// "Terminar sessão" or the password is changed on the server.

const KEY = "oficina_auth_token";
let listeners = [];

export function getAuthToken() {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function setAuthToken(token) {
	try {
		localStorage.setItem(KEY, token);
	} catch {
		// storage blocked: stays logged in only until the tab closes
	}
	notify(token);
}

export function clearAuthToken() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// ignore
	}
	notify(null);
}

export function onAuthChange(fn) {
	listeners.push(fn);

	// Logging in/out in one tab updates the other open tabs too.
	const onStorage = (e) => {
		if (e.key === KEY) fn(e.newValue);
	};
	window.addEventListener("storage", onStorage);

	return () => {
		listeners = listeners.filter((l) => l !== fn);
		window.removeEventListener("storage", onStorage);
	};
}

function notify(token) {
	listeners.forEach((fn) => fn(token));
}
