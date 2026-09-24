import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/LabManagement.css";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

const PER_PAGE = 10;
const ICON_CLASS_PLACEHOLDER = "fa-solid fa-flask";

export default function LabManagement() {

	const requestIdRef = useRef(0);

	const [items, setItems] = useState([]);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newName, setNewName] = useState("");
	const [newIcon, setNewIcon] = useState("");

	// Clicking a row selects it and shows its properties/actions below —
	// single selection (not a set) since there's one properties/actions panel.
	const [selectedItemId, setSelectedItemId] = useState(null);

	function resetPropertyEditing() {
		setEditingProperty(null);
		setCreatingProperty(false);
		setNewPropertyName("");
		setNewPropertyIcon("");
		setNewPropertyIsPrimary(false);
	}

	function resetActionEditing() {
		setEditingAction(null);
		setCreatingAction(false);
		setNewActionName("");
		setNewActionIcon("");
	}

	function resetValueEditing() {
		setEditingValue(null);
		setCreatingValue(false);
		setNewValueName("");
		setNewValueIcon("");
	}

	function toggleSelected(id) {
		setSelectedItemId((prev) => (prev === id ? null : id));
		setSelectedActionId(null);
		resetPropertyEditing();
		resetActionEditing();
		resetValueEditing();
	}

	const selectedItem = items.find((item) => item.id === selectedItemId) || null;

	// "Ações" belong to the selected item — loaded from the server whenever
	// the selection changes.
	const [actions, setActions] = useState([]);

	const [editingAction, setEditingAction] = useState(null);
	const [creatingAction, setCreatingAction] = useState(false);
	const [newActionName, setNewActionName] = useState("");
	const [newActionIcon, setNewActionIcon] = useState("");

	// "Propriedades" — another item-level child, same shape/pattern as Ações,
	// just a sibling instead of nested under it.
	const [properties, setProperties] = useState([]);

	const [editingProperty, setEditingProperty] = useState(null);
	const [creatingProperty, setCreatingProperty] = useState(false);
	const [newPropertyName, setNewPropertyName] = useState("");
	const [newPropertyIcon, setNewPropertyIcon] = useState("");
	const [newPropertyIsPrimary, setNewPropertyIsPrimary] = useState(false);

	// Selecting an action shows its own "Valores" below it — same
	// selection/properties idea as items → actions, one level deeper.
	const [selectedActionId, setSelectedActionId] = useState(null);

	function toggleSelectedAction(id) {
		setSelectedActionId((prev) => (prev === id ? null : id));
		resetValueEditing();
	}

	const selectedAction = actions.find((action) => action.id === selectedActionId) || null;

	// "Valores" are an action's tabled default values (action_tabled_values).
	const [values, setValues] = useState([]);

	const [editingValue, setEditingValue] = useState(null);
	const [creatingValue, setCreatingValue] = useState(false);
	const [newValueName, setNewValueName] = useState("");
	const [newValueIcon, setNewValueIcon] = useState("");

	function handleApiError(err) {
		console.error(err);
	}


	useEffect(() => { loadItems(); }, [page]);


	async function loadItems() {
		const requestId = ++requestIdRef.current;

		try {
			const params = { p: page, u: PER_PAGE };

			const res = await api.get("/items", { params });

			if (requestId !== requestIdRef.current) return;

			setItems(res.data.item_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.item_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setItems([]);
		}
	}


	async function createItem() {
		if (!newName.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.post("/items", { name: newName, i_class: newIcon });

			pushSuccessToast("Item criado com sucesso.");

			setNewName("");
			setNewIcon("");
			setCreating(false);

			loadItems();
		} catch (err) {
			handleApiError(err);
		}
	}


	function editItem(item) {
		setEditing({ ...item });
	}


	function updateEdit(e) {
		const { name, value } = e.target;
		setEditing({ ...editing, [name]: value });
	}


	async function saveItem() {
		if (!editing.name.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.put(`/items/${editing.id}`, { name: editing.name, i_class: editing.i_class });

			pushSuccessToast("Item atualizado com sucesso.");

			setEditing(null);

			loadItems();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteItem(id) {
		const confirmed = window.confirm("Apagar este item?");
		if (!confirmed) return;

		try {
			await api.delete(`/items/${id}`);

			pushSuccessToast("Item apagado com sucesso.");

			if (selectedItemId === id) {
				setSelectedItemId(null);
				setSelectedActionId(null);
				resetPropertyEditing();
				resetActionEditing();
				resetValueEditing();
			}

			loadItems();
		} catch (err) {
			handleApiError(err);
		}
	}


	useEffect(() => {
		loadProperties(selectedItemId);
		loadActions(selectedItemId);
	}, [selectedItemId]);


	async function loadProperties(itemId) {
		if (!itemId) {
			setProperties([]);
			return;
		}

		try {
			const res = await api.get("/properties", { params: { t_item_id: itemId } });
			setProperties(res.data.property_list || []);
		} catch (err) {
			console.error(err);
			setProperties([]);
		}
	}


	async function createProperty() {
		if (!newPropertyName.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.post("/properties", {
				t_item_id: selectedItemId,
				name: newPropertyName,
				i_class: newPropertyIcon,
				is_primary: newPropertyIsPrimary,
			});

			pushSuccessToast("Propriedade criada com sucesso.");

			setNewPropertyName("");
			setNewPropertyIcon("");
			setNewPropertyIsPrimary(false);
			setCreatingProperty(false);

			loadProperties(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	function editProperty(property) {
		setEditingProperty({ ...property });
	}


	function updateEditProperty(e) {
		const { name, value, type, checked } = e.target;
		setEditingProperty({ ...editingProperty, [name]: type === "checkbox" ? checked : value });
	}


	async function saveProperty() {
		if (!editingProperty.name.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.put(`/properties/${editingProperty.id}`, {
				t_item_id: selectedItemId,
				name: editingProperty.name,
				i_class: editingProperty.i_class,
				is_primary: editingProperty.is_primary,
			});

			pushSuccessToast("Propriedade atualizada com sucesso.");

			setEditingProperty(null);

			loadProperties(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteProperty(id) {
		const confirmed = window.confirm("Apagar esta propriedade?");
		if (!confirmed) return;

		try {
			await api.delete(`/properties/${id}`);

			pushSuccessToast("Propriedade apagada com sucesso.");

			loadProperties(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	async function loadActions(itemId) {
		if (!itemId) {
			setActions([]);
			return;
		}

		try {
			const res = await api.get("/actions", { params: { t_item_id: itemId } });
			setActions(res.data.action_list || []);
		} catch (err) {
			console.error(err);
			setActions([]);
		}
	}


	async function createAction() {
		if (!newActionName.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.post("/actions", {
				t_item_id: selectedItemId,
				name: newActionName,
				i_class: newActionIcon,
			});

			pushSuccessToast("Ação criada com sucesso.");

			setNewActionName("");
			setNewActionIcon("");
			setCreatingAction(false);

			loadActions(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	function editAction(action) {
		setEditingAction({ ...action });
	}


	function updateEditAction(e) {
		const { name, value } = e.target;
		setEditingAction({ ...editingAction, [name]: value });
	}


	async function saveAction() {
		if (!editingAction.name.trim()) {
			pushErrorToast("Nome é obrigatório.");
			return;
		}

		try {
			await api.put(`/actions/${editingAction.id}`, {
				t_item_id: selectedItemId,
				name: editingAction.name,
				i_class: editingAction.i_class,
			});

			pushSuccessToast("Ação atualizada com sucesso.");

			setEditingAction(null);

			loadActions(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteAction(id) {
		const confirmed = window.confirm("Apagar esta ação?");
		if (!confirmed) return;

		try {
			await api.delete(`/actions/${id}`);

			pushSuccessToast("Ação apagada com sucesso.");

			if (selectedActionId === id) {
				setSelectedActionId(null);
				resetValueEditing();
			}

			loadActions(selectedItemId);
		} catch (err) {
			handleApiError(err);
		}
	}


	useEffect(() => {
		loadActionTabledValues(selectedActionId);
	}, [selectedActionId]);


	async function loadActionTabledValues(actionId) {
		if (!actionId) {
			setValues([]);
			return;
		}

		try {
			const res = await api.get("/action_tabled_values", { params: { t_action_id: actionId } });
			setValues(res.data.action_tabled_value_list || []);
		} catch (err) {
			console.error(err);
			setValues([]);
		}
	}


	async function createValue() {
		if (!newValueName.trim()) {
			pushErrorToast("Valor é obrigatório.");
			return;
		}

		try {
			await api.post("/action_tabled_values", {
				t_action_id: selectedActionId,
				value: newValueName,
				i_class: newValueIcon,
			});

			pushSuccessToast("Valor criado com sucesso.");

			setNewValueName("");
			setNewValueIcon("");
			setCreatingValue(false);

			loadActionTabledValues(selectedActionId);
		} catch (err) {
			handleApiError(err);
		}
	}


	function editValue(value) {
		setEditingValue({ ...value });
	}


	function updateEditValue(e) {
		const { name, value } = e.target;
		setEditingValue({ ...editingValue, [name]: value });
	}


	async function saveValue() {
		if (!editingValue.value.trim()) {
			pushErrorToast("Valor é obrigatório.");
			return;
		}

		try {
			await api.put(`/action_tabled_values/${editingValue.id}`, {
				t_action_id: selectedActionId,
				value: editingValue.value,
				i_class: editingValue.i_class,
			});

			pushSuccessToast("Valor atualizado com sucesso.");

			setEditingValue(null);

			loadActionTabledValues(selectedActionId);
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteValue(id) {
		const confirmed = window.confirm("Apagar este valor?");
		if (!confirmed) return;

		try {
			await api.delete(`/action_tabled_values/${id}`);

			pushSuccessToast("Valor apagado com sucesso.");

			loadActionTabledValues(selectedActionId);
		} catch (err) {
			handleApiError(err);
		}
	}


	return (
		<div className="page lab-management-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-flask" />
						<h1>Gestão de Laboratório</h1>
					</div>

					<div className="body">

						<div className="lab-management-columns">

							<div className="lab-management-column">
								<table className="lab-items-table lab-selectable-table">
									<thead>
										<tr>
											<th style={{ gridColumn: "1 / -1" }}>Item</th>
										</tr>
									</thead>

									<tbody>
										{items.map((item) => (
											editing?.id === item.id ? (
												<tr key={item.id} className="editing">
													<td data-label="Item">
														<input
															name="name"
															value={editing.name || ""}
															onChange={updateEdit}
														/>
													</td>

													<td data-label="Classe">
														<input
															name="i_class"
															placeholder={ICON_CLASS_PLACEHOLDER}
															value={editing.i_class || ""}
															onChange={updateEdit}
														/>
													</td>

													<td className="lab-icon-cell" data-label="Ícone" />

													<td className="actions">
														<button className="confirm" onClick={saveItem}>
															<i className="fa-solid fa-check" />
														</button>
														<button className="cancel" onClick={() => setEditing(null)}>
															<i className="fa-solid fa-x" />
														</button>
													</td>
												</tr>
											) : (
												<tr
													key={item.id}
													className={selectedItemId === item.id ? "selected" : ""}
													onClick={() => toggleSelected(item.id)}
												>
													<td data-label="Item"><span className="cell-truncate" title={item.name}>{item.name}</span></td>

													<td data-label="Classe"><span className="cell-truncate" title={item.i_class}>{item.i_class}</span></td>

													<td className="lab-icon-cell" data-label="Ícone">
														{item.i_class ? <i className={item.i_class} /> : null}
													</td>

													<td className="actions" onClick={(e) => e.stopPropagation()}>
														<button className="options" onClick={() => editItem(item)}>
															<i className="fa-solid fa-pencil" />
														</button>
														<button
															className="cancel"
															onClick={() => deleteItem(item.id)}
														>
															<i className="fa-solid fa-x" />
														</button>
													</td>
												</tr>
											)
										))}

										{creating ? (
											<tr className="editing">
												<td data-label="Item">
													<input
														placeholder="Item"
														value={newName}
														onChange={(e) => setNewName(e.target.value)}
														autoFocus
													/>
												</td>

												<td data-label="Classe">
													<input
														placeholder={ICON_CLASS_PLACEHOLDER}
														value={newIcon}
														onChange={(e) => setNewIcon(e.target.value)}
													/>
												</td>

												<td className="lab-icon-cell" data-label="Ícone" />

												<td className="actions">
													<button className="confirm" onClick={createItem}>
														<i className="fa-solid fa-check" />
													</button>
													<button
														className="cancel"
														onClick={() => {
															setCreating(false);
															setNewName("");
															setNewIcon("");
														}}
													>
														<i className="fa-solid fa-x" />
													</button>
												</td>
											</tr>
										) : (
											<tr className="lab-item-add-row" onClick={() => setCreating(true)}>
												<td data-label="" style={{ gridColumn: "1 / -1" }}>
													<i className="fa-solid fa-plus" />
												</td>
											</tr>
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

									<span>Página {page} de {totalPages} ({total} items)</span>

									<button
										className="options"
										disabled={page >= totalPages}
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									>
										<i className="fa-solid fa-chevron-right" />
									</button>
								</div>
							</div>
							<div className="lab-management-column">
								{selectedItem ? (
									<table className="lab-item-actions-table lab-properties-table">
										<thead>
										<tr>
												<th style={{ gridColumn: "1 / -1" }}>Propriedade</th>
											</tr>
										</thead>

										<tbody>
											{properties.map((property) => (
												editingProperty?.id === property.id ? (
													<tr key={property.id} className="editing">
														<td data-label="Propriedade">
															<input
																name="name"
																value={editingProperty.name || ""}
																onChange={updateEditProperty}
															/>
														</td>

														<td className="lab-primary-cell" data-label="Primária">
															<input
																type="checkbox"
																name="is_primary"
																checked={!!editingProperty.is_primary}
																onChange={updateEditProperty}
															/>
														</td>

														<td data-label="Classe">
															<input
																name="i_class"
																placeholder={ICON_CLASS_PLACEHOLDER}
																value={editingProperty.i_class || ""}
																onChange={updateEditProperty}
															/>
														</td>

														<td className="lab-icon-cell" data-label="Ícone" />

														<td className="actions">
															<button className="confirm" onClick={saveProperty}>
																<i className="fa-solid fa-check" />
															</button>
															<button className="cancel" onClick={() => setEditingProperty(null)}>
																<i className="fa-solid fa-x" />
															</button>
														</td>
													</tr>
												) : (
													<tr key={property.id}>
														<td data-label="Propriedade"><span className="cell-truncate" title={property.name}>{property.name}</span></td>

														<td className="lab-primary-cell" data-label="Primária">
															{property.is_primary ? <i className="fa-solid fa-check" /> : null}
														</td>

														<td data-label="Classe"><span className="cell-truncate" title={property.i_class}>{property.i_class}</span></td>

														<td className="lab-icon-cell" data-label="Ícone">
															{property.i_class ? <i className={property.i_class} /> : null}
														</td>

														<td className="actions">
															<button className="options" onClick={() => editProperty(property)}>
																<i className="fa-solid fa-pencil" />
															</button>
															<button
																className="cancel"
																onClick={() => deleteProperty(property.id)}
															>
																<i className="fa-solid fa-trash" />
															</button>
														</td>
													</tr>
												)
											))}

											{creatingProperty ? (
												<tr className="editing">
													<td data-label="Propriedade">
														<input
															placeholder="Propriedade"
															value={newPropertyName}
															onChange={(e) => setNewPropertyName(e.target.value)}
															autoFocus
														/>
													</td>

													<td className="lab-primary-cell" data-label="Primária">
														<input
															type="checkbox"
															checked={newPropertyIsPrimary}
															onChange={(e) => setNewPropertyIsPrimary(e.target.checked)}
														/>
													</td>

													<td data-label="Classe">
														<input
															placeholder={ICON_CLASS_PLACEHOLDER}
															value={newPropertyIcon}
															onChange={(e) => setNewPropertyIcon(e.target.value)}
														/>
													</td>

													<td className="lab-icon-cell" data-label="Ícone" />

													<td className="actions">
														<button className="confirm" onClick={createProperty}>
															<i className="fa-solid fa-check" />
														</button>
														<button
															className="cancel"
															onClick={() => {
																setCreatingProperty(false);
																setNewPropertyName("");
																setNewPropertyIcon("");
																setNewPropertyIsPrimary(false);
															}}
														>
															<i className="fa-solid fa-x" />
														</button>
													</td>
												</tr>
											) : (
												<tr className="lab-item-add-row" onClick={() => setCreatingProperty(true)}>
													<td data-label="" style={{ gridColumn: "1 / -1" }}>
														<i className="fa-solid fa-plus" />
													</td>
												</tr>
											)}
										</tbody>
									</table>
								) : (
									<p className="lab-management-empty">Selecione um item para ver as propriedades.</p>
								)}
							</div>

						</div>

						<div className="lab-management-columns">

							<div className="lab-management-column">
								{selectedItem ? (
									<table className="lab-item-actions-table lab-selectable-table">
										<thead>
											<tr>
												<th style={{ gridColumn: "1 / -1" }}>Ação</th>
											</tr>
										</thead>

										<tbody>
											{actions.map((action) => (
												editingAction?.id === action.id ? (
													<tr key={action.id} className="editing">
														<td data-label="Ação">
															<input
																name="name"
																value={editingAction.name || ""}
																onChange={updateEditAction}
															/>
														</td>

														<td data-label="Classe">
															<input
																name="i_class"
																placeholder={ICON_CLASS_PLACEHOLDER}
																value={editingAction.i_class || ""}
																onChange={updateEditAction}
															/>
														</td>

														<td className="lab-icon-cell" data-label="Ícone" />

														<td className="actions">
															<button className="confirm" onClick={saveAction}>
																<i className="fa-solid fa-check" />
															</button>
															<button className="cancel" onClick={() => setEditingAction(null)}>
																<i className="fa-solid fa-x" />
															</button>
														</td>
													</tr>
												) : (
													<tr
														key={action.id}
														className={selectedActionId === action.id ? "selected" : ""}
														onClick={() => toggleSelectedAction(action.id)}
													>
														<td data-label="Ação"><span className="cell-truncate" title={action.name}>{action.name}</span></td>

														<td data-label="Classe"><span className="cell-truncate" title={action.i_class}>{action.i_class}</span></td>

														<td className="lab-icon-cell" data-label="Ícone">
															{action.i_class ? <i className={action.i_class} /> : null}
														</td>

														<td className="actions" onClick={(e) => e.stopPropagation()}>
															<button className="options" onClick={() => editAction(action)}>
																<i className="fa-solid fa-pencil" />
															</button>
															<button
																className="cancel"
																onClick={() => deleteAction(action.id)}
															>
																<i className="fa-solid fa-trash" />
															</button>
														</td>
													</tr>
												)
											))}

											{creatingAction ? (
												<tr className="editing">
													<td data-label="Ação">
														<input
															placeholder="Ação"
															value={newActionName}
															onChange={(e) => setNewActionName(e.target.value)}
															autoFocus
														/>
													</td>

													<td data-label="Classe">
														<input
															placeholder={ICON_CLASS_PLACEHOLDER}
															value={newActionIcon}
															onChange={(e) => setNewActionIcon(e.target.value)}
														/>
													</td>

													<td className="lab-icon-cell" data-label="Ícone" />

													<td className="actions">
														<button className="confirm" onClick={createAction}>
															<i className="fa-solid fa-check" />
														</button>
														<button
															className="cancel"
															onClick={() => {
																setCreatingAction(false);
																setNewActionName("");
																setNewActionIcon("");
															}}
														>
															<i className="fa-solid fa-x" />
														</button>
													</td>
												</tr>
											) : (
												<tr className="lab-item-add-row" onClick={() => setCreatingAction(true)}>
													<td data-label="" style={{ gridColumn: "1 / -1" }}>
														<i className="fa-solid fa-plus" />
													</td>
												</tr>
											)}
										</tbody>
									</table>
								) : (
									<p className="lab-management-empty">Selecione um item para ver as ações.</p>
								)}
							</div>

							<div className="lab-management-column">
								{selectedAction ? (
									<table className="lab-item-actions-table">
										<thead>
										<tr>
												<th style={{ gridColumn: "1 / -1" }}>Valor</th>
											</tr>
										</thead>

										<tbody>
											{values.map((value) => (
												editingValue?.id === value.id ? (
													<tr key={value.id} className="editing">
														<td data-label="Valor">
															<input
																name="value"
																value={editingValue.value || ""}
																onChange={updateEditValue}
															/>
														</td>

														<td data-label="Classe">
															<input
																name="i_class"
																placeholder={ICON_CLASS_PLACEHOLDER}
																value={editingValue.i_class || ""}
																onChange={updateEditValue}
															/>
														</td>

														<td className="lab-icon-cell" data-label="Ícone" />

														<td className="actions">
															<button className="confirm" onClick={saveValue}>
																<i className="fa-solid fa-check" />
															</button>
															<button className="cancel" onClick={() => setEditingValue(null)}>
																<i className="fa-solid fa-x" />
															</button>
														</td>
													</tr>
												) : (
													<tr key={value.id}>
														<td data-label="Valor"><span className="cell-truncate" title={value.value}>{value.value}</span></td>

														<td data-label="Classe"><span className="cell-truncate" title={value.i_class}>{value.i_class}</span></td>

														<td className="lab-icon-cell" data-label="Ícone">
															{value.i_class ? <i className={value.i_class} /> : null}
														</td>

														<td className="actions">
															<button className="options" onClick={() => editValue(value)}>
																<i className="fa-solid fa-pencil" />
															</button>
															<button
																className="cancel"
																onClick={() => deleteValue(value.id)}
															>
																<i className="fa-solid fa-trash" />
															</button>
														</td>
													</tr>
												)
											))}

											{creatingValue ? (
												<tr className="editing">
													<td data-label="Valor">
														<input
															placeholder="Valor"
															value={newValueName}
															onChange={(e) => setNewValueName(e.target.value)}
															autoFocus
														/>
													</td>

													<td data-label="Classe">
														<input
															placeholder={ICON_CLASS_PLACEHOLDER}
															value={newValueIcon}
															onChange={(e) => setNewValueIcon(e.target.value)}
														/>
													</td>

													<td className="lab-icon-cell" data-label="Ícone" />

													<td className="actions">
														<button className="confirm" onClick={createValue}>
															<i className="fa-solid fa-check" />
														</button>
														<button
															className="cancel"
															onClick={() => {
																setCreatingValue(false);
																setNewValueName("");
																setNewValueIcon("");
															}}
														>
															<i className="fa-solid fa-x" />
														</button>
													</td>
												</tr>
											) : (
												<tr className="lab-item-add-row" onClick={() => setCreatingValue(true)}>
													<td data-label="" style={{ gridColumn: "1 / -1" }}>
														<i className="fa-solid fa-plus" />
													</td>
												</tr>
											)}
										</tbody>
									</table>
								) : (
									<p className="lab-management-empty">Selecione uma ação para ver os valores.</p>
								)}
							</div>

						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
