import { useEffect, useRef } from "react";

// Calls `callback` every `ms` while the browser tab is visible, and once
// right away when the tab becomes visible again (so coming back to it never
// shows something stale until the next tick). Always calls the latest
// `callback`, so it can read current state. `enabled` false pauses it.
export function useVisiblePoll(callback, ms, enabled = true) {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		if (!enabled) return;

		const tick = () => {
			if (!document.hidden) callbackRef.current();
		};
		const onVisible = () => {
			if (!document.hidden) callbackRef.current();
		};

		const id = setInterval(tick, ms);
		document.addEventListener("visibilitychange", onVisible);

		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [ms, enabled]);
}
