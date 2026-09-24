import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "../../components/Pickers/style/Picker.css";
import "./Style/ProductRequestsDashboard.css";

const PER_PAGE = 20;

const TABS = [
	{ key: "to_order", label: "Por Encomendar", icon: "fa-cart-shopping", filters: { is_ordered: "false" } },
	{ key: "awaiting_delivery", label: "A Aguardar Entrega", icon: "fa-truck", filters: { is_ordered: "true", is_delivered: "false" } },
	{ key: "delivered", label: "Entregues", icon: "fa-dolly", filters: { is_delivered: "true" } },
];

function productContext(product) {
	const carLabel = [
		product.car_plate,
		[product.car_make, product.car_model].filter(Boolean).join(" "),
	].filter(Boolean).join(" - ");

	const label = [carLabel, product.client_name].filter(Boolean).join(" · ");

	return label ? `${label} (#${product.service_id})` : `Serviço #${product.service_id}`;
}


function groupByService(products) {
	const groups = [];
	const byServiceId = new Map();

	products.forEach((product) => {
		let group = byServiceId.get(product.service_id);

		if (!group) {
			group = {
				service_id: product.service_id,
				context: productContext(product),
				ready: Number(product.service_ready) === 1,
				items: [],
			};

			byServiceId.set(product.service_id, group);
			groups.push(group);
		}

		group.items.push(product);
	});

	return groups;
}


export default function ProductRequestsDashboard() {

	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

	const requestIdRef = useRef(0);

	// A same-tab click from the notifications popup passes these through
	// router state; a link opened in a new tab (right/middle click) has no
	// router state to inherit, only whatever's in the URL — so ?tab=/
	// ?highlight= from the notification's href are the fallback here.
	const [activeTab, setActiveTab] = useState(() => {
		const requested = location.state?.activeTab ?? searchParams.get("tab");
		return TABS.some((t) => t.key === requested) ? requested : TABS[0].key;
	});
	const [counts, setCounts] = useState({});

	// Arrived here from a "Produto pedido" notification — briefly highlight
	// that exact row so it's not just "somewhere in this list of products."
	const [highlightId, setHighlightId] = useState(() => {
		const requested = location.state?.highlightId ?? searchParams.get("highlight");
		return requested ? Number(requested) : null;
	});

	// Only meant to run once, right after landing here with tab/highlight in
	// the URL — not every time activeTab/highlightId change afterwards.
	useEffect(() => {
		if (searchParams.has("tab") || searchParams.has("highlight")) {
			setSearchParams({}, { replace: true });
		}
	}, []);

	useEffect(() => {
		if (!highlightId) return;
		const timer = setTimeout(() => setHighlightId(null), 4000);
		return () => clearTimeout(timer);
	}, [highlightId]);

	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [search, setSearch] = useState("");

	const [loading, setLoading] = useState(true);

	const [productTypes, setProductTypes] = useState([]);

	const [pickerItemId, setPickerItemId] = useState(null);
	const [pickerSearch, setPickerSearch] = useState("");
	const [pickerResults, setPickerResults] = useState([]);
	const [pickerAddingNew, setPickerAddingNew] = useState(false);
	const [pickerNewProduct, setPickerNewProduct] = useState({ name: "", reference: "", product_type_id: "" });
	const [pickerLoading, setPickerLoading] = useState(false);

	function handleApiError(err) {
		console.error(err);
	}


	async function loadCounts() {
		try {
			const results = await Promise.all(
				TABS.map((tab) => api.get("/services_products_requested", {
					params: { ...tab.filters, p: 1, u: 1 },
				}))
			);

			const nextCounts = {};

			TABS.forEach((tab, index) => {
				nextCounts[tab.key] = results[index].data.pagination?.total ?? 0;
			});

			setCounts(nextCounts);
		} catch (err) {
			console.error(err);
		}
	}


	async function loadItems() {
		const requestId = ++requestIdRef.current;

		setLoading(true);

		try {
			const tab = TABS.find((t) => t.key === activeTab);

			const params = { ...tab.filters, p: page, u: PER_PAGE };

			if (search) params.q = search;

			const res = await api.get("/services_products_requested", { params });

			if (requestId !== requestIdRef.current) return;

			setItems(res.data.spr_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? 0);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			handleApiError(err);
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}


	async function loadProductTypes() {
		try {
			const res = await api.get("/product_types");
			setProductTypes(res.data.product_type_list || []);
		} catch (err) {
			console.error(err);
		}
	}


	useEffect(() => { loadCounts(); }, []);

	useEffect(() => { loadProductTypes(); }, []);

	useEffect(() => { loadItems(); }, [activeTab, page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadItems();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [search]);


	function selectTab(key) {
		setActiveTab(key);
		setPage(1);
	}


	async function refreshAfterMutation() {
		await Promise.all([loadItems(), loadCounts()]);
	}


	function updateLocalItem(spr) {
		setItems((prev) => prev.map((item) => (item.id === spr.id ? spr : item)));
	}


	async function updateItem(spr) {
		try {
			const response = await api.put(
				`services/${spr.service_id}/products_requested/${spr.spr_id}`,
				{
					product_id: spr.product_id,
					quantity: spr.quantity,
					is_ordered: spr.is_ordered,
					is_delivered: spr.is_delivered,
				}
			);

			return response.data.spr;
		} catch (err) {
			handleApiError(err);
			return null;
		}
	}


	async function handleFieldBlur(spr) {
		const updated = await updateItem(spr);
		if (updated) refreshAfterMutation();
	}


	async function handleToggle(spr, field, checked) {
		const updated = await updateItem({ ...spr, [field]: checked ? 1 : 0 });
		if (updated) refreshAfterMutation();
	}


	function capitalize(str) {
		str = str.trim();
		return str.charAt(0).toUpperCase() + str.slice(1);
	}


	function startAddingNewProduct() {
		setPickerNewProduct((prev) => ({ ...prev, name: capitalize(pickerSearch) }));
		setPickerAddingNew(true);
	}


	function openPicker(item) {
		setPickerItemId(item.id);
		setPickerSearch("");
		setPickerResults([]);
		setPickerAddingNew(false);
		setPickerNewProduct({ name: "", reference: "", product_type_id: "" });
	}


	function closePicker() {
		setPickerItemId(null);
		setPickerSearch("");
		setPickerResults([]);
		setPickerAddingNew(false);
	}


	useEffect(() => {
		if (pickerItemId === null) return;

		let isCurrent = true;

		const timer = setTimeout(async () => {
			try {
				const res = await api.get("productsOr", { params: { q: pickerSearch } });
				if (isCurrent) setPickerResults(res.data.product_list || []);
			} catch (err) {
				console.error(err);
			}
		}, 300);

		return () => {
			isCurrent = false;
			clearTimeout(timer);
		};
	}, [pickerSearch, pickerItemId]);


	async function applyProductAndDeliver(item, product) {
		setPickerLoading(true);

		try {
			const updated = await updateItem({ ...item, product_id: product.id, is_delivered: 1 });

			if (updated) {
				closePicker();
				refreshAfterMutation();
			}
		} finally {
			setPickerLoading(false);
		}
	}


	async function handlePickExistingProduct(item, product) {
		await applyProductAndDeliver(item, product);
	}


	async function handleCreateAndApplyProduct(item) {
		if (!pickerNewProduct.name.trim()) return;

		setPickerLoading(true);

		try {
			const response = await api.post("products", {
				name: pickerNewProduct.name,
				reference: pickerNewProduct.reference,
				product_type_id: pickerNewProduct.product_type_id,
			});

			const product = response.data.product;

			if (product) await applyProductAndDeliver(item, product);
		} catch (err) {
			handleApiError(err);
		} finally {
			setPickerLoading(false);
		}
	}


	function renderGroups() {
		const showReceived = activeTab !== "to_order";

		if (loading && items.length === 0) {
			return <p className="pr-empty">A carregar...</p>;
		}

		if (!loading && items.length === 0) {
			return <p className="pr-empty">Sem produtos nesta secção.</p>;
		}

		return (
			<div className="pr-groups">
				{groupByService(items).map((group) => {
					const groupStatusClass = group.ready
						? "pr-group-ready"
						: activeTab === "delivered"
							? "pr-group-partial"
							: "";

					return (
					<div key={group.service_id} className={`pr-group ${groupStatusClass}`}>
						<div className="pr-group-header">
							<span>
								{group.ready && <i className="fa-solid fa-circle-check pr-ready-icon" title="Tudo entregue" />}
								{group.context}
							</span>

							<Link className="options" to={`/service/${group.service_id}`}>
								<i className="fa-solid fa-arrow-up-right-from-square" />
							</Link>
						</div>

						<table className={showReceived ? "" : "pr-no-received"}>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Referência</th>
									<th>Tipo</th>
									<th>Qt.</th>
									<th>Pedido</th>
									{showReceived && <th>Recebido</th>}
								</tr>
							</thead>

							<tbody>
								{group.items.map((item) => (
									<tr
										key={item.id}
										ref={item.id === highlightId ? (el) => el?.scrollIntoView({ behavior: "smooth", block: "center" }) : undefined}
										className={[
											pickerItemId === item.id ? "pr-row-selected" : "",
											item.id === highlightId ? "pr-row-highlighted" : "",
										].filter(Boolean).join(" ")}
									>
										<td data-label="Nome">{item.product_name || "-"}</td>
										<td data-label="Referência">{item.product_reference || "-"}</td>
										<td data-label="Tipo">{item.product_type_name || "-"}</td>
										<td data-label="Qt." className="pr-qty-cell">
											<input
												type="number"
												value={item.quantity}
												onChange={(e) => updateLocalItem({ ...item, quantity: e.target.value })}
												onBlur={(e) => handleFieldBlur({ ...item, quantity: e.target.value })}
											/>
										</td>
										<td data-label="Pedido" className="pr-checkbox-cell">
											<label>
												<input
													type="checkbox"
													checked={item.is_ordered == 1}
													onChange={(e) => handleToggle(item, "is_ordered", e.target.checked)}
												/>
											</label>
										</td>
										{showReceived && (
											<td data-label="Recebido" className="pr-checkbox-cell pr-received-cell">
												<span className="pr-received-controls">
													<label>
														<input
															type="checkbox"
															checked={item.is_delivered == 1}
															onChange={(e) => handleToggle(item, "is_delivered", e.target.checked)}
														/>
													</label>
													{activeTab === "awaiting_delivery" && (
														<button
															className="pr-btn-specify options"
															onClick={() => (pickerItemId === item.id ? closePicker() : openPicker(item))}
														>
															<i className="fa-solid fa-boxes-packing" />
														</button>
													)}
												</span>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					);
				})}
			</div>
		);
	}


	function renderPickerModal() {
		if (pickerItemId === null) return null;

		const item = items.find((i) => i.id === pickerItemId);

		if (!item) return null;

		return (
			<div className="pr-picker-backdrop" onClick={closePicker}>
				<div className="pr-picker-modal" onClick={(e) => e.stopPropagation()}>
					<div className="pr-picker-modal-header">
						<div>
							<h2>Especificar Produto Entregue</h2>
							<p>{item.product_name} · Qt. {item.quantity}</p>
						</div>

						<button className="cancel" onClick={closePicker}>
							<i className="fa-solid fa-x" />
						</button>
					</div>

					<div className="search-bar search-products">
						<span><i className="fa-solid fa-magnifying-glass" /></span>
						<input
							type="text"
							autoFocus
							placeholder="Pesquisar Produto..."
							value={pickerSearch}
							onChange={(e) => setPickerSearch(e.target.value)}
						/>
					</div>

					{!pickerAddingNew && (
						<ul className="dropdown pr-picker-dropdown">
							<li>
								<button className="addEntry" onClick={startAddingNewProduct}>
									<span><i className="fa-solid fa-plus" />Adicionar Produto</span>
									<span>{pickerSearch}</span>
								</button>
							</li>
							{pickerResults.map((p) => (
								<li key={p.id}>
									<button disabled={pickerLoading} onClick={() => handlePickExistingProduct(item, p)}>
										<span>{p.name}</span>
										<span>{p.reference}</span>
										<span>{p.product_type_name}</span>
									</button>
								</li>
							))}
						</ul>
					)}

					{pickerAddingNew && (
						<div className="pr-add-product">
							<div className="item-field">
								<label>Nome:</label>
								<input
									type="text"
									placeholder="S/Nome"
									value={pickerNewProduct.name}
									onChange={(e) => setPickerNewProduct((prev) => ({ ...prev, name: e.target.value }))}
								/>
							</div>

							<div className="item-field">
								<label>Referência:</label>
								<input
									className="uppercase"
									type="text"
									placeholder="S/Referencia"
									value={pickerNewProduct.reference}
									onChange={(e) => setPickerNewProduct((prev) => ({ ...prev, reference: e.target.value }))}
								/>
							</div>

							<div className="item-field">
								<label>Tipo de Produto:</label>
								<select
									value={pickerNewProduct.product_type_id}
									onChange={(e) => setPickerNewProduct((prev) => ({ ...prev, product_type_id: e.target.value }))}
								>
									<option value="" disabled>Selecione um tipo</option>
									{productTypes.map((pt) => (
										<option key={pt.id} value={pt.id}>{pt.name}</option>
									))}
								</select>
							</div>

							<div className="pr-add-product-actions">
								<button
									className="confirm"
									disabled={pickerLoading}
									onClick={() => handleCreateAndApplyProduct(item)}
								>
									<i className="fa-solid fa-check" /> Criar e Marcar Entregue
								</button>

								<button className="cancel" onClick={() => setPickerAddingNew(false)}>
									<i className="fa-solid fa-x" />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}


	return (
		<div className="page product-requests-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-dolly" />
						<h1>Pedidos de Produtos</h1>
					</div>

					<div className="body">

						<div className="pr-tabs">
							{TABS.map((tab) => (
								<button
									key={tab.key}
									className={activeTab === tab.key ? "active" : ""}
									onClick={() => selectTab(tab.key)}
								>
									<i className={`fa-solid ${tab.icon}`} />
									{tab.label}
									<span className="pr-tab-count">{counts[tab.key] ?? 0}</span>
								</button>
							))}
						</div>

						<div className="filters">
							<input
								placeholder="Pesquisar Produto..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>

						{renderGroups()}

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} produtos)</span>

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

			{renderPickerModal()}
		</div>
	);
}
