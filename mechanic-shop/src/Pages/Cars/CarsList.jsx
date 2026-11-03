import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useFilterChange, useUrlParam, useUrlState } from "../../utils/useUrlState";
import { applyIdSearch } from "../../utils/idSearch";
import { CarCard, CarDetails, CarForm, digitsOnly } from "./CarCard";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/CarsList.css";

const PER_PAGE = 10;

const emptyFilters = { plate: "", year: "", month: "", make_id: "", model_name: "" };

export default function CarsList() {

	const requestIdRef = useRef(0);

	const [cars, setCars] = useState([]);
	const [makes, setMakes] = useState([]);

	// Filters + page live in the URL (?plate=13&p=2): ← back restores
	// them, and the Home search's "Ver todas" links straight to ?plate=.
	const [filters, setFilters] = useUrlState(emptyFilters);

	const [page, setPage] = useUrlParam("p", 1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	// One form at a time: a new car, or the car being edited.
	const [creatingCar, setCreatingCar] = useState(false);
	const [editingId, setEditingId] = useState(null);
	// Card opened read-only with ⌄ (same fields as Editar, no inputs).
	const [expandedId, setExpandedId] = useState(null);

	// Phone: the search's placeholder is just "Matrícula" (fits the width).
	const [isMobile, setIsMobile] = useState(
		() => window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");
		const onChange = (e) => setIsMobile(e.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);


	useEffect(() => { loadCars(); }, [page]);

	useEffect(() => { loadMakes(); }, []);

	useFilterChange(filters, () => {
		if (page !== 1) setPage(1);
		else loadCars();
	});


	async function loadCars() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			applyIdSearch(params);
			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/cars", { params });

			if (requestId !== requestIdRef.current) return;

			setCars(res.data.car_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.car_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setCars([]);
		}
	}


	async function loadMakes() {
		try {
			const res = await api.get("/makes");
			setMakes(res.data.make_list || []);
		} catch (err) {
			console.error(err);
			setMakes([]);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: digitsOnly(e.target.name, e.target.value) });
	}


	function clearFilters() {
		setFilters(emptyFilters);
	}


	function editCar(car) {
		setCreatingCar(false);
		setExpandedId(null);
		setEditingId(car.id);
	}


	const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;


	// Card click opens the viatura page; ⌄ shows the details in place.
	function renderCar(car) {
		const isExpanded = expandedId === car.id;
		const toggle = () => setExpandedId(isExpanded ? null : car.id);

		return (
			<CarCard
				key={car.id}
				car={car}
				to={`/cars/${car.id}`}
				className={isExpanded ? "is-expanded" : ""}
				history={{
					count: car.service_count,
					lastDate: car.last_checkin_date,
					lastClient: car.last_client_name,
				}}
				actions={
					<button
						className="options car-expand"
						aria-expanded={isExpanded}
						title={isExpanded ? "Esconder detalhes" : "Ver detalhes"}
						aria-label={isExpanded ? "Esconder detalhes" : "Ver detalhes"}
						onClick={toggle}
					>
						<i className="fa-solid fa-chevron-down" />
					</button>
				}
			>
				{isExpanded && (
					<CarDetails
						car={car}
						actions={
							<>
								<button className="options" onClick={() => editCar(car)}>
									<i className="fa-solid fa-pencil" /> Editar
								</button>
								<Link className="confirm" to={`/cars/${car.id}`}>
									<i className="fa-solid fa-arrow-up-right-from-square" /> Abrir viatura
								</Link>
							</>
						}
					/>
				)}
			</CarCard>
		);
	}


	return (
		<div className="page cars-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-car" />
						<h1>Viaturas</h1>
						<span className="cars-total">{total} {total === 1 ? "viatura" : "viaturas"}</span>
					</div>

					<div className="body">

						<div className="cars-toolbar">
							<div className="cars-search">
								<i className="fa-solid fa-magnifying-glass" />
								<input
									name="plate"
									placeholder={isMobile ? "Matrícula" : "Pesquisar por matrícula..."}
									value={filters.plate}
									onChange={updateFilter}
									autoComplete="off"
								/>
								{filters.plate && (
									<button
										className="cars-search-clear"
										title="Limpar matrícula"
										aria-label="Limpar matrícula"
										onClick={() => setFilters({ ...filters, plate: "" })}
									>
										<i className="fa-solid fa-xmark" />
									</button>
								)}
							</div>

							{!creatingCar && (
								<button
									className="confirm cars-add"
									onClick={() => {
										setEditingId(null);
										setExpandedId(null);
										setCreatingCar(true);
									}}
								>
									<i className="fa-solid fa-plus" /> <span>Adicionar Viatura</span>
								</button>
							)}
						</div>

						<div className="filters cars-filters">
							<select
								name="make_id"
								value={filters.make_id}
								onChange={updateFilter}
							>
								<option value="">Todas as marcas</option>
								{makes.map((make) => (
									<option key={make.id} value={make.id}>
										{make.name}
									</option>
								))}
							</select>

							<input
								name="model_name"
								placeholder="Modelo"
								value={filters.model_name}
								onChange={updateFilter}
							/>

							<input
								className="cars-filter-short"
								name="month"
								placeholder="Mês"
								inputMode="numeric"
								pattern="[0-9]*"
								value={filters.month}
								onChange={updateFilter}
							/>

							<input
								className="cars-filter-short"
								name="year"
								placeholder="Ano"
								inputMode="numeric"
								pattern="[0-9]*"
								value={filters.year}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters} disabled={activeFilterCount === 0}>
								<i className="fa-solid fa-broom" /> <span>Limpar</span>
							</button>
						</div>

						<div className="cars-list">
							{creatingCar && (
								<CarForm
									car={null}
									title="Nova viatura"
									onSaved={() => { setCreatingCar(false); loadCars(); }}
									onCancel={() => setCreatingCar(false)}
								/>
							)}

							{cars.map((car) => (
								editingId === car.id ? (
									<CarForm
										key={car.id}
										car={car}
										title={`Editar ${car.plate}`}
										onSaved={() => { setEditingId(null); loadCars(); }}
										onCancel={() => setEditingId(null)}
									/>
								) : (
									renderCar(car)
								)
							))}

							{cars.length === 0 && !creatingCar && (
								<div className="cars-empty">
									<i className="fa-solid fa-car-side" />
									<p>{activeFilterCount > 0 ? "Nenhuma viatura encontrada com estes filtros." : "Ainda não há viaturas."}</p>
									{activeFilterCount > 0 && (
										<button className="options" onClick={clearFilters}>
											<i className="fa-solid fa-broom" /> Limpar filtros
										</button>
									)}
								</div>
							)}
						</div>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} viaturas)</span>

							<button
								className="options"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
