let listeners = [];
let idCounter = 0;

export function pushToast(message, type = "error") {
	const toast = { id: ++idCounter, type, message: message || "Ocorreu um erro." };
	listeners.forEach((fn) => fn(toast));
	return toast;
}

export function pushErrorToast(message) {
	return pushToast(message, "error");
}

export function pushSuccessToast(message) {
	return pushToast(message, "success");
}

export function subscribeErrorToasts(fn) {
	listeners.push(fn);
	return () => {
		listeners = listeners.filter((l) => l !== fn);
	};
}

function extractMessage(args) {
	let fromResponse, fromString, fromErrorMessage;

	for (const arg of args) {
		if (arg == null) continue;

		if (!fromResponse && typeof arg?.response?.data?.error === "string") {
			fromResponse = arg.response.data.error;
		}

		if (!fromString && typeof arg === "string" && arg.trim()) {
			fromString = arg;
		}

		if (!fromErrorMessage && arg instanceof Error && arg.message) {
			fromErrorMessage = arg.message;
		}
	}

	return fromResponse || fromString || fromErrorMessage || "Ocorreu um erro.";
}

// Every console.error(...) in the app also surfaces on-screen as a toast.
// This is a stopgap: once backend error messages are made legible, this
// extraction can be simplified to just read the backend message directly.
export function installConsoleErrorHook() {
	const original = console.error.bind(console);

	console.error = (...args) => {
		original(...args);

		try {
			pushErrorToast(extractMessage(args));
		} catch {
			// never let the hook itself break the app
		}
	};
}
