import "./Footer.css";

export default function Footer() {

	return (

		<footer className="footer">

			<div className="footer-container">

				<div className="footer-brand">
					<h3>Oficina Lima</h3>
					<p>Auto Repair Management System</p>
				</div>

				<div className="footer-links">

					<a href="/services">Services</a>
					<a href="/schedules">Schedules</a>
					<a href="/schedules_calendar">Calendar</a>

				</div>

				<div className="footer-copy">
					© {new Date().getFullYear()} Oficina Lima
				</div>

			</div>

		</footer>

	);

}
