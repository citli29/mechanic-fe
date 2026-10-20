import { useEffect, useRef, useState } from "react";
import api from "./../api/axios";
import { buildLabSummary } from "../utils/labSummary";

export const ServiceLab = ({ id, disabled, onSummaryChange }) => {

	const [labItems, setLabItems] = useState([]);
	const [labActionValues, setLabActionValues] = useState([]);

	const [tabledPropertiesByItem, setTabledPropertiesByItem] = useState({});
	const [labPropertyValuesByLabItem, setLabPropertyValuesByLabItem] = useState({});
	const [propertyInputs, setPropertyInputs] = useState({});
	const [editingPropertiesItemId, setEditingPropertiesItemId] = useState(null);

	const [adding, setAdding] = useState(false);

	const [items, setItems] = useState([]);
	const [selectedItemId, setSelectedItemId] = useState(null);

	const [quantity, setQuantity] = useState(1);
	const [submitting, setSubmitting] = useState(false);

	const [addingActionItemId, setAddingActionItemId] = useState(null);
	const [inlineActions, setInlineActions] = useState([]);
	// null = not creating; otherwise the name being typed for a new action.
	const [newActionName, setNewActionName] = useState(null);

	useEffect(() => { loadSummary(); }, [id]);

	// Every lab change reloads these two lists, so the service page's
	// generated text (above Descrição de Avaria) stays in sync.
	useEffect(() => {
		onSummaryChange?.(buildLabSummary(labItems, labActionValues, labPropertyValuesByLabItem));
	}, [labItems, labActionValues, labPropertyValuesByLabItem, onSummaryChange]);

	async function loadSummary() {
		try {
			const [labItemsResponse, labActionValuesResponse, labPropertyValuesResponse] = await Promise.all([
				api.get(`/services/${id}/lab_items`),
				api.get(`/services/${id}/lab_action_values`),
				api.get(`/services/${id}/lab_property_values`),
			]);

			// Grouped by item type (tabled item), oldest first within each.
			const labItemList = (labItemsResponse.data.lab_item_list || [])
				.slice()
				.sort((a, b) => a.t_item_id - b.t_item_id || a.id - b.id);
			setLabItems(labItemList);
			setLabActionValues(labActionValuesResponse.data.slav_list || []);

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

	const handleStart = () => {
		if (disabled) return;
		loadItems();
		setAdding(true);
	}

	const handleCancel = () => {
		setAdding(false);
		setSelectedItemId(null);
		setQuantity(1);
	}

	const toggleSelectedItem = (itemId) => {
		setSelectedItemId((prev) => (prev === itemId ? null : itemId));
		setQuantity(1);
	}

	const handleConfirm = async () => {
		if (disabled || submitting || !selectedItemId) return;

		const qty = Math.max(1, parseInt(quantity, 10) || 1);

		setSubmitting(true);

		try {
			// Just the item(s) — actions are added afterwards from each card.
			for (let i = 0; i < qty; i++) {
				await api.post(`/services/${id}/lab_items`, {
					t_item_id: selectedItemId,
				});
			}

			handleCancel();
			loadSummary();
		} catch (error) {
			console.error(error);
		} finally {
			setSubmitting(false);
		}
	}

	// Only the changed field is sent — the API leaves the others alone.
	const updateActionValue = async (lav, changes) => {
		if (disabled) return;
		try {
			await api.put(`/services/${id}/lab_action_values/${lav.slav_id}`, changes);
			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	const handleSaveNote = (lav, note) => {
		if ((note.trim() || null) === (lav.note || null)) return;
		updateActionValue(lav, { note });
	}

	const handleToggleDone = (lav) => updateActionValue(lav, { is_done: !lav.is_done });

	const handleDeleteActionValue = async (lav) => {
		if (disabled) return;
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
		if (disabled) return;

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
		if (disabled) return;
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
		if (disabled) return;
		setNewActionName(null);
		if (addingActionItemId === labItem.id) {
			setAddingActionItemId(null);
			setInlineActions([]);
			return;
		}

		setAddingActionItemId(labItem.id);

		try {
			const response = await api.get("/actions", { params: { t_item_id: labItem.t_item_id } });
			setInlineActions(response.data.action_list || []);
		} catch (error) {
			console.error(error);
			setInlineActions([]);
		}
	}

	// Tapping an action tile adds it straight away — no separate confirm.
	const handleConfirmAddAction = async (labItem, actionId) => {
		if (disabled || !actionId) return;

		try {
			await api.post(`/services/${id}/lab_action_values`, {
				l_item_id: labItem.id,
				t_action_id: actionId,
			});

			setAddingActionItemId(null);
			setInlineActions([]);
			setNewActionName(null);
			loadSummary();
		} catch (error) {
			console.error(error);
		}
	}

	// Creates the action for the item type (so every item of that type gets
	// it, same as in Gestão de Laboratório) and adds it to this item.
	const handleCreateAction = async (labItem) => {
		const name = (newActionName || "").trim();
		if (disabled || submitting || !name) return;

		setSubmitting(true);
		try {
			const response = await api.post("/actions", {
				t_item_id: labItem.t_item_id,
				name,
			});
			await handleConfirmAddAction(labItem, response.data.action.id);
		} catch (error) {
			console.error(error);
		} finally {
			setSubmitting(false);
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

	const inlineAddAction = (labItem, itemActionValues) => newActionName !== null ? (
		<div className="lab-inline-add-action">
			<input
				type="text"
				className="lab-new-action-input"
				placeholder="Nova ação..."
				maxLength={60}
				autoFocus
				value={newActionName}
				disabled={submitting}
				onChange={(e) => setNewActionName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleCreateAction(labItem);
					if (e.key === "Escape") setNewActionName(null);
				}}
			/>
			<button
				type="button"
				className="lab-action-tiles-confirm"
				title={`Criar ação para todos os itens "${labItem.item_name}" e adicionar`}
				disabled={submitting || !newActionName.trim()}
				onClick={() => handleCreateAction(labItem)}
			>
				<i className="fa-solid fa-check" />
			</button>
			<button
				type="button"
				className="lab-action-tiles-cancel"
				title="Cancelar"
				onClick={() => setNewActionName(null)}
			>
				<i className="fa-solid fa-xmark" />
			</button>
		</div>
	) : (
		<div className="lab-inline-add-action">
			<div className="lab-action-tiles">
				{inlineActions.map((action) => {
					const alreadyAdded = itemActionValues.some((lav) => lav.t_action_id === action.id);
					return (
						<button
							type="button"
							key={action.id}
							className="lab-action-tile"
							title={alreadyAdded ? "Já adicionada — adicionar outra vez" : "Adicionar ação"}
							disabled={disabled}
							onClick={() => handleConfirmAddAction(labItem, action.id)}
						>
							{action.i_class && <i className={action.i_class} />}
							{action.name}
						</button>
					);
				})}
				<button
					type="button"
					className="lab-action-tile is-new"
					title={`Criar uma nova ação para os itens "${labItem.item_name}"`}
					disabled={disabled}
					onClick={() => setNewActionName("")}
				>
					<i className="fa-solid fa-plus" />
				</button>
			</div>
		</div>
	);

	return (
		<>
			{/* One card ("area") per item, its actions listed inside it. */}
			<div className="lab-items">
				{labItems.map((labItem) => {
					const itemActionValues = actionValuesByLabItem[labItem.id] || [];
					const isAddingAction = addingActionItemId === labItem.id;

					const itemProperties = tabledPropertiesByItem[labItem.t_item_id] || [];
					const itemPropertyValues = labPropertyValuesByLabItem[labItem.id] || [];
					const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

					return (
						<div className="lab-item-card" key={labItem.id}>
							<div
								className="lab-item-card-header"
								title="Ver/editar propriedades do item"
								onClick={() => handleOpenPropertiesModal(labItem)}
							>
								<i className={`lab-item-card-icon ${labItem.item_i_class || "fa-solid fa-flask"}`} />
								<div className="lab-item-card-title">
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
								{!disabled && (
									<button
										type="button"
										className={`lab-item-card-add-action ${isAddingAction ? "is-active" : ""}`}
										title="Adicionar ação a este item"
										onClick={(e) => { e.stopPropagation(); handleToggleAddAction(labItem); }}
									>
										<i className="fa-solid fa-plus" /> Ação
									</button>
								)}
							</div>

							<div className="lab-item-card-actions">
								{itemActionValues.length === 0 && !isAddingAction && (
									<div className="lab-item-card-empty">Sem ações</div>
								)}

								{itemActionValues.map((lav) => (
									<div className={`lab-action-row ${lav.is_done ? "is-done" : ""}`} key={lav.id}>
										<LabDoneCheck lav={lav} disabled={disabled} onToggle={handleToggleDone} />
										<LabNote lav={lav} disabled={disabled} onSave={handleSaveNote} onDeleteAction={handleDeleteActionValue} />
									</div>
								))}
							</div>

							{isAddingAction && inlineAddAction(labItem, itemActionValues)}
						</div>
					);
				})}
			</div>

			{!adding ? (
				!disabled && (
					<div className="lab-add-item-row" title="Adicionar item" onClick={handleStart}>
						<i className="fa-solid fa-plus" /> Adicionar Item
					</div>
				)
			) : (
				<div className="lab-picker">
					<div className="lab-picker-section">
						<label>Item</label>
						<div className="lab-picker-list">
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

					<div className="lab-picker-side">
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

						<div className="lab-add-item-row" title="Cancelar" onClick={handleCancel}>
							<i className="fa-solid fa-xmark" /> Cancelar
						</div>
					</div>
				</div>
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
											disabled={disabled}
											onChange={(e) => handlePropertyInputChange(editingLabItem, property, e.target.value)}
											onBlur={() => handleSavePropertyValue(editingLabItem, property)}
										/>
									</div>
								);
							})}
						</div>

						<div className="lab-properties-modal-actions">
							<button type="button" className="cancel" title="Remover item, ações e propriedades associadas" disabled={disabled} onClick={() => handleDeleteLabItem(editingLabItem)}>
								<i className="fa-solid fa-trash" /> Remover Item
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function LabDoneCheck({ lav, disabled, onToggle }) {
	return (
		<label className={`lab-done-check ${lav.is_done ? "is-done" : ""}`} title={lav.is_done ? "Concluída" : "Por fazer"}>
			<input type="checkbox" checked={!!lav.is_done} disabled={disabled} onChange={() => onToggle(lav)} />
			<span>{lav.action_name}</span>
		</label>
	);
}

// The note row only shows when there's a note (or one is being written).
// With no note, the button next to the trash adds one; once there is a note,
// edit / confirm / cancel / delete sit inside the note field.
// Renders the button and the note row as separate grid cells of the action row.
function LabNote({ lav, disabled, onSave, onDeleteAction }) {
	const [note, setNote] = useState(lav.note || "");
	const [prevNote, setPrevNote] = useState(lav.note);
	const [editing, setEditing] = useState(false);
	const inputRef = useRef(null);

	// Picks up the saved value after a reload, without an effect.
	if (lav.note !== prevNote) {
		setPrevNote(lav.note);
		setNote(lav.note || "");
	}

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	const hasNote = !!lav.note;

	const handleConfirm = () => {
		onSave(lav, note);
		setEditing(false);
	}

	const handleCancel = () => {
		setNote(lav.note || "");
		setEditing(false);
	}

	const handleDelete = () => {
		setNote("");
		onSave(lav, "");
		setEditing(false);
	}

	const showAddNote = !disabled && !hasNote && !editing;

	return (
		<>
			{showAddNote && (
				<button type="button" className="lab-note-btn lab-collapsible" title="Adicionar nota" onClick={() => setEditing(true)}>
					<i className="fa-solid fa-note-sticky" />
				</button>
			)}
			<button
				type="button"
				className={`lab-delete-action-btn ${showAddNote ? "lab-collapsible" : ""}`}
				title="Remover esta ação"
				disabled={disabled}
				onClick={() => onDeleteAction(lav)}
			>
				<i className="fa-solid fa-trash" />
			</button>
			{showAddNote && (
				<LabMoreMenu items={[
					{ label: "Adicionar nota", icon: "fa-solid fa-note-sticky", onClick: () => setEditing(true) },
					{ label: "Remover ação", icon: "fa-solid fa-trash", onClick: () => onDeleteAction(lav), danger: true },
				]} />
			)}

			{(hasNote || editing) && (
				<div className="lab-note-field">
					<input
						ref={inputRef}
						type="text"
						className={`lab-note-input ${editing ? "" : "is-locked"}`}
						placeholder="Nota..."
						maxLength={255}
						value={note}
						readOnly={!editing}
						onChange={(e) => setNote(e.target.value)}
						onKeyDown={(e) => {
							if (!editing) return;
							if (e.key === "Enter") handleConfirm();
							if (e.key === "Escape") handleCancel();
						}}
					/>
					{!disabled && (
						<span className="lab-note-btns">
							{editing ? (
								<>
									<button type="button" className="lab-note-btn is-confirm" title="Confirmar nota" onClick={handleConfirm}>
										<i className="fa-solid fa-check" />
									</button>
									<button type="button" className="lab-note-btn is-cancel" title="Cancelar edição" onClick={handleCancel}>
										<i className="fa-solid fa-xmark" />
									</button>
								</>
							) : (
								<>
									<button type="button" className="lab-note-btn lab-collapsible" title="Editar nota" onClick={() => setEditing(true)}>
										<i className="fa-solid fa-pen" />
									</button>
									<button type="button" className="lab-note-btn is-delete lab-collapsible" title="Apagar nota" onClick={handleDelete}>
										<i className="fa-solid fa-xmark" />
									</button>
									<LabMoreMenu items={[
										{ label: "Editar nota", icon: "fa-solid fa-pen", onClick: () => setEditing(true) },
										{ label: "Apagar nota", icon: "fa-solid fa-xmark", onClick: handleDelete, danger: true },
									]} />
								</>
							)}
						</span>
					)}
				</div>
			)}
		</>
	);
}

// Phone only (see CSS): a vertical "..." that stands in for a group of
// buttons marked lab-collapsible, listing them in a small popup.
function LabMoreMenu({ items }) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		const close = (e) => {
			if (!menuRef.current?.contains(e.target)) setOpen(false);
		};
		document.addEventListener("pointerdown", close);
		return () => document.removeEventListener("pointerdown", close);
	}, [open]);

	return (
		<span className="lab-more-menu" ref={menuRef}>
			<button type="button" className="lab-more-btn" title="Mais opções" onClick={() => setOpen((prev) => !prev)}>
				<i className="fa-solid fa-ellipsis-vertical" />
			</button>
			{open && (
				<span className="lab-more-popup">
					{items.map((item) => (
						<button
							type="button"
							key={item.label}
							className={item.danger ? "is-danger" : ""}
							onClick={() => { setOpen(false); item.onClick(); }}
						>
							<i className={item.icon} /> {item.label}
						</button>
					))}
				</span>
			)}
		</span>
	);
}
