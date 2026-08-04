import {
	useEffect,
	useRef,
	useState,
	forwardRef,
	useImperativeHandle
} from "react";

import api from "../../api/axios";
import "./AppliedProductsTable.css";

const AppliedProductsTable = forwardRef(function AppliedProductsTable({
	serviceId,
	showMessage,
	handleApiError
},ref) {

	const [appliedProducts, setAppliedProducts] = useState([]);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [adding, setAdding] = useState(false);

	const appliedProductsRef = useRef([]);
	const saveTimersRef = useRef({});
	const saveQueuesRef = useRef({});

	useEffect(() => { loadData(); }, [serviceId]); 
	useEffect(() => { appliedProductsRef.current = appliedProducts; }, [appliedProducts]);

	async function loadData() {
		setLoading(true);
		try {
			await Promise.all([
				loadAppliedProducts(),
			]);
		}
		finally {
			setLoading(false);
		}
	}

	async function loadAppliedProducts() {
		try {
			const res = await api.get(`/services/${serviceId}/applied_products`);

			const list = res.data.sap_list || [];
			appliedProductsRef.current = list;
			setAppliedProducts(list);
		}
		catch (err) {
			appliedProductsRef.current = [];
			setAppliedProducts([]);
			handleError(err);
		}
	}

	async function addProduct(product) {

		if ( !product || adding) {
			return;
		}

		setAdding(true);

		try {
			await api.post(
				`/services/${serviceId}/applied_products`,
				{
					service_id:
						Number(serviceId),

					product_id:
						Number(product.id),

					quantity: 1,
					is_applied: 0
				}
			);

			showMessage?.("success","Produto adicionado com sucesso.");

			await loadAppliedProducts();
		}
		catch (err) {
			handleError(err);
		}
		finally {
			setAdding(false);
		}
	}


	function handleError(err) {

		if (handleApiError) {
			handleApiError(err);
		}
		else {
			console.error(err);
		}

	}

	function getAppliedProductId(item) { return item.sap_id; }

	function getProductName(item) { return item.product_name; }

	function getProductReference(item) { return item.product_reference || "-"; }

	function getProductType(item) { return  item.product_type_name || "-"; }

	function updateAppliedProductLocally( itemId, field, value) {
		const updatedProducts = appliedProductsRef.current.map( 
			item => 
				Number(getAppliedProductId(item)) === Number(itemId) 
				? {
					...item,
					[field]: value
				} : 
					item
			);

		appliedProductsRef.current = updatedProducts;
		setAppliedProducts(updatedProducts);
	}

	function getAppliedProductById(itemId) {
		return appliedProductsRef.current.find(item =>
			Number(getAppliedProductId(item)) ===
			Number(itemId)
		);
	}

	function queueAppliedProductSave(itemId, values) {

		const previousQueue = saveQueuesRef.current[itemId] || Promise.resolve();

		const nextQueue = previousQueue.catch(() => undefined).then(async () => 
			{
				setSaving(true);
				await api.put( `/services/${serviceId}/applied_products/${itemId}`,
					{
						service_id:
							Number(serviceId),
						product_id:
							Number(values.product_id),
						quantity:
							Number(values.quantity),
						is_applied:
							values.is_applied ? 1 : 0
					}
				);
			})
			.catch(err => { handleError(err); })
			.finally(() => {
				if (saveQueuesRef.current[itemId] === nextQueue) 
					delete saveQueuesRef.current[itemId];
				if (Object.keys(saveQueuesRef.current).length === 0) 
					setSaving(false);
			});

		saveQueuesRef.current[itemId] = nextQueue;
	}

	function updateAppliedProduct(itemId, field, value) {

		const currentItem = getAppliedProductById(itemId);

		if (!currentItem) return;

		const updatedItem = { ...currentItem, [field]: value};

		updateAppliedProductLocally(itemId, field, value);

		if (field === "quantity") {

			if (saveTimersRef.current[itemId]) 
				clearTimeout(saveTimersRef.current[itemId]);
			

			if ( value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0) 
				return;
			

			saveTimersRef.current[itemId] =
				setTimeout(() => {

					delete saveTimersRef.current[itemId];
					const latestItem =
						getAppliedProductById(itemId);

					if (latestItem) {
						queueAppliedProductSave(
							itemId,
							latestItem
						);
					}

				}, 600);

			return;

		}

		queueAppliedProductSave(
			itemId,
			updatedItem
		);

	}

	async function deleteAppliedProduct(
		itemId,
		productName
	) {

		const confirmed = window.confirm(
			`Eliminar "${productName}"?`
		);

		if (!confirmed) {
			return;
		}

		try {

			await api.delete(
				`/services/${serviceId}/applied_products/${itemId}`
			);

			showMessage?.(
				"success",
				"Produto aplicado eliminado com sucesso."
			);

			await loadAppliedProducts();
		}
		catch (err) {
			handleError(err);
		}
	}

	useImperativeHandle(
		ref,
		() => ({
			addProduct,
			reload: loadAppliedProducts
		}),
		[serviceId, adding]
	);

	return (
		<div className="applied-products-section">
			<div className="table-wrapper">
				<table className="table">
					<thead>
						<tr>
							<th>Produto</th>
							<th>Referência</th>
							<th>Tipo</th>
							<th>Quantidade</th>
							<th>Aplicado</th>
							<th></th>
						</tr>
					</thead>

					<tbody>
						{loading && (
							<tr>
								<td colSpan={6}>
									A carregar...
								</td>
							</tr>
						)}

						{!loading && appliedProducts.length === 0 && (
							<tr>
								<td colSpan={6}>
									Nenhum produto aplicado encontrado.
								</td>
							</tr>
						)}

						{!loading && appliedProducts.map(item => {

							const itemId = getAppliedProductId( item);

							return (
								<tr key={itemId}>

									<td> {getProductName(item)} </td>
									<td> {getProductReference(item)} </td>
									<td> {getProductType( item)} </td>
									<td> <input
										type="number"
										min="0.001"
										step="any"
										value={ item.quantity ?? "" }
										onChange={event =>
											updateAppliedProduct(
												itemId,
												"quantity",
												event.target.value
											)
										}
									/>
									</td>
									<td> <input
										type="checkbox"
										checked={
											Number(
												item.is_applied
											) === 1 ||
												item.is_applied === true
										}
										onChange={event =>
											updateAppliedProduct(
												itemId,
												"is_applied",
												event.target.checked
											)
										}
									/>
									</td>
									<td>
										<button
											type="button"
											className="delete-btn"
											onClick={() =>
												deleteAppliedProduct(itemId, getProductName(item))
											}
										>
											<i className="fa-regular fa-trash-can"></i>
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
})
export default AppliedProductsTable;
