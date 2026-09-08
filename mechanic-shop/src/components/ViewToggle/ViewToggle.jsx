import { useLocation, useNavigate } from "react-router-dom";
import "./ViewToggle.css";

export default function ViewToggle({ listPath, calendarPath }) {

	const navigate = useNavigate();
	const location = useLocation();

	const isCalendar = location.pathname === calendarPath;

	return (
		<div className="view-toggle">
			<button
				className={!isCalendar ? "active" : ""}
				onClick={() => navigate(listPath)}
			>
				<i className="fa-solid fa-list" /> Lista
			</button>

			<button
				className={isCalendar ? "active" : ""}
				onClick={() => navigate(calendarPath)}
			>
				<i className="fa-solid fa-calendar-days" /> Calendário
			</button>
		</div>
	);
}
