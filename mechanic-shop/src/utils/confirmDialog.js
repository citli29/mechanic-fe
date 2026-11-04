// In-app replacement for window.confirm(). The browser's own dialog freezes
// the whole page (and every tab's polling) until it's answered and looks
// different on every device; this one is rendered by <ConfirmDialog/>
// (mounted once in App.jsx).
//
//   if (!(await confirmDialog("Apagar este cliente?"))) return;
//
// Options: confirmLabel (default "Apagar"), cancelLabel (default "Cancelar"),
// danger (default true: red confirm button).

let listener = null;
let nextId = 1;

export function confirmDialog(message, options = {}) {
	return new Promise((resolve) => {
		if (!listener) {
			// Host not mounted (shouldn't happen) — fall back to the browser.
			resolve(window.confirm(message));
			return;
		}

		listener({
			id: nextId++,
			message,
			confirmLabel: options.confirmLabel ?? "Apagar",
			cancelLabel: options.cancelLabel ?? "Cancelar",
			danger: options.danger ?? true,
			resolve,
		});
	});
}

export function subscribeConfirmDialog(fn) {
	listener = fn;
	return () => {
		if (listener === fn) listener = null;
	};
}
