import { Link, useLocation } from "react-router-dom";
import "./ViewToggle.css";

export default function ViewToggle({ listPath, calendarPath }) {

	const location = useLocation();

	const isCalendar = location.pathname === calendarPath;

	return (
		<div className="view-toggle">
			<Link
				className={!isCalendar ? "active" : ""}
				to={listPath}
			>
				<i className="fa-solid fa-list" /> Lista
			</Link>

			<Link
				className={isCalendar ? "active" : ""}
				to={calendarPath}
			>
				<i className="fa-solid fa-calendar-days" /> Calendário
			</Link>
		</div>
	);
}
