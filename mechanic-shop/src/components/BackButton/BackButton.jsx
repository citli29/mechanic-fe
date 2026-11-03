// "← Voltar" for detail pages (viatura, marcação, produto, utilizador).
// Does the same as the browser's ← when the user came from inside the app
// (so the list comes back with its filters / page, see utils/useUrlState);
// opened straight from a link / new tab, there's nothing to go back to,
// so it goes to `fallback` instead. Still a real link: Ctrl/middle-click
// opens the fallback in a new tab.
import { Link, useNavigate } from "react-router-dom";

import "./BackButton.css";

export default function BackButton({ fallback, label = "Voltar" }) {
	const navigate = useNavigate();

	function handleClick(e) {
		if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

		// React Router keeps its own history index here: > 0 means there's
		// an earlier page of this app in this tab.
		if ((window.history.state?.idx ?? 0) > 0) {
			e.preventDefault();
			navigate(-1);
		}
	}

	return (
		<Link className="options back-button" to={fallback} onClick={handleClick}>
			<i className="fa-solid fa-arrow-left" /> {label}
		</Link>
	);
}
