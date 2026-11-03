// Home page: type a matrícula, pick a car, go to its page (/cars/:id).
// Keyboard: ↑ ↓ to move, Enter to open, Esc to close.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { formatDay } from "../../Pages/Cars/CarCard";

import "../../Pages/Cars/Style/CarCard.css"; // .car-plate
import "./CarQuickSearch.css";

const MAX_RESULTS = 6;
const DEBOUNCE_MS = 250;

export default function CarQuickSearch() {

	const navigate = useNavigate();
	const boxRef = useRef(null);
	const requestIdRef = useRef(0);

	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);


	useEffect(() => {
		const term = query.trim();

		if (!term) {
			requestIdRef.current++;
			setResults([]);
			setTotal(0);
			setLoading(false);
			return;
		}

		setLoading(true);

		const timer = setTimeout(async () => {
			const requestId = ++requestIdRef.current;

			try {
				const res = await api.get("/cars", { params: { plate: term, p: 1, u: MAX_RESULTS } });
				if (requestId !== requestIdRef.current) return;

				setResults(res.data.car_list || []);
				setTotal(res.data.pagination?.total ?? (res.data.car_list || []).length);
				setActive(0);
			} catch (err) {
				if (requestId !== requestIdRef.current) return;
				console.error(err);
				setResults([]);
				setTotal(0);
			} finally {
				if (requestId === requestIdRef.current) setLoading(false);
			}
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [query]);


	// Close when clicking / tapping outside.
	useEffect(() => {
		function onDown(e) {
			if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
		}
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, []);


	function onKeyDown(e) {
		if (e.key === "Escape") {
			setOpen(false);
			return;
		}
		if (!results.length) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setActive((i) => (i + 1) % results.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setOpen(true);
			setActive((i) => (i - 1 + results.length) % results.length);
		} else if (e.key === "Enter") {
			e.preventDefault();
			navigate(`/cars/${results[active].id}`);
		}
	}


	const term = query.trim();
	const showPanel = open && term !== "";


	return (
		<div className="car-quick-search" ref={boxRef}>
			<div className="car-quick-search-input">
				<i className="fa-solid fa-car" />
				<input
					type="search"
					placeholder="Procurar viatura por matrícula..."
					value={query}
					autoComplete="off"
					aria-label="Procurar viatura por matrícula"
					onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
				/>
				{loading && <i className="fa-solid fa-spinner fa-spin car-quick-search-spinner" />}
			</div>

			{showPanel && (
				<div className="car-quick-search-panel" role="listbox">
					{!loading && results.length === 0 && (
						<p className="car-quick-search-empty">Nenhuma viatura com "{term}".</p>
					)}

					{results.map((car, i) => (
						<Link
							key={car.id}
							to={`/cars/${car.id}`}
							role="option"
							aria-selected={i === active}
							className={`car-quick-search-item ${i === active ? "is-active" : ""}`}
							onMouseEnter={() => setActive(i)}
						>
							<span className="car-plate">
								<span className="car-plate-country">P</span>
								<span className="car-plate-number">{car.plate}</span>
							</span>

							<span className="car-quick-search-info">
								<span className="car-quick-search-name">
									<b>{car.make_name || "Sem marca"}</b> {car.model_name}
								</span>
								<span className="car-quick-search-meta">
									{car.last_checkin_date
										? <>Último serviço {formatDay(car.last_checkin_date)}{car.last_client_name && <> · {car.last_client_name}</>}</>
										: "Sem serviços"}
								</span>
							</span>

							<i className="fa-solid fa-chevron-right car-quick-search-go" />
						</Link>
					))}

					{total > results.length && (
						<Link className="car-quick-search-more" to={`/cars?plate=${encodeURIComponent(term)}`}>
							Ver todas as viaturas ({total}) <i className="fa-solid fa-arrow-right" />
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
