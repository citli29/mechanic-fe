import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const PER_PAGE = 10;
const SEARCH_DELAY = 300;

function getStatusInfo(labItem) {
	if (labItem.checkout) return { badgeClass: "service-status-delivered", label: "Entregue" };
	if (labItem.is_finished) return { badgeClass: "service-status-finished", label: "Terminado" };
	return { badgeClass: "service-status-pending", label: "Por terminar" };
}

// Gestão de Laboratório's search: every item instance put on a service,
// found by its property values (one field per property once an item type
// is picked, or any property's value otherwise), each row opening its service.
export default function LabInstanceSearch() {

	const requestIdRef = useRef(0);

	const [items, setItems] = useState([]);
	const [properties, setProperties] = useState([]);

	const [itemId, setItemId] = useState("");
	const [value, setValue] = useState("");
	// property_id => text typed for it
	const [propertyValues, setPropertyValues] = useState({});

	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		api.get("/items")
			.then((res) => setItems(res.data.item_list || []))
			.catch((err) => console.error(err));
	}, []);

	useEffect(() => {
		setPropertyValues({});
		if (!itemId) {
			setProperties([]);
			return;
		}
		api.get("/properties", { params: { t_item_id: itemId } })
			.then((res) => setProperties(res.data.property_list || []))
			.catch((err) => {
				console.error(err);
				setProperties([]);
			});
	}, [itemId]);

	// Any change of the search goes back to the first page.
	useEffect(() => { setPage(1); }, [itemId, value, propertyValues]);

	useEffect(() => {
		const timer = setTimeout(loadResults, SEARCH_DELAY);
		return () => clearTimeout(timer);
	}, [itemId, value, propertyValues, page]);

	async function loadResults() {
		const requestId = ++requestIdRef.current;
		setLoading(true);

		const params = { p: page, u: PER_PAGE };
		if (itemId) {
			params.t_item_id = itemId;
			Object.entries(propertyValues).forEach(([propertyId, text]) => {
				if (text.trim()) params[`prop[${propertyId}]`] = text.trim();
			});
		} else if (value.trim()) {
			params.value = value.trim();
		}

		try {
			const res = await api.get("/lab_items", { params });
			if (requestId !== requestIdRef.current) return;

			setResults(res.data.lab_item_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.lab_item_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;
			console.error(err);
			setResults([]);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}

	function clearFilters() {
		setItemId("");
		setValue("");
		setPropertyValues({});
	}

	return (
		<div className="card lab-instance-search">
			<div className="header">
				<i className="fa-solid fa-magnifying-glass" />
				<h1>Pesquisar Itens</h1>
			</div>

			<div className="body">
				<div className="filters">
					<select value={itemId} onChange={(e) => setItemId(e.target.value)}>
						<option value="">Todos os itens</option>
						{items.map((item) => (
							<option key={item.id} value={item.id}>{item.name}</option>
						))}
					</select>

					{itemId ? (
						properties.map((property) => (
							<input
								key={property.id}
								placeholder={property.name}
								value={propertyValues[property.id] || ""}
								onChange={(e) => setPropertyValues((prev) => ({ ...prev, [property.id]: e.target.value }))}
							/>
						))
					) : (
						<input
							placeholder="Valor de qualquer propriedade"
							value={value}
							onChange={(e) => setValue(e.target.value)}
						/>
					)}

					<button className="options" onClick={clearFilters}>
						<i className="fa-solid fa-broom" /> Limpar
					</button>
				</div>

				<table className="lab-instances-table">
					<thead>
						<tr>
							<th>Serviço</th>
							<th>Entrada</th>
							<th>Cliente</th>
							<th>Item</th>
							<th>Propriedades</th>
							<th>Estado</th>
						</tr>
					</thead>

					<tbody>
						{loading && results.length === 0 ? (
							<tr>
								<td data-label="" style={{ gridColumn: "1 / -1" }}>A Carregar...</td>
							</tr>
						) : results.length === 0 ? (
							<tr>
								<td data-label="" style={{ gridColumn: "1 / -1" }}>Sem resultados.</td>
							</tr>
						) : (
							results.map((labItem) => {
								const status = getStatusInfo(labItem);
								const propertiesText = labItem.properties
									.map((p) => `${p.property_name}: ${p.value}`)
									.join(" · ");

								return (
									<tr key={labItem.id}>
										<td data-label="Serviço">
											<Link className="row-link-overlay" to={`/services/${labItem.service_id}?lab_item=${labItem.id}`} aria-hidden="true" tabIndex={-1} />
											#{labItem.service_id}
										</td>
										<td data-label="Entrada">{labItem.checkin}</td>
										<td data-label="Cliente"><span className="cell-truncate" title={labItem.client_name}>{labItem.client_name || "-"}</span></td>
										<td data-label="Item" className="lab-instance-item">
											{labItem.item_i_class && <i className={labItem.item_i_class} />}
											<span className="cell-truncate">{labItem.item_name}</span>
										</td>
										<td data-label="Propriedades" className="lab-instance-properties">
											<span className="cell-truncate" title={propertiesText}>{propertiesText || "-"}</span>
										</td>
										<td data-label="Estado">
											<span className={`service-status ${status.badgeClass}`}>{status.label}</span>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>

				<div className="pagination">
					<button
						className="options"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						<i className="fa-solid fa-chevron-left" />
					</button>

					<span>Página {page} de {totalPages} ({total} itens)</span>

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
	);
}
