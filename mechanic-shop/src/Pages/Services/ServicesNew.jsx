import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";

import "../Style/Page.css";
import "../Style/Card.css";
import "../Schedules/Style/ScheduleForm.css";
import "./Style/ServicesNewLab.css";
import { pushErrorToast } from "../../utils/errorToast";

function oneLine(text) {
	return (text || "").replace(/\s+/g, " ").trim();
}

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export default function ServicesNew() {

	const navigate = useNavigate();

	const emptyService = {
		client_id: "",
		car_id: "",
		schedule_id: "",
		service_type_id: "",
		kms: "",
		checkin: formatDate(new Date()),
		checkout_predict: "",
		signed_service: "",
		malfunction: "",
		r_name: "",
		r_phone: "",
	};

	const [editing, setEditing] = useState(emptyService);
	const [serviceTypes, setServiceTypes] = useState([]);
	const [freeSchedules, setFreeSchedules] = useState([]);
	const [saving, setSaving] = useState(false);
	const [pendingSchedule, setPendingSchedule] = useState(null);

	const [isMobile, setIsMobile] = useState(
		window.matchMedia("(max-width: 650px)").matches
	);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 650px)");

		const handleChange = (e) => setIsMobile(e.matches);

		media.addEventListener("change", handleChange);

		return () => media.removeEventListener("change", handleChange);
	}, []);

	// Lab items/actions picked before the service exists — kept purely
	// local (never hit the API) until createService() succeeds, then
	// replayed as real lab_items/lab_action_values against the new id.
	const labNextLocalId = useRef(1);
	const [labDraftItems, setLabDraftItems] = useState([]);
	const [labAdding, setLabAdding] = useState(false);
	const [labCatalogItems, setLabCatalogItems] = useState([]);
	const [labSelectedItemId, setLabSelectedItemId] = useState(null);
	const [labCatalogActions, setLabCatalogActions] = useState([]);
	const [labSelectedActionIds, setLabSelectedActionIds] = useState([]);
	const [labQuantity, setLabQuantity] = useState(1);
	const [labAddingActionForLocalId, setLabAddingActionForLocalId] = useState(null);
	const [labInlineActions, setLabInlineActions] = useState([]);
	const [labInlineActionId, setLabInlineActionId] = useState("");

	const [labPropertiesByItem, setLabPropertiesByItem] = useState({});
	const [labPropertyInputs, setLabPropertyInputs] = useState({});
	const [editingPropertiesLocalId, setEditingPropertiesLocalId] = useState(null);



	function handleApiError(err) {
		console.error(err);
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			const types = res.data.service_type_list || [];
			setServiceTypes(types);

			// Mecânica is the common case — pre-selected so it's not an
			// extra click for the vast majority of services, while staying
			// changeable like any other field.
			const mecanica = types.find((t) => t.name === "Mecânica");
			if (mecanica) {
				setEditing((prev) => prev.service_type_id ? prev : { ...prev, service_type_id: mecanica.id });
			}
		} catch (err) {
			handleApiError(err);
		}
	}


	async function loadFreeSchedules() {
		try {
			const res = await api.get("/schedules/free");
			setFreeSchedules(res.data.schedule_list || []);
		} catch (err) {
			handleApiError(err);
		}
	}


	useEffect(() => {
		loadServiceTypes();
		loadFreeSchedules();
	}, []);


	function updateField(e) {
		const { name, value } = e.target;
		setEditing((prev) => ({ ...prev, [name]: value }));
	}


	function updateClientId(id) {
		setEditing((prev) => ({ ...prev, client_id: id }));
	}


	function updateCarId(id) {
		setEditing((prev) => ({ ...prev, car_id: id }));
	}


	function handleScheduleSelect(e) {
		const value = e.target.value;

		setEditing((prev) => ({ ...prev, schedule_id: value }));

		if (!value) return;

		const schedule = freeSchedules.find((s) => String(s.id) === String(value));

		if (schedule && oneLine(schedule.description)) {
			setPendingSchedule(schedule);
		}
	}


	function handleConfirmImportDescription() {
		const imported = pendingSchedule.description || "";
		const current = editing.malfunction || "";

		setEditing((prev) => ({
			...prev,
			malfunction: current ? `${imported}\n\n${current}` : imported,
		}));
		setPendingSchedule(null);
	}


	async function loadLabCatalogItems() {
		try {
			const res = await api.get("/items");
			setLabCatalogItems(res.data.item_list || []);
		} catch (err) {
			console.error(err);
			setLabCatalogItems([]);
		}
	}


	async function loadLabCatalogActions(t_item_id) {
		try {
			const res = await api.get("/actions", { params: { t_item_id } });
			setLabCatalogActions(res.data.action_list || []);
		} catch (err) {
			console.error(err);
			setLabCatalogActions([]);
		}
	}


	function handleLabStart() {
		loadLabCatalogItems();
		setLabAdding(true);
	}


	function handleLabCancel() {
		setLabAdding(false);
		setLabSelectedItemId(null);
		setLabSelectedActionIds([]);
		setLabCatalogActions([]);
		setLabQuantity(1);
	}


	function toggleLabSelectedItem(itemId) {
		const alreadySelected = labSelectedItemId === itemId;

		setLabSelectedItemId(alreadySelected ? null : itemId);
		setLabSelectedActionIds([]);
		setLabQuantity(1);

		if (alreadySelected) {
			setLabCatalogActions([]);
		} else {
			loadLabCatalogActions(itemId);
		}
	}


	function toggleLabSelectedAction(actionId) {
		setLabSelectedActionIds((prev) => (
			prev.includes(actionId)
				? prev.filter((id) => id !== actionId)
				: [...prev, actionId]
		));
	}


	const labSelectedActions = labSelectedActionIds
		.map((actionId) => labCatalogActions.find((action) => action.id === actionId))
		.filter(Boolean);


	function handleLabConfirm() {
		const item = labCatalogItems.find((i) => i.id === labSelectedItemId);
		if (!item) return;

		const qty = Math.max(1, parseInt(labQuantity, 10) || 1);
		const newEntries = [];

		for (let i = 0; i < qty; i++) {
			newEntries.push({
				localId: labNextLocalId.current++,
				t_item_id: item.id,
				item_name: item.name,
				actions: labSelectedActions.map((action) => ({ id: action.id, name: action.name })),
			});
		}

		setLabDraftItems((prev) => [...prev, ...newEntries]);
		loadLabProperties(item.id);
		handleLabCancel();
	}


	function handleLabDeleteItem(localId) {
		setLabDraftItems((prev) => prev.filter((item) => item.localId !== localId));
	}


	async function handleLabToggleAddAction(draftItem) {
		if (labAddingActionForLocalId === draftItem.localId) {
			setLabAddingActionForLocalId(null);
			setLabInlineActions([]);
			setLabInlineActionId("");
			return;
		}

		setLabAddingActionForLocalId(draftItem.localId);
		setLabInlineActionId("");

		try {
			const res = await api.get("/actions", { params: { t_item_id: draftItem.t_item_id } });
			setLabInlineActions(res.data.action_list || []);
		} catch (err) {
			console.error(err);
			setLabInlineActions([]);
		}
	}


	function handleLabConfirmAddAction(draftItem) {
		if (!labInlineActionId) return;

		const action = labInlineActions.find((a) => String(a.id) === String(labInlineActionId));
		if (!action) return;

		setLabDraftItems((prev) => prev.map((item) => (
			item.localId === draftItem.localId
				? { ...item, actions: [...item.actions, { id: action.id, name: action.name }] }
				: item
		)));

		setLabAddingActionForLocalId(null);
		setLabInlineActions([]);
		setLabInlineActionId("");
	}


	function handleLabDeleteAction(draftItem, actionId) {
		setLabDraftItems((prev) => prev.map((item) => (
			item.localId === draftItem.localId
				? { ...item, actions: item.actions.filter((a) => a.id !== actionId) }
				: item
		)));
	}


	async function loadLabProperties(t_item_id) {
		if (labPropertiesByItem[t_item_id] !== undefined) return;

		try {
			const res = await api.get("/properties", { params: { t_item_id } });
			setLabPropertiesByItem((prev) => ({ ...prev, [t_item_id]: res.data.property_list || [] }));
		} catch (err) {
			console.error(err);
			setLabPropertiesByItem((prev) => ({ ...prev, [t_item_id]: [] }));
		}
	}


	function handleOpenLabPropertiesModal(draftItem) {
		setEditingPropertiesLocalId(draftItem.localId);
		loadLabProperties(draftItem.t_item_id);
	}


	function handleCloseLabPropertiesModal() {
		setEditingPropertiesLocalId(null);
	}


	function handleLabPropertyInputChange(localId, propertyId, text) {
		setLabPropertyInputs((prev) => ({ ...prev, [`${localId}-${propertyId}`]: text }));
	}


	async function createLabDraftItems(serviceId) {
		for (const draftItem of labDraftItems) {
			const itemRes = await api.post(`/services/${serviceId}/lab_items`, {
				t_item_id: draftItem.t_item_id,
			});

			const labItemId = itemRes.data.lab_item.id;

			for (const action of draftItem.actions) {
				await api.post(`/services/${serviceId}/lab_action_values`, {
					l_item_id: labItemId,
					t_action_id: action.id,
				});
			}

			const properties = labPropertiesByItem[draftItem.t_item_id] || [];

			for (const property of properties) {
				const value = labPropertyInputs[`${draftItem.localId}-${property.id}`];
				if (!value) continue;

				await api.post(`/services/${serviceId}/lab_property_values`, {
					l_item_id: labItemId,
					property_id: property.id,
					value,
				});
			}
		}
	}


	async function createService() {
		if (!editing.client_id) {
			pushErrorToast("Selecione um cliente.");
			return;
		}

		if (!editing.checkin) {
			pushErrorToast("A data de entrada é obrigatória.");
			return;
		}

		setSaving(true);

		try {
			const data = {
				client_id: editing.client_id,
				car_id: editing.car_id || null,
				schedule_id: editing.schedule_id || null,
				service_type_id: editing.service_type_id || null,
				kms: editing.kms === "" ? null : Number(editing.kms),
				checkin: editing.checkin,
				checkout_predict: editing.checkout_predict || null,
				signed_service: editing.signed_service || null,
				malfunction: editing.malfunction || null,
				r_name: editing.r_name || null,
				r_phone: editing.r_phone || null,
			};

			const res = await api.post("/services", data);
			const newServiceId = res.data.service.id;

			if (isLabService && labDraftItems.length > 0) {
				await createLabDraftItems(newServiceId);
			}

			navigate(`/services/${newServiceId}`);
		} catch (err) {
			handleApiError(err);
		} finally {
			setSaving(false);
		}
	}

	const selectedTypeName = serviceTypes.find((t) => String(t.id) === String(editing.service_type_id))?.name;
	const selectedTypeAccent = getServiceTypeAccent(editing.service_type_id, selectedTypeName);

	const laboratorioType = serviceTypes.find((t) => t.name === "Laboratório");
	const isLabService = !!laboratorioType && String(editing.service_type_id) === String(laboratorioType.id);

	const editingLabItem = labDraftItems.find((item) => item.localId === editingPropertiesLocalId);
	const editingLabProperties = editingLabItem ? (labPropertiesByItem[editingLabItem.t_item_id] || []) : [];


	return (
		<div className="page services-new-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Novo Serviço</h1>
					</div>

					<div className="body">

						<div className="details-grid">

							<div className="picker-row">
								<ClientPicker
									client_id={editing.client_id}
									onClientIdChange={updateClientId}
									isAllowedEditing={true}
								/>
							</div>

							<div className="picker-row">
								<CarPicker
									car_id={editing.car_id}
									onCarIdChange={updateCarId}
									isAllowedEditing={true}
								/>
							</div>

							<div className="field">
								<label htmlFor="service-type">Tipo de Serviço</label>
								<select
									id="service-type"
									name="service_type_id"
									value={editing.service_type_id}
									onChange={updateField}
									style={{
										borderColor: selectedTypeAccent,
										background: `${selectedTypeAccent}1a`,
									}}
								>
									{serviceTypes.map((type) => (
										<option key={type.id} value={type.id}>
											{type.name}
										</option>
									))}
								</select>
							</div>

							<div className="field">
								<label htmlFor="kms">Kms.</label>
								<input
									id="kms"
									type="number"
									name="kms"
									value={editing.kms}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="checkin">Entrada</label>
								<input
									id="checkin"
									type="date"
									name="checkin"
									value={editing.checkin}
									onChange={updateField}
									required
								/>
							</div>

							<div className="field">
								<label htmlFor="checkout-predict">Prev. Saída</label>
								<input
									id="checkout-predict"
									type="date"
									name="checkout_predict"
									value={editing.checkout_predict}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="r-name">Nome do Responsável</label>
								<input
									id="r-name"
									type="text"
									name="r_name"
									value={editing.r_name}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="r-phone">Telemóvel do Responsável</label>
								<input
									id="r-phone"
									type="text"
									name="r_phone"
									value={editing.r_phone}
									onChange={updateField}
								/>
							</div>

							<div className="field">
								<label htmlFor="schedule">Marcação</label>
								<select
									id="schedule"
									name="schedule_id"
									value={editing.schedule_id}
									onChange={handleScheduleSelect}
								>
									<option value="">Sem Marcação</option>
									{freeSchedules.map((schedule) => (
										<option key={schedule.id} value={schedule.id}>
											#{schedule.id} — {schedule.date} — {oneLine(schedule.description)}
										</option>
									))}
								</select>
							</div>

							<div className="field field-full">
								<label htmlFor="signed-service">Serviço a Realizar</label>
								<textarea
									id="signed-service"
									name="signed_service"
									value={editing.signed_service}
									onChange={updateField}
									rows={8}
								/>
							</div>

						{isLabService && (
							<>
								<div className="lab-draft-card field-full">
									<div className="header">
										<i className="fa-solid fa-flask" />
										<h1>Laboratório</h1>
									</div>

								<div className="body">
									{isMobile ? (
										<div className="lab-draft-mobile-list">
											{labDraftItems.map((draftItem) => {
												const isAddingAction = labAddingActionForLocalId === draftItem.localId;
												const itemProperties = labPropertiesByItem[draftItem.t_item_id] || [];
												const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

												return (
													<div className="lab-draft-mobile-item" key={draftItem.localId}>
														<div
															className="lab-draft-mobile-item-header"
															title="Ver/editar propriedades do item"
															onClick={() => handleOpenLabPropertiesModal(draftItem)}
														>
															<div>
																<div className="lab-draft-item-name">{draftItem.item_name}</div>
																{itemPrimaryProperties.length > 0 && (
																	<div className="lab-draft-item-properties-summary">
																		{itemPrimaryProperties.map((property) => {
																			const value = labPropertyInputs[`${draftItem.localId}-${property.id}`];
																			return `${property.name}: ${value || "—"}`;
																		}).join(" · ")}
																	</div>
																)}
															</div>
															<button
																type="button"
																className="lab-draft-delete-item-btn"
																title="Remover item"
																onClick={(e) => {
																	e.stopPropagation();
																	handleLabDeleteItem(draftItem.localId);
																}}
															>
																<i className="fa-solid fa-trash" />
															</button>
														</div>

														{draftItem.actions.length === 0 && !isAddingAction && (
															<div className="lab-draft-mobile-action-row">
																<span>—</span>
															</div>
														)}

														{draftItem.actions.map((action) => (
															<div className="lab-draft-mobile-action-row" key={action.id}>
																<span>{action.name}</span>
																<button
																	type="button"
																	className="lab-delete-action-btn"
																	title="Remover esta ação"
																	onClick={() => handleLabDeleteAction(draftItem, action.id)}
																>
																	<i className="fa-solid fa-xmark" />
																</button>
															</div>
														))}

														{isAddingAction ? (
															<div className="lab-draft-mobile-inline-add-action">
																<select
																	value={labInlineActionId}
																	onChange={(e) => setLabInlineActionId(e.target.value)}
																>
																	<option value="">Selecionar ação...</option>
																	{labInlineActions.map((action) => (
																		<option key={action.id} value={action.id}>{action.name}</option>
																	))}
																</select>
																<button
																	type="button"
																	className="confirm"
																	title="Confirmar ação"
																	disabled={!labInlineActionId}
																	onClick={() => handleLabConfirmAddAction(draftItem)}
																>
																	<i className="fa-solid fa-check" />
																</button>
																<button
																	type="button"
																	className="cancel"
																	title="Cancelar"
																	onClick={() => handleLabToggleAddAction(draftItem)}
																>
																	<i className="fa-solid fa-xmark" />
																</button>
															</div>
														) : (
															<div
																className="lab-draft-mobile-add-action-row"
																title="Adicionar ação a este item"
																onClick={() => handleLabToggleAddAction(draftItem)}
															>
																<i className="fa-solid fa-plus" />
															</div>
														)}
													</div>
												);
											})}

											{!labAdding ? (
												<div className="lab-draft-mobile-add-item-row" title="Adicionar item" onClick={handleLabStart}>
													<i className="fa-solid fa-plus" /> Adicionar Item
												</div>
											) : (
												<div className="lab-draft-mobile-picker">
													<div className="lab-draft-mobile-picker-section">
														<label>Item</label>
														<div className="lab-draft-mobile-picker-list">
															{labCatalogItems.map((item) => (
																<div
																	key={item.id}
																	className={`lab-draft-picker-row ${labSelectedItemId === item.id ? "selected" : ""}`}
																	onClick={() => toggleLabSelectedItem(item.id)}
																>
																	{item.name}
																</div>
															))}
														</div>
													</div>

													{labSelectedItemId && (
														<div className="lab-draft-mobile-picker-section">
															<label>Ação</label>
															<div className="lab-draft-mobile-picker-list">
																{labCatalogActions.map((action) => (
																	<div
																		key={action.id}
																		className={`lab-draft-picker-row ${labSelectedActionIds.includes(action.id) ? "selected" : ""}`}
																		onClick={() => toggleLabSelectedAction(action.id)}
																	>
																		{action.name}
																	</div>
																))}
															</div>
														</div>
													)}

													{labSelectedItemId && (
														<div className="lab-draft-confirm-controls">
															<label>Quantidade:</label>
															<input
																type="number"
																min="1"
																value={labQuantity}
																onChange={(e) => setLabQuantity(e.target.value)}
															/>
															<button type="button" className="confirm" title="Confirmar" onClick={handleLabConfirm}>
																<i className="fa-solid fa-check" />
															</button>
														</div>
													)}

													<div className="lab-draft-mobile-add-item-row" title="Cancelar" onClick={handleLabCancel}>
														<i className="fa-solid fa-xmark" />
													</div>
												</div>
											)}
										</div>
									) : (
									<table className="lab-draft-table">
										<thead>
											<tr>
												<th></th>
												<th>Item</th>
												<th></th>
												<th>Ação</th>
												<th></th>
											</tr>
										</thead>
										<tbody>
											{labDraftItems.map((draftItem) => {
												const isAddingAction = labAddingActionForLocalId === draftItem.localId;
												const totalRows = draftItem.actions.length + (isAddingAction ? 1 : (draftItem.actions.length === 0 ? 1 : 0));
												const rows = [];

												const deleteItemCell = (
													<td rowSpan={totalRows} className="lab-draft-delete-item-cell">
														<button
															type="button"
															className="lab-draft-delete-item-btn"
															title="Remover item"
															onClick={() => handleLabDeleteItem(draftItem.localId)}
														>
															<i className="fa-solid fa-trash" />
														</button>
													</td>
												);

												const itemProperties = labPropertiesByItem[draftItem.t_item_id] || [];
												const itemPrimaryProperties = itemProperties.filter((property) => property.is_primary);

												const itemNameCell = (
													<td
														rowSpan={totalRows}
														className="lab-draft-item-name-cell"
														title="Ver/editar propriedades do item"
														onClick={() => handleOpenLabPropertiesModal(draftItem)}
													>
														<div className="lab-draft-item-name">{draftItem.item_name}</div>
														{itemPrimaryProperties.length > 0 && (
															<div className="lab-draft-item-properties-summary">
																{itemPrimaryProperties.map((property) => {
																	const value = labPropertyInputs[`${draftItem.localId}-${property.id}`];
																	return `${property.name}: ${value || "—"}`;
																}).join(" · ")}
															</div>
														)}
													</td>
												);

												draftItem.actions.forEach((action, index) => {
													rows.push(
														<tr key={`${draftItem.localId}-${action.id}-${index}`}>
															{index === 0 && deleteItemCell}
															{index === 0 && itemNameCell}
															{index === 0 && (
																<td rowSpan={totalRows} className="lab-add-action-cell">
																	<button
																		type="button"
																		className="lab-add-action-btn"
																		title="Adicionar ação a este item"
																		onClick={() => handleLabToggleAddAction(draftItem)}
																	>
																		<i className="fa-solid fa-plus" />
																	</button>
																</td>
															)}
															<td>{action.name}</td>
															<td className="lab-delete-action-cell">
																<button
																	type="button"
																	className="lab-delete-action-btn"
																	title="Remover esta ação"
																	onClick={() => handleLabDeleteAction(draftItem, action.id)}
																>
																	<i className="fa-solid fa-xmark" />
																</button>
															</td>
														</tr>
													);
												});

												if (draftItem.actions.length === 0 && !isAddingAction) {
													rows.push(
														<tr key={`${draftItem.localId}-empty`}>
															{deleteItemCell}
															{itemNameCell}
															<td className="lab-add-action-cell">
																<button
																	type="button"
																	className="lab-add-action-btn"
																	title="Adicionar ação a este item"
																	onClick={() => handleLabToggleAddAction(draftItem)}
																>
																	<i className="fa-solid fa-plus" />
																</button>
															</td>
															<td>—</td>
															<td></td>
														</tr>
													);
												}

												if (isAddingAction) {
													rows.push(
														<tr key={`${draftItem.localId}-add-action`}>
															{draftItem.actions.length === 0 && deleteItemCell}
															{draftItem.actions.length === 0 && itemNameCell}
															{draftItem.actions.length === 0 && (
																<td rowSpan={totalRows} className="lab-add-action-cell">
																	<button
																		type="button"
																		className="lab-add-action-btn"
																		title="Adicionar ação a este item"
																		onClick={() => handleLabToggleAddAction(draftItem)}
																	>
																		<i className="fa-solid fa-plus" />
																	</button>
																</td>
															)}
															<td className="lab-inline-add-action">
																<div className="lab-inline-add-action-controls">
																	<select
																		value={labInlineActionId}
																		onChange={(e) => setLabInlineActionId(e.target.value)}
																	>
																		<option value="">Selecionar ação...</option>
																		{labInlineActions.map((action) => (
																			<option key={action.id} value={action.id}>{action.name}</option>
																		))}
																	</select>
																	<button
																		type="button"
																		className="confirm"
																		title="Confirmar ação"
																		disabled={!labInlineActionId}
																		onClick={() => handleLabConfirmAddAction(draftItem)}
																	>
																		<i className="fa-solid fa-check" />
																	</button>
																	<button
																		type="button"
																		className="cancel"
																		title="Cancelar"
																		onClick={() => handleLabToggleAddAction(draftItem)}
																	>
																		<i className="fa-solid fa-xmark" />
																	</button>
																</div>
															</td>
															<td></td>
														</tr>
													);
												}

												return rows;
											})}

											{!labAdding ? (
												<tr className="add-row" title="Adicionar item" onClick={handleLabStart}>
													<td colSpan={5}>
														<i className="fa-solid fa-plus" />
													</td>
												</tr>
											) : (
												<>
													<tr>
														<td colSpan={5} style={{ padding: "0" }}>
															<div className="lab-draft-picker-columns">
																<div className="lab-draft-picker-column">
																	{labCatalogItems.map((item) => (
																		<div
																			key={item.id}
																			className={`lab-draft-picker-row ${labSelectedItemId === item.id ? "selected" : ""}`}
																			onClick={() => toggleLabSelectedItem(item.id)}
																		>
																			{item.name}
																		</div>
																	))}
																</div>

																<div className="lab-draft-picker-column">
																	{labCatalogActions.map((action) => (
																		<div
																			key={action.id}
																			className={`lab-draft-picker-row ${labSelectedActionIds.includes(action.id) ? "selected" : ""}`}
																			onClick={() => toggleLabSelectedAction(action.id)}
																		>
																			{action.name}
																		</div>
																	))}
																</div>

																<div className="lab-draft-picker-column lab-draft-picker-column-confirm">
																	{labSelectedItemId && (
																		<div className="lab-draft-confirm-controls">
																			<label>Quantidade:</label>
																			<input
																				type="number"
																				min="1"
																				value={labQuantity}
																				onChange={(e) => setLabQuantity(e.target.value)}
																			/>
																			<button type="button" className="confirm" title="Confirmar" onClick={handleLabConfirm}>
																				<i className="fa-solid fa-check" />
																			</button>
																		</div>
																	)}
																</div>
															</div>
														</td>
													</tr>
													<tr className="add-row" title="Cancelar" onClick={handleLabCancel}>
														<td colSpan={5}>
															<i className="fa-solid fa-xmark" />
														</td>
													</tr>
												</>
											)}
										</tbody>
									</table>
									)}
								</div>
							</div>
							{editingLabItem && (
								<div className="lab-properties-backdrop" onClick={handleCloseLabPropertiesModal}>
									<div className="lab-properties-modal" onClick={(e) => e.stopPropagation()}>
										<div className="lab-properties-modal-header">
											<h2>{editingLabItem.item_name}</h2>
											<button type="button" className="cancel" title="Fechar" onClick={handleCloseLabPropertiesModal}>
												<i className="fa-solid fa-xmark" />
											</button>
										</div>

										<div className="lab-properties-modal-fields">
											{editingLabProperties.length === 0 && (
												<p className="lab-properties-modal-empty">Este item não tem propriedades.</p>
											)}

											{editingLabProperties.map((property) => {
												const key = `${editingLabItem.localId}-${property.id}`;
												const value = labPropertyInputs[key] || "";

												return (
													<div className="lab-properties-modal-field" key={property.id}>
														<label>{property.name}</label>
														<input
															type="text"
															value={value}
															onChange={(e) => handleLabPropertyInputChange(editingLabItem.localId, property.id, e.target.value)}
														/>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							)}
							</>
						)}


							<div className="field field-full">
								<label htmlFor="malfunction">Descrição de Avaria</label>
								<textarea
									id="malfunction"
									name="malfunction"
									value={editing.malfunction}
									onChange={updateField}
									rows={8}
								/>
							</div>

						</div>

						<div className="details-actions">
							<button className="confirm" onClick={createService} disabled={saving}>
								<i className="fa-solid fa-check" /> {saving ? "A Criar..." : "Criar Serviço"}
							</button>

							<button className="cancel" onClick={() => navigate("/services")} disabled={saving}>
								<i className="fa-solid fa-xmark" /> Cancelar
							</button>
						</div>

					</div>
				</div>

			</div>

			{pendingSchedule && (
				<div className="schedule-import-backdrop" onClick={() => setPendingSchedule(null)}>
					<div className="schedule-import-modal" onClick={(e) => e.stopPropagation()}>
						<div className="schedule-import-header">
							<h2>Importar Descrição da Marcação</h2>
							<button className="cancel" onClick={() => setPendingSchedule(null)}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>

						<p>A marcação #{pendingSchedule.id} tem a seguinte descrição:</p>

						<div className="schedule-import-text">
							{pendingSchedule.description}
						</div>

						<p>Deseja importar para a Descrição de Avaria?</p>

						<div className="schedule-import-actions">
							<button className="confirm" onClick={handleConfirmImportDescription}>
								<i className="fa-solid fa-check" /> Sim, Importar
							</button>
							<button className="cancel" onClick={() => setPendingSchedule(null)}>
								<i className="fa-solid fa-xmark" /> Não
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
