// Keep a page's search / filters / page number in the address bar
// (?plate=13&p=2), so going back with the browser's ← (or refreshing, or
// sharing the link) shows the page exactly as it was left.
//
//   const [filters, setFilters] = useUrlState({ name: "", make_id: "" });
//   const [page, setPage]       = useUrlParam("p", 1);
//   useFilterChange(filters, () => { if (page !== 1) setPage(1); else load(); });
//
// Writes use history.replaceState (no new history entry per keystroke, and
// no re-render through the router). Values equal to their default are
// left out of the URL, so a page with nothing filtered keeps a clean URL.
// The value's type comes from its default: number, boolean ("1"/"0") or
// string (null default = string or null).
import { useEffect, useRef, useState } from "react";

function parse(raw, def) {
	if (raw === null) return def;
	if (typeof def === "number") {
		const n = Number(raw);
		return Number.isFinite(n) ? n : def;
	}
	if (typeof def === "boolean") return raw === "1" || raw === "true";
	return raw;
}

function serialize(value) {
	if (typeof value === "boolean") return value ? "1" : "0";
	return String(value);
}

function isDefault(value, def) {
	if (value === def) return true;
	if ((value === "" || value === null || value === undefined) && (def === "" || def === null)) return true;
	return false;
}

function readUrl(defaults) {
	const params = new URLSearchParams(window.location.search);
	const out = {};
	Object.keys(defaults).forEach((key) => { out[key] = parse(params.get(key), defaults[key]); });
	return out;
}

// Merge just these keys into the current URL (other params are kept).
function writeUrl(values, defaults) {
	const params = new URLSearchParams(window.location.search);

	Object.keys(defaults).forEach((key) => {
		if (isDefault(values[key], defaults[key])) params.delete(key);
		else params.set(key, serialize(values[key]));
	});

	const search = params.toString();
	const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;

	if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
		// Keep history.state: React Router stores its own index there.
		window.history.replaceState(window.history.state, "", url);
	}
}


// An object of values (e.g. a page's filters), mirrored in the URL.
export function useUrlState(defaults) {
	const defaultsRef = useRef(defaults);
	const [state, setState] = useState(() => readUrl(defaults));

	useEffect(() => { writeUrl(state, defaultsRef.current); }, [state]);

	return [state, setState];
}


// A single value (page number, sort column, calendar month...).
export function useUrlParam(key, def) {
	const [state, setState] = useUrlState({ [key]: def });

	const value = state[key];
	const setValue = (next) => setState((prev) => ({
		[key]: typeof next === "function" ? next(prev[key]) : next,
	}));

	return [value, setValue];
}


// Runs `callback` (debounced) when `value` really changes — compared by
// content, not by render, so it doesn't fire on the first load (when the
// filters come from the URL, that would jump back to page 1) nor on
// React StrictMode's double mount.
export function useFilterChange(value, callback, delay = 400) {
	const json = JSON.stringify(value);
	const lastRef = useRef(json);
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		if (json === lastRef.current) return;

		const timer = setTimeout(() => {
			lastRef.current = json;
			callbackRef.current();
		}, delay);

		return () => clearTimeout(timer);
	}, [json, delay]);
}
