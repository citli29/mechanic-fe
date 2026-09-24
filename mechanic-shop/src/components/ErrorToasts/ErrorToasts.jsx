import { useEffect, useState } from "react";
import { subscribeErrorToasts } from "../../utils/errorToast";
import "./ErrorToasts.css";

const AUTO_DISMISS_MS = {
	error: 8000,
	success: 4000,
};

const ICON_BY_TYPE = {
	error: "fa-triangle-exclamation",
	success: "fa-circle-check",
};

export default function ErrorToasts() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		return subscribeErrorToasts((toast) => {
			setToasts((prev) => [...prev, toast]);

			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== toast.id));
			}, AUTO_DISMISS_MS[toast.type] || AUTO_DISMISS_MS.error);
		});
	}, []);

	function dismiss(id) {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}

	if (toasts.length === 0) return null;

	return (
		<div className="error-toasts">
			{toasts.map((toast) => (
				<div key={toast.id} className={`error-toast ${toast.type}`}>
					<i className={`fa-solid ${ICON_BY_TYPE[toast.type] || ICON_BY_TYPE.error}`} />
					<span>{toast.message}</span>
					<button onClick={() => dismiss(toast.id)}>
						<i className="fa-solid fa-x" />
					</button>
				</div>
			))}
		</div>
	);
}
