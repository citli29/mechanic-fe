import { useRef } from "react";
import "./DateInput.css";

// Drop-in replacement for <input type="date"> that always shows dd/mm/yyyy.
//
// A native date input displays in the browser's language (mm/dd/yyyy on an
// English-US Chrome), whatever the page says. This shows the date as text in
// a normal input (so every existing `input` style still applies) and opens
// the browser's own calendar on click. The value going in and out stays
// "YYYY-MM-DD", and onChange gets the native input's change event, so
// callers keep using e.target.value exactly as before.
export default function DateInput({
	value,
	onChange,
	disabled,
	name,
	placeholder = "dd/mm/aaaa",
	...rest
}) {
	const nativeRef = useRef(null);

	function openPicker() {
		if (disabled) return;
		const el = nativeRef.current;
		if (!el) return;
		try {
			el.showPicker();
		} catch {
			// Old browser without showPicker(): focusing is the best we can do.
			el.focus();
		}
	}

	function onKeyDown(e) {
		if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
			e.preventDefault();
			openPicker();
		}
		rest.onKeyDown?.(e);
	}

	return (
		<>
			<input
				{...rest}
				type="text"
				readOnly
				inputMode="none"
				value={formatDisplay(value)}
				placeholder={placeholder}
				disabled={disabled}
				onClick={(e) => { openPicker(); rest.onClick?.(e); }}
				onKeyDown={onKeyDown}
			/>
			<input
				ref={nativeRef}
				type="date"
				className="date-input-native"
				name={name}
				value={toIsoDate(value)}
				onChange={onChange}
				disabled={disabled}
				tabIndex={-1}
				aria-hidden="true"
			/>
		</>
	);
}

// "2026-11-04" (or "2026-11-04 10:00:00") → "04/11/2026".
function formatDisplay(value) {
	const iso = toIsoDate(value);
	if (!iso) return "";
	const [year, month, day] = iso.split("-");
	return `${day}/${month}/${year}`;
}

function toIsoDate(value) {
	if (!value) return "";
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
	return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}
