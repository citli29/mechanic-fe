import { useEffect, useState } from "react";
import { subscribeErrorToasts } from "../../utils/errorToast";
import "./ErrorToasts.css";

const AUTO_DISMISS_MS = 8000;

export default function ErrorToasts() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		return subscribeErrorToasts((toast) => {
			setToasts((prev) => [...prev, toast]);

			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== toast.id));
			}, AUTO_DISMISS_MS);
		});
	}, []);

	function dismiss(id) {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}

	if (toasts.length === 0) return null;

	return (
		<div className="error-toasts">
			{toasts.map((toast) => (
				<div key={toast.id} className="error-toast">
					<i className="fa-solid fa-triangle-exclamation" />
					<span>{toast.message}</span>
					<button onClick={() => dismiss(toast.id)}>
						<i className="fa-solid fa-x" />
					</button>
				</div>
			))}
		</div>
	);
}
