import { useEffect, useState } from "react";
import api from "./../api/axios";

export const ServiceLab = ({ id, disabled }) => {

	const [labItems, setLabItems] = useState([]);
	const [labActionValues, setLabActionValues] = useState([]);
	const [tabledValuesByAction, setTabledValuesByAction] = useState({});

	const [tabledPropertiesByItem, setTabledPropertiesByItem] = useState({});
	const [labPropertyValuesByLabItem, setLabPropertyValuesByLabItem] = useState({});
	const [propertyInputs, setPropertyInputs] = useState({});
	const [editingPropertiesItemId, setEditingPropertiesItemId] = useState(null);

	const [adding, setAdding] = useState(false);

	const [items, setItems] = useState([]);
	const [selectedItemId, setSelectedItemId] = useState(null);

	const [actions, setActions] = useState([]);
	const [selectedActionIds, setSelectedActionIds] = useState([]);
	const [quantity, setQuantity] = useState(1);
	const [submitting, setSubmitting] = useState(false);

	const [customValueIds, setCustomValueIds] = useState({});
	const [customInputs, setCustomInputs] = useState({});
	const [customEditingIds, setCustomEditingIds] = useState({});

	const [addingActionItemId, setAddingActionItemId] = useState(null);
	const [inlineActions, setInlineActions] = useState([]);
	const [inlineActionId, setInlineActionId] = useState("");

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);

	useEffect(() => { loadSummary(); }, [id]);

	async function loadSummary() {
		try {
			const [labItemsResponse, labActionValuesResponse, tabledValuesResponse, labPropertyValuesResponse] = await Promise.all([
				api.get(`/services/${id}/lab_items`),
				api.get(`/services/${id}/lab_action_values`),
				api.get("/action_tabled_values"),
				api.get(`/services/${id}/lab_property_values`),
			]);

			const labItemList = labItemsResponse.data.lab_item_list || [];
			setLabItems(labItemList);
			setLabActionValues(labActionValuesResponse.data.slav_list || []);

			const grouped = {};
			(tabledValuesResponse.data.action_tabled_value_list || []).forEach((tv) => {
				if (!grouped[tv.t_action_id]) grouped[tv.t_action_id] = [];
				grouped[tv.t_action_id].push(tv);
			});
			setTabledValuesByAction(grouped);

			const propertyValuesGrouped = {};
			(labPropertyValuesResponse.data.slpv_list || []).forEach((lpv) => {
				if (!propertyValuesGrouped[lpv.l_item_id]) propertyValuesGrouped[lpv.l_item_id] = [];
				propertyValuesGrouped[lpv.l_item_id].push(lpv);
			});
			setLabPropertyValuesByLabItem(propertyValuesGrouped);

			const uniqueItemIds = [...new Set(labItemList.map((li) => li.t_item_id).filter(Boolean))];
			const propertyResponses = await Promise.all(
				uniqueItemIds.map((t_item_id) => api.get("/properties", { params: { t_item_id } }))
			);

			const propertiesGrouped = {};
			uniqueItemIds.forEach((t_item_id, index) => {
				propertiesGrouped[t_item_id] = propertyResponses[index].data.property_list || [];
			});
			setTabledPropertiesByItem(propertiesGrouped);
		} catch (error) {
			console.error(error);
			setLabItems([]);
			setLabActionValues([]);
			setTabledValuesByAction({});
			setLabPropertyValuesByLabItem({});
			setTabledPropertiesByItem({});
		}
	}

	const loadItems = async () => {
		try {
			const response = await api.get("/items");
			setItems(response.data.item_list || []);
		} catch (error) {
			console.error(error);
			setItems([]);
		}
	}

	const loadActions = async (itemId) => {
		try {
			const response = await api.get("/actions", { params: { t_item_id: itemId } });
			setActions(response.data.action_list || []);
		} catch (error) {
			console.error(error);
			setActions([]);
		}
	}

	const handleStart = () => {
		if (disabled) return;
		loadItems();
		setAdding(true);
	}

	const handleCancel = () => {
		setAdding(false);
		setSelectedItemId(null);
		setSelectedActionIds([]);
		setActions([]);
		setQuantity(1);
	}

	const toggleSelectedItem = (itemId) => {
		const alreadySelected = selectedItemId === itemId;

		setSelectedItemId(alreadySelected ? null : itemId);
		setSelectedActionIds([]);
		setQuantity(1);

		if (alreadySelected) {
			setActions([]);
		} else {
			loadActions(itemId);
		}
	}

	const toggleSelectedAction = (actionId) => {
		setSelectedActionIds((prev) => (
			prev.includes(actionId)
				? prev.filter((id) => id !== actionId)
				: [...prev, actionId]
		));
	}

	const selectedActions = selectedActionIds
		.map((actionId) => actions.find((action) => action.id === actionId))
		.filter(Boolean);

	const handleConfirm = async () => {
		if (submitting || !selectedItemId) return;

		const qty = Math.max(1, parseInt(quantity, 10) || 1);

		setSubmitting(true);

		try {
			for (let i = 0; i < qty; i++) {
				const itemResponse = await api.post(`/services/${id}/lab_items`, {
					t_item_id: selectedItemId,
				});

				const labItemId = itemResponse.data.lab_item.id;

				for (const action of selectedActions) {
					await api.post(`/services/${id}/lab_action_values`, {
						l_item_id: labItemId,
						t_action_id: action.id,
					});
				}
			}

			handleCancel();
			loadSummary();
		} catch (error) {
			console.error(error);
		} finally {
			setSubmitting(false);
		}
	}

	const handleSelectTabledValue = async (lav, tabledValueId) => {
		try {
			await api.put(`/services/${id}/lab_action_values/${lav.slav_id}`, {
				t_action_id: lav.t_action_id,
				t_action_value_id: tabledValueId || null,
				value: null,
			});

			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleSaveCustomValue = async (lav, value) => {
		try {
			await api.put(`/services/${id}/lab_action_values/${lav.slav_id}`, {
				t_action_id: lav.t_action_id,
				t_action_value_id: null,
				value: value || null,
			});

			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleSelectChange = (lav, value) => {
		if (value === "__outro__") {
			setCustomValueIds((prev) => ({ ...prev, [lav.slav_id]: true }));
			setCustomInputs((prev) => ({ ...prev, [lav.slav_id]: lav.value || "" }));
			setCustomEditingIds((prev) => ({ ...prev, [lav.slav_id]: true }));
			return;
		}

		handleSelectTabledValue(lav, value);
	}

	const handleCustomInputChange = (lav, text) => {
		setCustomInputs((prev) => ({ ...prev, [lav.slav_id]: text }));
	}

	const handleSaveCustomValueClick = async (lav) => {
		await handleSaveCustomValue(lav, customInputs[lav.slav_id] || "");
		setCustomEditingIds((prev) => ({ ...prev, [lav.slav_id]: false }));
	}

	const handleStartEditCustomValue = (lav) => {
		setCustomEditingIds((prev) => ({ ...prev, [lav.slav_id]: true }));
	}

	const handleCancelCustomValue = async (lav) => {
		setCustomValueIds((prev) => ({ ...prev, [lav.slav_id]: false }));

		setCustomEditingIds((prev) => {
			const next = { ...prev };
			delete next[lav.slav_id];
			return next;
		});

		if (!lav.value) return;

		try {
			await api.put(`/services/${id}/lab_action_values/${lav.slav_id}`, {
				t_action_id: lav.t_action_id,
				t_action_value_id: null,
				value: null,
			});

			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleDeleteActionValue = async (lav) => {
		try {
			await api.delete(`/services/${id}/lab_action_values/${lav.slav_id}`);
			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handlePropertyInputChange = (labItem, property, text) => {
		setPropertyInputs((prev) => ({ ...prev, [`${labItem.id}-${property.id}`]: text }));
	}

	const handleSavePropertyValue = async (labItem, property) => {
		const key = `${labItem.id}-${property.id}`;

		if (propertyInputs[key] === undefined) return;

		const existing = (labPropertyValuesByLabItem[labItem.id] || []).find((lpv) => lpv.property_id === property.id);

		try {
			if (existing) {
				await api.put(`/services/${id}/lab_property_values/${existing.id}`, {
					value: propertyInputs[key] || null,
				});
			} else {
				await api.post(`/services/${id}/lab_property_values`, {
					l_item_id: labItem.id,
					property_id: property.id,
					value: propertyInputs[key] || null,
				});
			}

			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleOpenPropertiesModal = (labItem) => {
		setEditingPropertiesItemId(labItem.id);
	}

	const handleClosePropertiesModal = () => {
		setEditingPropertiesItemId(null);
	}

	const handleDeleteLabItem = async (labItem) => {
		try {
			await api.delete(`/services/${id}/lab_items/${labItem.id}`);

			setPropertyInputs((prev) => {
				const next = { ...prev };
				Object.keys(next)
					.filter((key) => key.startsWith(`${labItem.id}-`))
					.forEach((key) => delete next[key]);
				return next;
			});

			handleClosePropertiesModal();
			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleToggleAddAction = async (labItem) => {
		if (addingActionItemId === labItem.id) {
			setAddingActionItemId(null);
			setInlineActions([]);
			setInlineActionId("");
			return;
		}

		setAddingActionItemId(labItem.id);
		setInlineActionId("");

		try {
			const response = await api.get("/actions", { params: { t_item_id: labItem.t_item_id } });
			setInlineActions(response.data.action_list || []);
		} catch (error) {
			console.error(error);
			setInlineActions([]);
		}
	}

	const handleConfirmAddAction = async (labItem) => {
		if (!inlineActionId) return;

		try {
			await api.post(`/services/${id}/lab_action_values`, {
				l_item_id: labItem.id,
				t_action_id: inlineActionId,
			});

			setAddingActionItemId(null);
			setInlineActions([]);
			setInlineActionId("");
			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const actionValuesByLabItem = {};
	labActionValues.forEach((lav) => {
		if (!actionValuesByLabItem[lav.l_item_id]) actionValuesByLabItem[lav.l_item_id] = [];
		actionValuesByLabItem[lav.l_item_id].push(lav);
	});

	const editingLabItem = labItems.find((li) => li.id === editingPropertiesItemId);
	const editingProperties = editingLabItem ? (tabledPropertiesByItem[editingLabItem.t_item_id] || []) : [];
	const editingPropertyValues = editingLabItem ? (labPropertyValuesByLabItem[editingLabItem.id] || []) : [];

	return (
		<>
			{isMobile ? (
				<div className="lab-mobile-list">
					{labItems.map((labItem) => {
						const itemActionValues = actionValuesByLabItem[labItem.id] || [];
						const isAddingAction = addingActionItemId === labItem.id;

						const itemProperties = tabledPropertiesByItem[labItem.t_item_id] || [];
						const itemPropertyValues = labPropertyValuesByLabItem[labItem.id] || [];
						const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

						return (
							<div className="lab-mobile-item" key={labItem.id}>
								<div
									className="lab-mobile-item-header"
									title="Ver/editar propriedades do item"
									onClick={() => handleOpenPropertiesModal(labItem)}
								>
									<div>
										<div className="lab-item-name">{labItem.item_name}</div>
										{itemPrimaryProperties.length > 0 && (
											<div className="lab-item-properties-summary">
												{itemPrimaryProperties.map((property) => {
													const lpv = itemPropertyValues.find((v) => v.property_id === property.id);
													return `${property.name}: ${lpv?.value || "—"}`;
												}).join(" · ")}
											</div>
										)}
									</div>
								</div>

								{itemActionValues.length === 0 && !isAddingAction && (
									<div className="lab-mobile-action-row">
										<span>—</span>
									</div>
								)}

								{itemActionValues.map((lav) => {
									const isCustomValue = customValueIds[lav.slav_id] !== undefined
										? customValueIds[lav.slav_id]
										: !!lav.value;
									const isEditingCustomValue = !!customEditingIds[lav.slav_id];
									const customInputValue = customInputs[lav.slav_id] !== undefined
										? customInputs[lav.slav_id]
										: (lav.value || "");

									return (
										<div className="lab-mobile-action-row" key={lav.id}>
											<div className="lab-mobile-action-row-main">
												<span>{lav.action_name}</span>
												<button type="button" className="lab-delete-action-btn" title="Remover esta ação" onClick={() => handleDeleteActionValue(lav)}>
													<i className="fa-solid fa-trash" />
												</button>
											</div>

											<div className="lab-mobile-action-value">
												{isCustomValue ? (
													<div className="lab-custom-value">
														<input
															type="text"
															autoFocus={isEditingCustomValue}
															disabled={!isEditingCustomValue}
															value={customInputValue}
															onChange={(e) => handleCustomInputChange(lav, e.target.value)}
														/>
														{isEditingCustomValue ? (
															<button
																type="button"
																className="confirm lab-custom-value-save"
																title="Guardar valor"
																onClick={() => handleSaveCustomValueClick(lav)}
															>
																<i className="fa-solid fa-check" />
															</button>
														) : (
															<button
																type="button"
																className="lab-custom-value-edit"
																title="Editar valor"
																onClick={() => handleStartEditCustomValue(lav)}
															>
																<i className="fa-solid fa-pen" />
															</button>
														)}
														<button
															type="button"
															className="lab-custom-value-cancel"
															title="Remover valor personalizado"
															onClick={() => handleCancelCustomValue(lav)}
														>
															<i className="fa-solid fa-xmark" />
														</button>
													</div>
												) : (
													<select
														value={lav.t_action_value_id || ""}
														onChange={(e) => handleSelectChange(lav, e.target.value)}
													>
														<option value="">—</option>
														{(tabledValuesByAction[lav.t_action_id] || []).map((tv) => (
															<option key={tv.id} value={tv.id}>{tv.value}</option>
														))}
														<option value="__outro__">Outro</option>
													</select>
												)}
											</div>
										</div>
									);
								})}

								{isAddingAction ? (
									<div className="lab-mobile-inline-add-action">
										<select value={inlineActionId} onChange={(e) => setInlineActionId(e.target.value)}>
											<option value="">Selecionar ação...</option>
											{inlineActions.map((action) => (
												<option key={action.id} value={action.id}>{action.name}</option>
											))}
										</select>
										<button
											type="button"
											className="confirm"
											title="Confirmar ação"
											disabled={!inlineActionId}
											onClick={() => handleConfirmAddAction(labItem)}
										>
											<i className="fa-solid fa-check" />
										</button>
										<button
											type="button"
											className="cancel"
											title="Cancelar"
											onClick={() => handleToggleAddAction(labItem)}
										>
											<i className="fa-solid fa-xmark" />
										</button>
									</div>
								) : (
									<div
										className="lab-mobile-add-action-row"
										title="Adicionar ação a este item"
										onClick={() => handleToggleAddAction(labItem)}
									>
										<i className="fa-solid fa-plus" />
									</div>
								)}
							</div>
						);
					})}

					{!adding ? (
						!disabled && (
							<div className="lab-mobile-add-item-row" title="Adicionar item" onClick={handleStart}>
								<i className="fa-solid fa-plus" /> Adicionar Item
							</div>
						)
					) : (
						<div className="lab-mobile-picker">
							<div className="lab-mobile-picker-section">
								<label>Item</label>
								<div className="lab-mobile-picker-list">
									{items.map((item) => (
										<div
											key={item.id}
											className={`lab-row ${selectedItemId === item.id ? "selected" : ""}`}
											onClick={() => toggleSelectedItem(item.id)}
										>
											{item.name}
										</div>
									))}
								</div>
							</div>

							{selectedItemId && (
								<div className="lab-mobile-picker-section">
									<label>Ação</label>
									<div className="lab-mobile-picker-list">
										{actions.map((action) => (
											<div
												key={action.id}
												className={`lab-row ${selectedActionIds.includes(action.id) ? "selected" : ""}`}
												onClick={() => toggleSelectedAction(action.id)}
											>
												{action.name}
											</div>
										))}
									</div>
								</div>
							)}

							{selectedItemId && (
								<div className="lab-row-confirm-controls">
									<label>Quantidade:</label>
									<input
										type="number"
										min="1"
										value={quantity}
										onChange={(e) => setQuantity(e.target.value)}
									/>
									<button type="button" className="confirm" title="Confirmar" disabled={submitting} onClick={handleConfirm}>
										<i className="fa-solid fa-check" />
									</button>
								</div>
							)}

							<div className="lab-mobile-add-item-row" title="Cancelar" onClick={handleCancel}>
								<i className="fa-solid fa-xmark" />
							</div>
						</div>
					)}
				</div>
			) : (
			<table className="lab-actions-table">
				<thead>
					<tr>
						<th>Item</th>
						<th></th>
						<th>Ação</th>
						<th>Valor</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{labItems.map((labItem) => {
						const itemActionValues = actionValuesByLabItem[labItem.id] || [];
						const isAddingAction = addingActionItemId === labItem.id;
						const totalRows = itemActionValues.length + (isAddingAction ? 1 : (itemActionValues.length === 0 ? 1 : 0));
						const rows = [];

						const itemProperties = tabledPropertiesByItem[labItem.t_item_id] || [];
						const itemPropertyValues = labPropertyValuesByLabItem[labItem.id] || [];
						const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

						const itemNameCell = (
							<td rowSpan={totalRows} className="lab-item-name-cell" title="Ver/editar propriedades do item" onClick={() => handleOpenPropertiesModal(labItem)}>
								<div className="lab-item-name">{labItem.item_name}</div>
								{itemPrimaryProperties.length > 0 && (
									<div className="lab-item-properties-summary">
										{itemPrimaryProperties.map((property) => {
											const lpv = itemPropertyValues.find((v) => v.property_id === property.id);
											return `${property.name}: ${lpv?.value || "—"}`;
										}).join(" · ")}
									</div>
								)}
							</td>
						);

						itemActionValues.forEach((lav, index) => {
							const isCustomValue = customValueIds[lav.slav_id] !== undefined
								? customValueIds[lav.slav_id]
								: !!lav.value;
							const isEditingCustomValue = !!customEditingIds[lav.slav_id];
							const customInputValue = customInputs[lav.slav_id] !== undefined
								? customInputs[lav.slav_id]
								: (lav.value || "");

							rows.push(
								<tr key={lav.id}>
									{index === 0 && itemNameCell}
									{index === 0 && (
										<td rowSpan={totalRows} className="lab-add-action-cell">
											<button type="button" className="lab-add-action-btn" title="Adicionar ação a este item" onClick={() => handleToggleAddAction(labItem)}>
												<i className="fa-solid fa-plus" />
											</button>
										</td>
									)}
									<td>{lav.action_name}</td>
									<td className="lab-value-cell">
										{isCustomValue ? (
											<div className="lab-custom-value">
												<input
													type="text"
													autoFocus={isEditingCustomValue}
													disabled={!isEditingCustomValue}
													value={customInputValue}
													onChange={(e) => handleCustomInputChange(lav, e.target.value)}
												/>
												{isEditingCustomValue ? (
													<button
														type="button"
														className="confirm lab-custom-value-save"
														title="Guardar valor"
														onClick={() => handleSaveCustomValueClick(lav)}
													>
														<i className="fa-solid fa-check" />
													</button>
												) : (
													<button
														type="button"
														className="lab-custom-value-edit"
														title="Editar valor"
														onClick={() => handleStartEditCustomValue(lav)}
													>
														<i className="fa-solid fa-pen" />
													</button>
												)}
												<button
													type="button"
													className="lab-custom-value-cancel"
													title="Remover valor personalizado"
													onClick={() => handleCancelCustomValue(lav)}
												>
													<i className="fa-solid fa-xmark" />
												</button>
											</div>
										) : (
											<select
												value={lav.t_action_value_id || ""}
												onChange={(e) => handleSelectChange(lav, e.target.value)}
											>
												<option value="">—</option>
												{(tabledValuesByAction[lav.t_action_id] || []).map((tv) => (
													<option key={tv.id} value={tv.id}>{tv.value}</option>
												))}
												<option value="__outro__">Outro</option>
											</select>
										)}
									</td>
									<td className="lab-delete-action-cell">
										<button type="button" className="lab-delete-action-btn" title="Remover esta ação" onClick={() => handleDeleteActionValue(lav)}>
											<i className="fa-solid fa-trash" />
										</button>
									</td>
								</tr>
							);
						});

						if (itemActionValues.length === 0 && !isAddingAction) {
							rows.push(
								<tr key={`${labItem.id}-empty`}>
									{itemNameCell}
									<td className="lab-add-action-cell">
										<button type="button" className="lab-add-action-btn" title="Adicionar ação a este item" onClick={() => handleToggleAddAction(labItem)}>
											<i className="fa-solid fa-plus" />
										</button>
									</td>
									<td>—</td>
									<td>—</td>
									<td></td>
								</tr>
							);
						}

						if (isAddingAction) {
							rows.push(
								<tr key={`${labItem.id}-add-action`}>
									{itemActionValues.length === 0 && itemNameCell}
									{itemActionValues.length === 0 && (
										<td rowSpan={totalRows} className="lab-add-action-cell">
											<button type="button" className="lab-add-action-btn" title="Adicionar ação a este item" onClick={() => handleToggleAddAction(labItem)}>
												<i className="fa-solid fa-plus" />
											</button>
										</td>
									)}
									<td className="lab-inline-add-action">
										<div className="lab-inline-add-action-controls">
											<select value={inlineActionId} onChange={(e) => setInlineActionId(e.target.value)}>
												<option value="">Selecionar ação...</option>
												{inlineActions.map((action) => (
													<option key={action.id} value={action.id}>{action.name}</option>
												))}
											</select>
											<button
												type="button"
												className="confirm"
												title="Confirmar ação"
												disabled={!inlineActionId}
												onClick={() => handleConfirmAddAction(labItem)}
											>
												<i className="fa-solid fa-check" />
											</button>
											<button
												type="button"
												className="cancel"
												title="Cancelar"
												onClick={() => handleToggleAddAction(labItem)}
											>
												<i className="fa-solid fa-xmark" />
											</button>
										</div>
									</td>
									<td>—</td>
									<td></td>
								</tr>
							);
						}

						return rows;
					})}

					{!adding ? (
						!disabled && (
							<tr className="add-row" title="Adicionar item" onClick={handleStart}>
								<td colSpan={5}>
									<i className="fa-solid fa-plus" />
								</td>
							</tr>
						)
					) : (
						<>
							<tr>
								<td colSpan={5} className="lab-picker-cell" style={{ padding: "0" }}>
									<div className="lab-actions-columns">
										<div className="lab-actions-column">
											{items.map((item) => (
												<div
													key={item.id}
													className={`lab-row ${selectedItemId === item.id ? "selected" : ""}`}
													onClick={() => toggleSelectedItem(item.id)}
												>
													{item.name}
												</div>
											))}
										</div>

										<div className="lab-actions-column">
											{actions.map((action) => (
												<div
													key={action.id}
													className={`lab-row ${selectedActionIds.includes(action.id) ? "selected" : ""}`}
													onClick={() => toggleSelectedAction(action.id)}
												>
													{action.name}
												</div>
											))}
										</div>

										<div className="lab-actions-column lab-actions-column-confirm">
											{selectedItemId && (
												<div className="lab-row-confirm-controls">
													<label>Quantidade:</label>
													<input
														type="number"
														min="1"
														value={quantity}
														onChange={(e) => setQuantity(e.target.value)}
													/>
													<button type="button" className="confirm" title="Confirmar" disabled={submitting} onClick={handleConfirm}>
														<i className="fa-solid fa-check" />
													</button>
												</div>
											)}
										</div>
									</div>
								</td>
							</tr>
							<tr className="add-row" title="Cancelar" onClick={handleCancel}>
								<td colSpan={5}>
									<i className="fa-solid fa-xmark" />
								</td>
							</tr>
						</>
					)}
				</tbody>
			</table>
			)}

			{editingLabItem && (
				<div className="lab-properties-backdrop" onClick={handleClosePropertiesModal}>
					<div className="lab-properties-modal" onClick={(e) => e.stopPropagation()}>
						<div className="lab-properties-modal-header">
							<h2>{editingLabItem.item_name}</h2>
							<button type="button" className="cancel" title="Fechar" onClick={handleClosePropertiesModal}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<div className="lab-properties-modal-fields">
							{editingProperties.length === 0 && (
								<p className="lab-properties-modal-empty">Este item não tem propriedades.</p>
							)}

							{editingProperties.map((property) => {
								const lpv = editingPropertyValues.find((v) => v.property_id === property.id);
								const key = `${editingLabItem.id}-${property.id}`;
								const value = propertyInputs[key] !== undefined ? propertyInputs[key] : (lpv?.value || "");

								return (
									<div className="lab-properties-modal-field" key={property.id}>
										<label>{property.name}</label>
										<input
											type="text"
											value={value}
											onChange={(e) => handlePropertyInputChange(editingLabItem, property, e.target.value)}
											onBlur={() => handleSavePropertyValue(editingLabItem, property)}
										/>
									</div>
								);
							})}
						</div>

						<div className="lab-properties-modal-actions">
							<button type="button" className="cancel" title="Remover item, ações e propriedades associadas" onClick={() => handleDeleteLabItem(editingLabItem)}>
								<i className="fa-solid fa-trash" /> Remover Item
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
