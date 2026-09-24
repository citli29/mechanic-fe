import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

import { CarPicker } from "../../components/Pickers/CarPicker";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { MakePicker } from "../../components/Pickers/MakePicker";
import { ModelPicker } from "../../components/Pickers/ModelPicker";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/ScheduleForm.css";
import "./Style/SchedulesShow.css";
import "./Style/SchedulesShowLab.css";
import { pushErrorToast, pushSuccessToast } from "../../utils/errorToast";

const emptyServiceForm = {
	kms: "",
	checkin: "",
	service_type_id: "",
	r_name: "",
	r_phone: "",
};

export default function SchedulesShow() {

	const { id } = useParams();
	const navigate = useNavigate();

	const [schedule, setSchedule] = useState(null);
	const [editing, setEditing] = useState(null);

	const [isEditing, setIsEditing] = useState(false);

	const [relatedServices, setRelatedServices] = useState([]);
	const [loadingRelatedServices, setLoadingRelatedServices] = useState(false);

	const [creatingService, setCreatingService] = useState(false);
	const [serviceForm, setServiceForm] = useState(emptyServiceForm);
	const [creatingServiceLoading, setCreatingServiceLoading] = useState(false);

	const [serviceTypes, setServiceTypes] = useState([]);

	// Lab items/actions picked before the service exists — kept purely
	// local (never hit the API) until createServiceFromSchedule() succeeds,
	// then replayed as real lab_items/lab_action_values against the new id.
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


	async function loadSchedule() {
		try {
			const res = await api.get(`/schedules/${id}`);

			setSchedule(res.data.schedule);

			setEditing({
				...res.data.schedule,
				make_id: res.data.schedule.car_make_id || "",
				model_id: res.data.schedule.car_model_id || "",
			});
		} catch (err) {
			handleApiError(err);
		}
	}


	async function loadRelatedServices() {
		setLoadingRelatedServices(true);

		try {
			const res = await api.get("/services", { params: { schedule_id: id } });

			setRelatedServices(res.data.service_list || []);
		} catch (err) {
			setRelatedServices([]);
			handleApiError(err);
		} finally {
			setLoadingRelatedServices(false);
		}
	}


	async function loadServiceTypes() {
		try {
			const res = await api.get("/service_types");
			setServiceTypes(res.data.service_type_list || []);
		} catch (err) {
			handleApiError(err);
		}
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


	useEffect(() => {
		loadSchedule();
		loadRelatedServices();
	}, [id]);

	useEffect(() => { loadServiceTypes(); }, []);


	function beginEdit() {
		setIsEditing(true);
	}


	function cancelEdit() {
		setIsEditing(false);
		loadSchedule();
	}


	function updateDate(e) {
		const { value } = e.target;
		setEditing((prev) => ({ ...prev, date: value }));
	}


	function updateDescription(e) {
		const { value } = e.target;
		setEditing((prev) => ({ ...prev, description: value }));
	}


	function updateClientId(clientId) {
		setEditing((prev) => ({ ...prev, client_id: clientId }));
	}


	function updateCarId(carId) {
		setEditing((prev) => ({
			...prev,
			car_id: carId,
			...(carId ? { make_id: "", model_id: "" } : {}),
		}));
	}


	function updateMakeId(makeId) {
		setEditing((prev) => ({ ...prev, make_id: makeId, model_id: "" }));
	}


	function updateModelId(modelId) {
		setEditing((prev) => ({ ...prev, model_id: modelId }));
	}


	async function saveSchedule() {
		try {
			const data = {
				date: editing.date,
				description: editing.description,
				client_id: editing.client_id || "",
			};

			if (editing.car_id) {
				data.car_id = editing.car_id;
			} else if (editing.model_id) {
				data.model_id = editing.model_id;
			}

			await api.put(`/schedules/${id}`, data);

			pushSuccessToast("Schedule updated successfully.");

			setIsEditing(false);

			await loadSchedule();
		} catch (err) {
			handleApiError(err);
		}
	}


	async function deleteSchedule() {
		if (!window.confirm("Delete this schedule?")) return;

		try {
			await api.delete(`/schedules/${id}`);

			pushSuccessToast("Schedule deleted successfully.");

			navigate("/schedules");
		} catch (err) {
			handleApiError(err);
		}
	}


	function beginCreateService() {
		if (!editing?.client_id) {
			pushErrorToast("A client is required before creating the service.");
			return;
		}

		const mecanica = serviceTypes.find((t) => t.name === "Mecânica");

		setServiceForm({
			kms: "",
			checkin: editing.date || schedule?.date || "",
			service_type_id: mecanica ? mecanica.id : "",
			r_name: "",
			r_phone: "",
		});

		labNextLocalId.current = 1;
		setLabDraftItems([]);
		setLabPropertiesByItem({});
		setLabPropertyInputs({});
		handleLabCancel();

		setCreatingService(true);
	}


	async function createServiceFromSchedule() {
		const clientId = editing?.client_id;

		if (!clientId) {
			pushErrorToast("A client is required before creating the service.");
			return;
		}

		setCreatingServiceLoading(true);

		try {
			const data = {
				client_id: Number(clientId),
				car_id: editing?.car_id ? Number(editing.car_id) : null,
				kms: serviceForm.kms === "" ? null : Number(serviceForm.kms),
				checkin: serviceForm.checkin || null,
				schedule_id: Number(id),
				service_type_id: serviceForm.service_type_id || null,
				r_name: serviceForm.r_name || null,
				r_phone: serviceForm.r_phone || null,
			};

			const res = await api.post(`/schedules/${id}/create_service`, data);

			const newServiceId = res.data.service?.id || res.data.service_id;

			if (!newServiceId) throw new Error("The API did not return the new service ID.");

			if (isLabService && labDraftItems.length > 0) {
				await createLabDraftItems(newServiceId);
			}

			navigate(`/service/${newServiceId}`);
		} catch (err) {
			handleApiError(err);
		} finally {
			setCreatingServiceLoading(false);
		}
	}


	if (!editing) {
		return (
			<div className="page schedules-show-page schedule-form-page">
				<div className="content">
					<div className="card">
						<div className="body">A Carregar...</div>
					</div>
				</div>
			</div>
		);
	}

	const selectedTypeName = serviceTypes.find((t) => String(t.id) === String(serviceForm.service_type_id))?.name;
	const selectedTypeAccent = getServiceTypeAccent(serviceForm.service_type_id, selectedTypeName);

	const laboratorioType = serviceTypes.find((t) => t.name === "Laboratório");
	const isLabService = !!laboratorioType && String(serviceForm.service_type_id) === String(laboratorioType.id);

	const editingLabItem = labDraftItems.find((item) => item.localId === editingPropertiesLocalId);
	const editingLabProperties = editingLabItem ? (labPropertiesByItem[editingLabItem.t_item_id] || []) : [];

	return (
		<div className="page schedules-show-page schedule-form-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-calendar-day" />
						<h1>Marcação #{id}</h1>
					</div>

					<div className="body">

						<div className="details-grid">

							<div className="field">
								<label>Data</label>

								<input
									type="date"
									value={editing.date || ""}
									onChange={updateDate}
									disabled={!isEditing}
								/>
							</div>

							<div className="field field-full">
								<label>Descrição</label>

								<textarea
									value={editing.description || ""}
									onChange={updateDescription}
									disabled={!isEditing}
								/>
							</div>

							<div className="picker-row">
								<ClientPicker
									client_id={editing.client_id}
									onClientIdChange={updateClientId}
									isAllowedEditing={isEditing}
								/>
							</div>

							<div className="picker-row">
								<CarPicker
									car_id={editing.car_id}
									onCarIdChange={updateCarId}
									isAllowedEditing={isEditing}
								/>
							</div>

							{!editing.car_id && (
								<>
									<div className="field">
										<label>Marca <span className="field-hint">(sem viatura escolhida)</span></label>

										<MakePicker
											make_id={editing.make_id}
											onMakeIdChange={updateMakeId}
											disabled={!isEditing}
										/>
									</div>

									<div className="field">
										<label>Modelo <span className="field-hint">(sem viatura escolhida)</span></label>

										<ModelPicker
											make_id={editing.make_id}
											model_id={editing.model_id}
											onModelIdChange={updateModelId}
											disabled={!isEditing}
										/>
									</div>
								</>
							)}

						</div>

						<div className="details-actions">
							{!isEditing ? (
								<>
									<button className="options" onClick={beginEdit}>
										<i className="fa-solid fa-pencil" /> Editar
									</button>

									<button className="cancel" onClick={deleteSchedule}>
										<i className="fa-solid fa-trash" /> Apagar
									</button>

									{relatedServices.length === 0 && !creatingService && (
										<button className="confirm" onClick={beginCreateService}>
											<i className="fa-solid fa-plus" /> Criar Serviço
										</button>
									)}
								</>
							) : (
								<>
									<button className="confirm" onClick={saveSchedule}>
										<i className="fa-solid fa-check" /> Guardar
									</button>

									<button className="cancel" onClick={cancelEdit}>
										<i className="fa-solid fa-xmark" /> Cancelar
									</button>
								</>
							)}

							<Link className="options" to="/schedules_calendar">
								<i className="fa-solid fa-arrow-left" /> Voltar
							</Link>
						</div>

					</div>
				</div>

				{creatingService && (
					<div className="card">
						<div className="header">
							<i className="fa-solid fa-clipboard-list" />
							<h1>Criar Serviço</h1>
						</div>

						<div className="body">

							<div className="details-grid">
								<div className="field">
									<label>Entrada</label>

									<input
										type="date"
										value={serviceForm.checkin}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, checkin: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Kilómetros</label>

									<input
										type="number"
										value={serviceForm.kms}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, kms: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Tipo de Serviço</label>

									<select
										value={serviceForm.service_type_id}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, service_type_id: e.target.value }))
										}
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
									<label>Nome do Responsável</label>

									<input
										type="text"
										placeholder="S/ Nome"
										value={serviceForm.r_name ?? ""}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, r_name: e.target.value }))
										}
									/>
								</div>

								<div className="field">
									<label>Telemóvel do Responsável</label>

									<input
										type="text"
										placeholder="S/ Telemóvel"
										value={serviceForm.r_phone ?? ""}
										onChange={(e) =>
											setServiceForm((prev) => ({ ...prev, r_phone: e.target.value }))
										}
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
							</div>

							<div className="details-actions">
								<button
									className="confirm"
									onClick={createServiceFromSchedule}
									disabled={creatingServiceLoading}
								>
									<i className="fa-solid fa-check" /> {creatingServiceLoading ? "A Criar..." : "Criar Serviço"}
								</button>

								<button
									className="cancel"
									onClick={() => {
										setCreatingService(false);
										setServiceForm(emptyServiceForm);
									}}
									disabled={creatingServiceLoading}
								>
									<i className="fa-solid fa-xmark" /> Cancelar
								</button>
							</div>

						</div>
					</div>
				)}

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-clipboard-list" />
						<h1>Serviços Relacionados</h1>
					</div>

					<div className="body">
						{loadingRelatedServices ? (
							<p className="schedules-show-empty">A carregar serviços...</p>
						) : relatedServices.length === 0 ? (
							<p className="schedules-show-empty">Sem serviços associados a esta marcação.</p>
						) : (
							<table>
								<thead>
									<tr>
										<th>ID do Serviço</th>
										<th>Entrada</th>
										<th></th>
									</tr>
								</thead>

								<tbody>
									{relatedServices.map((service) => (
										<tr key={service.id}>
											<td data-label="ID do Serviço">#{service.id}</td>
											<td data-label="Entrada">{service.checkin || "-"}</td>

											<td className="actions">
												<Link className="options" to={`/service/${service.id}`}>
													<i className="fa-solid fa-arrow-up-right-from-square" />
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}
