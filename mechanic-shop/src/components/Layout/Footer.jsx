import "./Footer.css";

export default function Footer() {

	return (

		<footer className="footer">

			<div className="footer-container">

				<div className="footer-brand">
					<h3>Oficina Lima</h3>
					<p>Sistema de Gestão - Reparação Automóvel</p>
				</div>

				<div className="footer-links">

					<a href="/services">Serviços</a>
					<a href="/schedules">Marcações</a>
					<a href="/schedules_calendar">Calendário</a>

				</div>

				<div className="footer-copy">
					© {new Date().getFullYear()} Oficina Lima
				</div>

			</div>

		</footer>

	);

}
