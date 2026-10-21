import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "./../api/axios";
import { buildLabSummary } from "../utils/labSummary";
import "./Style/ServiceLab.css";

// Left-edge stripe colour per item type (by tabled item id).
const LAB_TYPE_COLORS = ["#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

// Where the lab's records live. A real service talks to the API; a draft
// (Novo Serviço, before the service exists) keeps them in memory with
// made-up ids, in the same shape the API returns, and hands them to
// onDraftChange — the page creates them for real once the service is saved.
function createApiStore(serviceId) {
	const base = `/services/${serviceId}`;
	return {
		async list() {
			const [labItemsResponse, labActionValuesResponse, labPropertyValuesResponse] = await Promise.all([
				api.get(`${base}/lab_items`),
				api.get(`${base}/lab_action_values`),
				api.get(`${base}/lab_property_values`),
			]);
			return {
				labItems: labItemsResponse.data.lab_item_list || [],
				labActionValues: labActionValuesResponse.data.slav_list || [],
				labPropertyValues: labPropertyValuesResponse.data.slpv_list || [],
			};
		},
		async addItem(item) {
			const response = await api.post(`${base}/lab_items`, { t_item_id: item.id });
			return response.data.lab_item;
		},
		addActionValue: (labItem, action) => api.post(`${base}/lab_action_values`, { l_item_id: labItem.id, t_action_id: action.id }),
		// Only the changed field is sent — the API leaves the others alone.
		updateActionValue: (lav, changes) => api.put(`${base}/lab_action_values/${lav.slav_id}`, changes),
		deleteActionValue: (lav) => api.delete(`${base}/lab_action_values/${lav.slav_id}`),
		savePropertyValue: (labItem, property, existing, value) => (existing
			? api.put(`${base}/lab_property_values/${existing.id}`, { value })
			: api.post(`${base}/lab_property_values`, { l_item_id: labItem.id, property_id: property.id, value })),
		deleteItem: (labItem) => api.delete(`${base}/lab_items/${labItem.id}`),
	};
}

function createDraftStore() {
	const data = { labItems: [], labActionValues: [], labPropertyValues: [] };
	let nextId = 1;
	return {
		async list() {
			return {
				labItems: [...data.labItems],
				labActionValues: [...data.labActionValues],
				labPropertyValues: [...data.labPropertyValues],
			};
		},
		async addItem(item) {
			const labItem = { id: nextId++, t_item_id: item.id, item_name: item.name, item_i_class: item.i_class };
			data.labItems.push(labItem);
			return labItem;
		},
		async addActionValue(labItem, action) {
			const id = nextId++;
			data.labActionValues.push({
				id, slav_id: id, l_item_id: labItem.id, t_action_id: action.id,
				action_name: action.name, action_i_class: action.i_class, note: null, is_done: 0,
			});
		},
		async updateActionValue(lav, changes) {
			data.labActionValues = data.labActionValues.map((v) => (v.id === lav.id ? { ...v, ...changes } : v));
		},
		async deleteActionValue(lav) {
			data.labActionValues = data.labActionValues.filter((v) => v.id !== lav.id);
		},
		async savePropertyValue(labItem, property, existing, value) {
			if (existing) {
				data.labPropertyValues = data.labPropertyValues.map((v) => (v.id === existing.id ? { ...v, value } : v));
			} else {
				data.labPropertyValues.push({ id: nextId++, l_item_id: labItem.id, property_id: property.id, property_name: property.name, value });
			}
		},
		async deleteItem(labItem) {
			data.labItems = data.labItems.filter((li) => li.id !== labItem.id);
			data.labActionValues = data.labActionValues.filter((v) => v.l_item_id !== labItem.id);
			data.labPropertyValues = data.labPropertyValues.filter((v) => v.l_item_id !== labItem.id);
		},
	};
}

// `draft`: Novo Serviço — nothing is saved yet (see createDraftStore), and
// actions have no done check since nothing can be done before the service exists.
export const ServiceLab = ({ id, disabled, onSummaryChange, draft = false, onDraftChange }) => {

	const [draftStore] = useState(createDraftStore);
	const apiStore = useMemo(() => createApiStore(id), [id]);
	const store = draft ? draftStore : apiStore;

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
	// Actions of the picked item type, and the ones ticked to be added to
	// every new item straight away ("4x Injetor" with "Teste").
	const [pickerActions, setPickerActions] = useState([]);
	const [pickerActionIds, setPickerActionIds] = useState([]);
	// null = not creating; otherwise the name typed for a new action there.
	const [pickerNewActionName, setPickerNewActionName] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	// Preset note texts per action (Gestão de Laboratório → Valores). Only
	// copied into the note when picked, never referenced.
	const [presetsByAction, setPresetsByAction] = useState({});

	const [addingActionItemId, setAddingActionItemId] = useState(null);
	const [inlineActions, setInlineActions] = useState([]);
	// null = not creating; otherwise the name being typed for a new action.
	const [newActionName, setNewActionName] = useState(null);

	// The item / card the actions are being fetched for right now, so a slow
	// response for an earlier pick can't fill the list with another type's actions.
	const pickerItemIdRef = useRef(null);
	const addingActionItemIdRef = useRef(null);

	useEffect(() => { loadSummary(); }, [id]);

	useEffect(() => {
		if (disabled) return;
		api.get("/action_tabled_values")
			.then((response) => {
				const grouped = {};
				(response.data.action_tabled_value_list || []).forEach((preset) => {
					if (!grouped[preset.t_action_id]) grouped[preset.t_action_id] = [];
					grouped[preset.t_action_id].push(preset);
				});
				setPresetsByAction(grouped);
			})
			.catch((error) => console.error(error));
	}, [disabled]);

	// ?lab_item=<id> (from Gestão de Laboratório's search): once the items
	// are in, scroll to that card and flash it. The param is then dropped,
	// so a refresh doesn't flash it again.
	const [searchParams, setSearchParams] = useSearchParams();
	const targetLabItemId = draft ? null : Number(searchParams.get("lab_item")) || null;
	const [highlightedItemId, setHighlightedItemId] = useState(null);

	useEffect(() => {
		if (!targetLabItemId || !labItems.some((li) => li.id === targetLabItemId)) return;

		// After the rest of the page has laid out, or the scroll lands short.
		setTimeout(() => {
			document.getElementById(`lab-item-${targetLabItemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 300);
		setHighlightedItemId(targetLabItemId);
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("lab_item");
			return next;
		}, { replace: true });
	}, [targetLabItemId, labItems]);

	useEffect(() => {
		if (!highlightedItemId) return;
		const timer = setTimeout(() => setHighlightedItemId(null), 5000);
		return () => clearTimeout(timer);
	}, [highlightedItemId]);

	// Every lab change reloads these two lists, so the service page's
	// generated text (above Descrição de Avaria) stays in sync.
	useEffect(() => {
		onSummaryChange?.(buildLabSummary(labItems, labActionValues, labPropertyValuesByLabItem));
	}, [labItems, labActionValues, labPropertyValuesByLabItem, onSummaryChange]);

	async function loadSummary() {
		if (!draft && !id) return;
		try {
			const lab = await store.list();
			if (draft) onDraftChange?.(lab);

			// Grouped by item type (tabled item), oldest first within each.
			const labItemList = lab.labItems
				.slice()
				.sort((a, b) => a.t_item_id - b.t_item_id || a.id - b.id);
			setLabItems(labItemList);
			setLabActionValues(lab.labActionValues);

			const propertyValuesGrouped = {};
			lab.labPropertyValues.forEach((lpv) => {
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
		pickerItemIdRef.current = null;
		setSelectedItemId(null);
		setQuantity(1);
		setPickerActions([]);
		setPickerActionIds([]);
		setPickerNewActionName(null);
	}

	const toggleSelectedItem = async (itemId) => {
		const nextId = selectedItemId === itemId ? null : itemId;
		pickerItemIdRef.current = nextId;
		setSelectedItemId(nextId);
		setQuantity(1);
		setPickerActions([]);
		setPickerActionIds([]);
		setPickerNewActionName(null);
		if (!nextId) return;

		try {
			const response = await api.get("/actions", { params: { t_item_id: nextId } });
			// Another item was picked meanwhile — these actions aren't its.
			if (pickerItemIdRef.current !== nextId) return;
			setPickerActions(response.data.action_list || []);
		} catch (error) {
			console.error(error);
		}
	}

	const togglePickerAction = (actionId) => {
		setPickerActionIds((prev) => (
			prev.includes(actionId) ? prev.filter((x) => x !== actionId) : [...prev, actionId]
		));
	}

	// Only creates the action for the item type (every item of that type
	// gets it) and leaves it ticked — it's added to the new items on confirm.
	const handleCreatePickerAction = async () => {
		const name = (pickerNewActionName || "").trim();
		if (disabled || submitting || !name || !selectedItemId) return;

		setSubmitting(true);
		try {
			const response = await api.post("/actions", { t_item_id: selectedItemId, name });
			const action = response.data.action;
			setPickerActions((prev) => [...prev, action]);
			setPickerActionIds((prev) => [...prev, action.id]);
			setPickerNewActionName(null);
		} catch (error) {
			console.error(error);
		} finally {
			setSubmitting(false);
		}
	}

	const handleConfirm = async () => {
		if (disabled || submitting || !selectedItemId) return;

		const qty = Math.max(1, parseInt(quantity, 10) || 1);

		setSubmitting(true);

		const item = items.find((i) => i.id === selectedItemId);
		const actions = pickerActions.filter((action) => pickerActionIds.includes(action.id));

		try {
			// Each item gets the ticked actions; more can be added later from its card.
			for (let i = 0; i < qty; i++) {
				const labItem = await store.addItem(item);
				for (const action of actions) {
					await store.addActionValue(labItem, action);
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

	const updateActionValue = async (lav, changes) => {
		if (disabled) return;
		try {
			await store.updateActionValue(lav, changes);
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
			await store.deleteActionValue(lav);
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
			await store.savePropertyValue(labItem, property, existing, propertyInputs[key] || null);

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

	// Esc closes the properties modal. The field being typed in is blurred
	// first, so its value is saved like when clicking outside.
	useEffect(() => {
		if (editingPropertiesItemId === null) return;
		const handleKeyDown = (e) => {
			if (e.key !== "Escape") return;
			document.activeElement?.blur();
			handleClosePropertiesModal();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [editingPropertiesItemId]);

	const handleDeleteLabItem = async (labItem) => {
		if (disabled) return;
		try {
			await store.deleteItem(labItem);

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
			addingActionItemIdRef.current = null;
			setAddingActionItemId(null);
			setInlineActions([]);
			return;
		}

		setAddingActionItemId(labItem.id);
		addingActionItemIdRef.current = labItem.id;
		setInlineActions([]);

		try {
			const response = await api.get("/actions", { params: { t_item_id: labItem.t_item_id } });
			// Another card's "+ Ação" was opened meanwhile — these aren't its actions.
			if (addingActionItemIdRef.current !== labItem.id) return;
			setInlineActions(response.data.action_list || []);
		} catch (error) {
			console.error(error);
			if (addingActionItemIdRef.current === labItem.id) setInlineActions([]);
		}
	}

	// Tapping an action tile adds it straight away — no separate confirm.
	const handleConfirmAddAction = async (labItem, action) => {
		if (disabled || !action) return;

		try {
			await store.addActionValue(labItem, action);

			addingActionItemIdRef.current = null;
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
			await handleConfirmAddAction(labItem, response.data.action);
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
							onClick={() => handleConfirmAddAction(labItem, action)}
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

	// One card per item: its header (opens the properties), actions and
	// "+ Ação". A stripe down its left edge is coloured by item type, so
	// items of the same type read as a group.
	const renderLabItem = (labItem) => {
		const itemActionValues = actionValuesByLabItem[labItem.id] || [];
		const isAddingAction = addingActionItemId === labItem.id;

		const itemProperties = tabledPropertiesByItem[labItem.t_item_id] || [];
		const itemPropertyValues = labPropertyValuesByLabItem[labItem.id] || [];
		const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

		return (
			<div
				className={`lab-item-card ${highlightedItemId === labItem.id ? "is-highlighted" : ""}`}
				id={`lab-item-${labItem.id}`}
				key={labItem.id}
				style={{ "--lab-type-color": LAB_TYPE_COLORS[labItem.t_item_id % LAB_TYPE_COLORS.length] }}
			>
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
									return (
										<span className="lab-item-property" key={property.id}>
											{property.name}: <strong>{lpv?.value || "—"}</strong>
										</span>
									);
								})}
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
							<i className="fa-solid fa-plus" /><span className="lab-add-action-label">Ação</span>
						</button>
					)}
				</div>

				<div className="lab-item-card-actions">
					{itemActionValues.length === 0 && !isAddingAction && (
						<div className="lab-item-card-empty">Sem ações</div>
					)}

					{itemActionValues.map((lav) => (
						<div className={`lab-action-row ${lav.is_done ? "is-done" : ""}`} key={lav.id}>
							{draft
								? <span className="lab-action-name">{lav.action_name}</span>
								: <LabDoneCheck lav={lav} disabled={disabled} onToggle={handleToggleDone} />}
							<LabNote lav={lav} disabled={disabled} presets={presetsByAction[lav.t_action_id] || []} onSave={handleSaveNote} onDeleteAction={handleDeleteActionValue} />
						</div>
					))}
				</div>

				{isAddingAction && inlineAddAction(labItem, itemActionValues)}
			</div>
		);
	};

	return (
		<div className="service-lab">
			{/* One card per item, its actions listed inside it. */}
			<div className="lab-items">
				{labItems.map(renderLabItem)}
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

					{/* Always shown so the panel doesn't jump; empty until an item is picked. */}
					<div className="lab-picker-section lab-picker-actions">
						<label>Ações (opcional)</label>
						<div className="lab-inline-add-action lab-picker-action-strip">
							{!selectedItemId ? (
								<span className="lab-picker-actions-empty">Selecione um item</span>
							) : pickerNewActionName !== null ? (
								<>
									<input
										type="text"
										className="lab-new-action-input"
										placeholder="Nova ação..."
										maxLength={60}
										autoFocus
										value={pickerNewActionName}
										disabled={submitting}
										onChange={(e) => setPickerNewActionName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleCreatePickerAction();
											if (e.key === "Escape") setPickerNewActionName(null);
										}}
									/>
									<button
										type="button"
										className="lab-action-tiles-confirm"
										title="Criar ação para este tipo de item e selecioná-la"
										disabled={submitting || !pickerNewActionName.trim()}
										onClick={handleCreatePickerAction}
									>
										<i className="fa-solid fa-check" />
									</button>
									<button
										type="button"
										className="lab-action-tiles-cancel"
										title="Cancelar"
										onClick={() => setPickerNewActionName(null)}
									>
										<i className="fa-solid fa-xmark" />
									</button>
								</>
							) : (
								<div className="lab-action-tiles">
									{pickerActions.map((action) => (
										<button
											type="button"
											key={action.id}
											className={`lab-action-tile ${pickerActionIds.includes(action.id) ? "selected" : ""}`}
											onClick={() => togglePickerAction(action.id)}
										>
											{action.i_class && <i className={action.i_class} />}
											{action.name}
										</button>
									))}
									<button
										type="button"
										className="lab-action-tile is-new"
										title="Criar uma nova ação para este tipo de item"
										onClick={() => setPickerNewActionName("")}
									>
										<i className="fa-solid fa-plus" />
									</button>
								</div>
							)}
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
		</div>
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
// A picked preset goes on a new line of the note (or starts it): while
// editing it lands in the input to confirm, otherwise it's saved straight away.
function LabNote({ lav, disabled, presets, onSave, onDeleteAction }) {
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

	// The note box grows to fit its text, wrapped lines included (on a
	// phone a single line can wrap several times), and again when the
	// width changes (rotating the phone, resizing the window).
	const hasNoteField = !!lav.note || editing;
	useLayoutEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		const fit = () => {
			el.style.height = "auto";
			el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(el.parentElement);
		return () => observer.disconnect();
	}, [note, hasNoteField]);

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

	const handlePickPreset = (preset) => {
		if (editing) {
			setNote((prev) => appendNoteLine(prev, preset.value));
			inputRef.current?.focus();
			return;
		}
		onSave(lav, appendNoteLine(lav.note || "", preset.value));
	}

	const showAddNote = !disabled && !hasNote && !editing;
	const showPresets = !disabled && presets.length > 0;
	const showNoteField = hasNote || editing;

	return (
		<>
			{/* With no note yet the presets sit in the action's line (picking one
			    starts the note); once the note shows they move to the note's line,
			    under the trash. */}
			{showPresets && (
				<LabPresetMenu presets={presets} onPick={handlePickPreset} besideNote={showNoteField} />
			)}
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

			{showNoteField && (
				<div className={`lab-note-field ${showPresets ? "has-presets" : ""}`}>
					{/* A textarea so presets can stack on their own lines; Enter
					    breaks the line too — confirm with the check button. */}
					<textarea
						ref={inputRef}
						className={`lab-note-input ${editing ? "" : "is-locked"}`}
						placeholder="Nota..."
						maxLength={255}
						rows={1}
						value={note}
						readOnly={!editing}
						onChange={(e) => setNote(e.target.value)}
						onKeyDown={(e) => {
							if (editing && e.key === "Escape") handleCancel();
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

function appendNoteLine(text, line) {
	const trimmed = text.replace(/\s+$/, "");
	return trimmed ? `${trimmed}\n${line}` : line;
}

// The action's preset notes, listed in a small popup under their button.
function LabPresetMenu({ presets, onPick, besideNote }) {
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
		<span className={`lab-preset-menu ${besideNote ? "is-beside-note" : ""}`} ref={menuRef}>
			<button type="button" className="lab-note-btn" title="Respostas predefinidas" onClick={() => setOpen((prev) => !prev)}>
				<i className="fa-solid fa-list-ul" />
			</button>
			{open && (
				<span className="lab-more-popup lab-preset-popup">
					{presets.map((preset) => (
						<button
							type="button"
							key={preset.id}
							// Keeps the note input focused (and editing) while picking.
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => { setOpen(false); onPick(preset); }}
						>
							{preset.value}
						</button>
					))}
				</span>
			)}
		</span>
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
