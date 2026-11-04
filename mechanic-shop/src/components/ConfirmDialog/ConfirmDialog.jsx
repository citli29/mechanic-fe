import { useEffect, useRef, useState } from "react";
import { subscribeConfirmDialog } from "../../utils/confirmDialog";
import "./ConfirmDialog.css";

// Renders the dialogs asked for with confirmDialog(). One at a time; a second
// request while one is open waits in the queue.
export default function ConfirmDialog() {
	const [queue, setQueue] = useState([]);
	const cancelRef = useRef(null);

	const current = queue[0];

	useEffect(() => subscribeConfirmDialog((request) => {
		setQueue((prev) => [...prev, request]);
	}), []);

	function answer(value) {
		if (!current) return;
		current.resolve(value);
		setQueue((prev) => prev.slice(1));
	}

	useEffect(() => {
		if (!current) return;

		cancelRef.current?.focus();

		function onKey(e) {
			if (e.key === "Escape") {
				e.preventDefault();
				answer(false);
			}
		}

		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [current]);

	if (!current) return null;

	return (
		<div className="confirm-dialog-backdrop" onClick={() => answer(false)}>
			<div
				className="confirm-dialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={`confirm-dialog-msg-${current.id}`}
				onClick={(e) => e.stopPropagation()}
			>
				<p id={`confirm-dialog-msg-${current.id}`}>{current.message}</p>

				<div className="confirm-dialog-actions">
					{/* Focus starts on Cancelar, so a stray Enter never deletes. */}
					<button type="button" ref={cancelRef} onClick={() => answer(false)}>
						{current.cancelLabel}
					</button>
					<button
						type="button"
						className={current.danger ? "cancel" : "confirm"}
						onClick={() => answer(true)}
					>
						{current.confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
