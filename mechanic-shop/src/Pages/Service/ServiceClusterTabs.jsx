import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";
import { ClientPicker } from "../../components/Pickers/ClientPicker";
import { CarPicker } from "../../components/Pickers/CarPicker";
import ServiceTypeBadge from "../../components/ServiceTypeBadge/ServiceTypeBadge";
import "../../components/Pickers/style/Picker.css";
import "./Style/ServiceHeader.css";
import "./Style/ServiceClusterTabs.css";

// Fields the service_associations INSERT trigger syncs across every member
// of a cluster — associating an existing service that already has its own
// values here will silently lose one side's data, so these are exactly what
// we need to let the user choose between beforehand. The insert trigger's
// own UPDATE (on checkin/r_name/r_phone/checkout_predict/kms/checkout) also
// happens to re-trigger the header-sync UPDATE trigger as a side effect,
// which drags schedule_id and malfunction along for the ride too — include
// them so nothing gets silently lost that we didn't warn about.
const SYNCED_FIELDS = [
	{ key: "checkin", label: "Entrada" },
	{ key: "r_name", label: "Nome" },
	{ key: "r_phone", label: "Telefone" },
	{ key: "checkout_predict", label: "Previsão de Saída" },
	{ key: "kms", label: "Kms" },
	{ key: "checkout", label: "Saída" },
	{ key: "malfunction", label: "Descrição de Avaria" },
	{ key: "schedule_id", label: "Marcação" },
];

function conflictSideLabel(id, hasAssociation) {
	return hasAssociation ? `Associação #${id}` : `Serviço #${id}`;
}

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function getStatusInfo(info) {
	if (info.checkout) return { badgeClass: "state-delivered", label: "Entregue" };
	if (info.is_finished) return { badgeClass: "state-finished", label: "Terminado" };
	return { badgeClass: "state-not-finished", label: "Por Terminar" };
}

function carLabel(info) {
	return [info.car_plate, [info.car_make_name, info.car_model_name].filter(Boolean).join(" ")]
		.filter(Boolean)
		.join(" - ");
}

function subLabel(info) {
	return carLabel(info) || info.client_name || "";
}

// Unlike SYNCED_FIELDS, client/car are never silently overwritten — the
// association insert is flatly rejected if they don't already match. Shown
// here anyway so a mismatch reads as the hard blocker it is, not just
// another field to pick a side on.
const VEHICLE_FIELDS = [
	{ key: "client_id", label: "Cliente", display: (info) => info.client_name || "—" },
	{ key: "car_id", label: "Viatura", display: (info) => carLabel(info) || "—" },
];

function ServiceOptionCard({ service, selected, loading, onClick, disabled, idLabel }) {
	const status = getStatusInfo(service);
	const sub = subLabel(service);

	return (
		<button
			type="button"
			className={`service-cluster-option-card ${selected ? "selected" : ""}`}
			disabled={disabled}
			onClick={onClick}
		>
			<div className="service-cluster-option-card-top">
				<span className="service-cluster-option-card-id">{idLabel ?? `#${service.service_id ?? service.id}`}</span>
				<span className={`service-cluster-tab-dot ${status.badgeClass}`} title={status.label} />
			</div>
			<ServiceTypeBadge serviceTypeId={service.service_type_id} label={service.service_type_name} />
			{sub && <span className="service-cluster-option-card-sub">{sub}</span>}
			{loading && <i className="fa-solid fa-spinner fa-spin" />}
			{selected && <i className="fa-solid fa-circle-check service-cluster-option-card-check" />}
		</button>
	);
}

function DisassociateModal({ currentId, onClose, onLinked }) {
	const [removing, setRemoving] = useState(false);
	const [error, setError] = useState("");

	async function handleConfirm() {
		setRemoving(true);
		setError("");

		try {
			await api.delete(`/services/${currentId}/associations`);
			onLinked();
			onClose();
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			setError(err?.response?.data?.error || "Não foi possível desassociar o serviço.");
			setRemoving(false);
		}
	}

	return (
		<div className="schedule-import-backdrop" onClick={onClose}>
			<div className="schedule-import-modal service-cluster-add-modal" onClick={(e) => e.stopPropagation()}>
				<div className="schedule-import-header">
					<div className="service-cluster-add-title">
						<h2>Desassociar Serviço</h2>
					</div>
					<button className="service-cluster-add-header-btn service-cluster-add-header-btn-close" onClick={onClose} title="Fechar">
						<i className="fa-solid fa-xmark" />
					</button>
				</div>

				{error && <p className="service-cluster-add-error">{error}</p>}

				<p>Deseja remover o Serviço #{currentId} da Associação de Serviços? Os outros serviços da associação não serão afetados.</p>

				<button className="cancel service-cluster-add-confirm" disabled={removing} onClick={handleConfirm}>
					{removing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-link-slash" />}
					Desassociar
				</button>
			</div>
		</div>
	);
}

function AddToClusterModal({ currentId, clusterTabs, excludedIds, onClose, onLinked }) {
	const navigate = useNavigate();

	const [mode, setMode] = useState("create"); // "create" | "associate"
	const [manualEntry, setManualEntry] = useState(false);

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [results, setResults] = useState([]);
	const [linkingId, setLinkingId] = useState(null);

	const [pendingAssociate, setPendingAssociate] = useState(null);

	const [newClientId, setNewClientId] = useState("");
	const [newCarId, setNewCarId] = useState("");
	const [isCurrentClientCarLoaded, setIsCurrentClientCarLoaded] = useState(false);
	const [newKms, setNewKms] = useState("");
	const [newCheckin, setNewCheckin] = useState(() => formatDate(new Date()));
	const [newCheckoutPredict, setNewCheckoutPredict] = useState("");
	const [newRName, setNewRName] = useState("");
	const [newRPhone, setNewRPhone] = useState("");
	const [newMalfunction, setNewMalfunction] = useState("");
	const [newSignedService, setNewSignedService] = useState("");
	const [creating, setCreating] = useState(false);
	// Once currentId already belongs to an association, every member shares
	// the same synced fields, so there's nothing to choose between — default
	// straight to it instead of making the user pick among identical cards.
	const [selectedImportId, setSelectedImportId] = useState(() => (
		clusterTabs.length > 1 ? currentId : null
	));
	const [importing, setImporting] = useState(false);

	const [serviceTypes, setServiceTypes] = useState([]);
	const [newTypeId, setNewTypeId] = useState("");

	const [error, setError] = useState("");

	useEffect(() => {
		let isCurrent = true;

		async function loadServiceTypes() {
			try {
				const response = await api.get("/service_types");
				if (!isCurrent) return;

				const list = response.data.service_type_list || [];
				setServiceTypes(list);

				// Defaults to Mecânica — the most likely pick for a companion
				// service in the cluster — but only once, so picking a
				// different type doesn't get silently reset by a later render.
				setNewTypeId((prev) => {
					if (prev) return prev;
					const mecanica = list.find((type) => type.name === "Mecânica");
					return mecanica?.id ?? list[0]?.id ?? "";
				});
			} catch (err) {
				console.error(err, err?.response?.data?.error);
			}
		}

		loadServiceTypes();

		return () => { isCurrent = false; };
	}, []);

	// A new service in the association must share the current service's
	// client and car (the database rejects anything else), so the manual
	// entry form starts with them and doesn't let them be changed.
	useEffect(() => {
		let isCurrent = true;

		async function loadCurrentClientAndCar() {
			try {
				const response = await api.get(`/services/${currentId}`);
				if (!isCurrent) return;

				const service = response.data.service;
				setNewClientId(service?.client_id ?? "");
				setNewCarId(service?.car_id ?? "");
				setIsCurrentClientCarLoaded(true);
			} catch (err) {
				console.error(err, err?.response?.data?.error);
			}
		}

		loadCurrentClientAndCar();

		return () => { isCurrent = false; };
	}, [currentId]);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		if (mode !== "associate") return;

		let isCurrent = true;

		async function loadResults() {
			try {
				const response = await api.get("/services", {
					params: { q: debouncedSearch, p: 1, u: 8 },
				});

				if (!isCurrent) return;

				const list = (response.data.service_list || [])
					.filter((s) => !excludedIds.has(s.id));

				setResults(list);
			} catch (err) {
				if (isCurrent) console.error(err, err?.response?.data?.error);
			}
		}

		loadResults();

		return () => { isCurrent = false; };
	}, [mode, debouncedSearch]);

	async function handleSelect(service) {
		setLinkingId(service.id);
		setError("");

		try {
			const [currentResponse, selectedResponse, selectedAssociationsResponse] = await Promise.all([
				api.get(`/services/${currentId}`),
				api.get(`/services/${service.id}`),
				api.get(`/services/${service.id}/associations`),
			]);

			const currentFull = currentResponse.data.service;
			const selectedFull = selectedResponse.data.service;
			const selectedHasAssociation = (selectedAssociationsResponse.data.cluster_mate_list || []).length > 0;

			const differingFields = SYNCED_FIELDS.filter(
				(f) => (currentFull[f.key] ?? "") !== (selectedFull[f.key] ?? "")
			);

			if (differingFields.length > 0) {
				setPendingAssociate({
					service,
					currentFull,
					selectedFull,
					differingFields,
					// clusterTabs already holds the current service's own mates
					// (if any) — whichever side already belongs to an
					// association affects every member there, not just the
					// one service, so the chooser labels it accordingly.
					currentHasAssociation: clusterTabs.length > 1,
					selectedHasAssociation,
				});
				setLinkingId(null);
				return;
			}

			await confirmAssociate(service, currentFull);
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			setError(err?.response?.data?.error || "Não foi possível associar o serviço.");
			setLinkingId(null);
		}
	}

	async function confirmAssociate(service, sourceFull) {
		setLinkingId(service.id);
		setError("");

		try {
			// clusterTabs (current service + its mates) already carries
			// cluster_nr once there's at least one mate — only hit the
			// endpoint when the page hasn't loaded that yet.
			let clusterNr = clusterTabs.find((tab) => tab.service_id !== currentId && tab.cluster_nr != null)?.cluster_nr ?? null;

			if (clusterNr == null) {
				const matesResponse = await api.get(`/services/${currentId}/associations`);
				const mates = matesResponse.data.cluster_mate_list || [];
				clusterNr = mates[0]?.cluster_nr ?? null;
			}

			await api.post(`/services/${currentId}/associations`, {
				service_id: service.id,
				cluster_nr: clusterNr,
			});

			// The insert trigger syncs the shared fields from whichever
			// cluster member has the lowest id, which isn't necessarily the
			// side the user chose above — force it explicitly by re-saving
			// the chosen source's own (pre-association) values, which the
			// update trigger then cascades to every member, including the
			// one we just joined. That same insert-time sync just touched
			// sourceFull's own row too (even when it's the one "winning"),
			// bumping its optimistic-lock version — re-fetch first so this
			// PUT doesn't get rejected as a stale write.
			const freshSourceResponse = await api.get(`/services/${sourceFull.id}`);
			const freshSource = freshSourceResponse.data.service;
			const syncedValues = Object.fromEntries(SYNCED_FIELDS.map((f) => [f.key, sourceFull[f.key]]));

			await api.put(`/services/${sourceFull.id}`, { ...freshSource, ...syncedValues });

			setPendingAssociate(null);
			onLinked();
			onClose();
			navigate(`/services/${service.id}`);
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			setError(err?.response?.data?.error || "Não foi possível associar o serviço.");
			setLinkingId(null);
		}
	}

	async function createAndLink({
		client_id, car_id, malfunction, signed_service,
		kms, checkin, checkout_predict, r_name, r_phone,
	}) {
		const createResponse = await api.post("/services", {
			client_id,
			car_id: car_id || null,
			service_type_id: newTypeId,
			checkin: checkin || formatDate(new Date()),
			malfunction,
			signed_service,
			kms: kms || null,
			checkout_predict: checkout_predict || null,
			r_name: r_name || null,
			r_phone: r_phone || null,
		});
		const newService = createResponse.data.service;

		await api.post(`/services/${currentId}/associations`, { service_id: newService.id });

		onLinked();
		onClose();
		navigate(`/services/${newService.id}`);
	}

	async function handleConfirmCreateNew() {
		if (!newClientId) return;

		setCreating(true);
		setError("");

		try {
			await createAndLink({
				client_id: newClientId,
				car_id: newCarId,
				malfunction: newMalfunction,
				signed_service: newSignedService,
				kms: newKms,
				checkin: newCheckin,
				checkout_predict: newCheckoutPredict,
				r_name: newRName,
				r_phone: newRPhone,
			});
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			setError(err?.response?.data?.error || "Não foi possível criar o serviço.");
			setCreating(false);
		}
	}

	async function handleConfirmImport() {
		if (!selectedImportId) return;

		setImporting(true);
		setError("");

		try {
			const sourceResponse = await api.get(`/services/${selectedImportId}`);
			const source = sourceResponse.data.service;

			await createAndLink({ client_id: source.client_id, car_id: source.car_id, signed_service: newSignedService });
		} catch (err) {
			console.error(err, err?.response?.data?.error);
			setError(err?.response?.data?.error || "Não foi possível criar o serviço.");
			setImporting(false);
		}
	}

	function handleBack() {
		if (pendingAssociate) {
			setPendingAssociate(null);
			setError("");
			return;
		}

		if (mode === "create" && manualEntry) {
			setManualEntry(false);
			setError("");
			return;
		}

		setMode("create");
		setError("");
	}

	const showBack = mode === "associate" || manualEntry;

	const newTypeName = serviceTypes.find((type) => String(type.id) === String(newTypeId))?.name;
	const newTypeAccent = getServiceTypeAccent(newTypeId, newTypeName);

	const titles = {
		associate: pendingAssociate ? "Escolher Dados" : "Associar Serviço Existente",
		create: "Adicionar Serviço",
	};

	return (
		<div className="schedule-import-backdrop" onClick={onClose}>
			<div className="schedule-import-modal service-cluster-add-modal" onClick={(e) => e.stopPropagation()}>
				<div className="schedule-import-header">
					<div className="service-cluster-add-title">
						{showBack && (
							<button className="service-cluster-add-header-btn" onClick={handleBack} title="Voltar">
								<i className="fa-solid fa-arrow-left" />
							</button>
						)}
						<h2>{titles[mode]}</h2>
					</div>
					<button className="service-cluster-add-header-btn service-cluster-add-header-btn-close" onClick={onClose} title="Fechar">
						<i className="fa-solid fa-xmark" />
					</button>
				</div>

				{error && <p className="service-cluster-add-error">{error}</p>}

				{mode === "create" && !manualEntry && (
					<div className="service-cluster-add-switch-row">
						<button type="button" className="service-cluster-add-switch" onClick={() => setMode("associate")}>
							<i className="fa-solid fa-link" /> Associar Serviço Existente
						</button>

						{/* Deliberately styled just like the button above, not
							like the big confirm button below — an escape hatch
							for the rare case the imported/synced data genuinely
							needs replacing, not something to invite everyday use. */}
						<button type="button" className="service-cluster-add-switch" onClick={() => setManualEntry(true)}>
							<i className="fa-solid fa-pen" /> Substituir Informações de Serviço
						</button>
					</div>
				)}

				{mode === "associate" && !pendingAssociate && (
					<>
						<div className="search-bar">
							<span><i className="fa-solid fa-magnifying-glass" /></span>
							<input
								type="text"
								autoFocus
								placeholder="Pesquisar por cliente ou matrícula..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>

						{results.length === 0 ? (
							<p className="service-cluster-add-empty">Sem serviços encontrados.</p>
						) : (
							<div className="service-cluster-option-cards">
								{results.map((service) => (
									<ServiceOptionCard
										key={service.id}
										service={service}
										disabled={linkingId !== null}
										loading={linkingId === service.id}
										onClick={() => handleSelect(service)}
									/>
								))}
							</div>
						)}
					</>
				)}

				{mode === "associate" && pendingAssociate && (() => {
					const currentLabel = conflictSideLabel(currentId, pendingAssociate.currentHasAssociation);
					const selectedLabel = conflictSideLabel(pendingAssociate.service.id, pendingAssociate.selectedHasAssociation);
					const hasVehicleMismatch = VEHICLE_FIELDS.some(
						(field) => pendingAssociate.currentFull[field.key] !== pendingAssociate.selectedFull[field.key]
					);

					return (
						<div className="service-cluster-conflict">
							<p>
								{currentLabel} e {selectedLabel} têm dados diferentes nos campos abaixo. Ao
								associar, estes serão sincronizados em todos os serviços da associação —
								escolha de qual importar os dados:
							</p>

							<table className="service-cluster-conflict-table">
								<thead>
									<tr>
										<th></th>
										<th>{currentLabel}</th>
										<th>{selectedLabel}</th>
									</tr>
								</thead>
								<tbody>
									{VEHICLE_FIELDS.map((field) => {
										const mismatch = pendingAssociate.currentFull[field.key] !== pendingAssociate.selectedFull[field.key];

										return (
											<tr key={field.key} className={mismatch ? "mismatch" : ""}>
												<td>{field.label}</td>
												<td>{field.display(pendingAssociate.currentFull)}</td>
												<td>{field.display(pendingAssociate.selectedFull)}</td>
											</tr>
										);
									})}

									{SYNCED_FIELDS.map((field) => {
										const differs = pendingAssociate.differingFields.some((f) => f.key === field.key);

										return (
											<tr key={field.key} className={differs ? "differs" : ""}>
												<td>{field.label}</td>
												<td>{pendingAssociate.currentFull[field.key] || "—"}</td>
												<td>{pendingAssociate.selectedFull[field.key] || "—"}</td>
											</tr>
										);
									})}
								</tbody>
							</table>

							{hasVehicleMismatch && (
								<p className="service-cluster-add-error">
									Não é possível associar: o veículo e/ou o cliente não coincidem.
								</p>
							)}

							<button
								className={`service-cluster-add-confirm ${hasVehicleMismatch ? "cancel" : "confirm"}`}
								disabled={linkingId !== null || hasVehicleMismatch}
								onClick={() => confirmAssociate(pendingAssociate.service, pendingAssociate.currentFull)}
							>
								{linkingId !== null ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
								Usar dados de {currentLabel}
							</button>

							<button
								className={`service-cluster-add-manual ${hasVehicleMismatch ? "cancel" : ""}`}
								disabled={linkingId !== null || hasVehicleMismatch}
								onClick={() => confirmAssociate(pendingAssociate.service, pendingAssociate.selectedFull)}
							>
								{linkingId !== null ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
								Usar dados de {selectedLabel}
							</button>
						</div>
					);
				})()}

				{mode === "create" && (
					<div className="service-cluster-add-type">
						<label htmlFor="service-cluster-add-type-select">Tipo de Serviço</label>
						<select
							id="service-cluster-add-type-select"
							value={newTypeId}
							onChange={(e) => setNewTypeId(e.target.value)}
							style={{
								borderColor: newTypeAccent,
								background: `${newTypeAccent}1a`,
							}}
						>
							{serviceTypes.map((type) => (
								<option key={type.id} value={type.id}>{type.name}</option>
							))}
						</select>
					</div>
				)}

				{mode === "create" && !manualEntry && (
					<>
						<p className="service-cluster-add-import-label">Importar Informações:</p>

						<div className="service-cluster-option-cards">
							{clusterTabs.length > 1 ? (
								<ServiceOptionCard
									service={clusterTabs.find((tab) => tab.service_id === currentId) ?? clusterTabs[0]}
									idLabel={`Associação #${currentId}`}
									disabled={importing}
									selected={selectedImportId === currentId}
									onClick={() => setSelectedImportId(currentId)}
								/>
							) : (
								clusterTabs.map((tab) => (
									<ServiceOptionCard
										key={tab.service_id}
										service={tab}
										disabled={importing}
										selected={selectedImportId === tab.service_id}
										onClick={() => setSelectedImportId((prev) => (prev === tab.service_id ? null : tab.service_id))}
									/>
								))
							)}
						</div>

						<div className="service-cluster-add-textfield">
							<label htmlFor="service-cluster-import-signed-service">Serviço a Realizar</label>
							<textarea
								id="service-cluster-import-signed-service"
								value={newSignedService}
								disabled={importing}
								onChange={(e) => setNewSignedService(e.target.value)}
							/>
						</div>

						<button
							className="confirm service-cluster-add-confirm"
							disabled={!selectedImportId || importing}
							onClick={handleConfirmImport}
						>
							{importing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
							Importar e Criar Serviço
						</button>
					</>
				)}

				{mode === "create" && manualEntry && (
					<div className="service-cluster-add-create">
						{/* Read-only: fixed to the association's client and car. */}
						<ClientPicker
							client_id={newClientId}
							onClientIdChange={() => {}}
							isAllowedEditing={false}
						/>

						{newCarId ? (
							<CarPicker
								car_id={newCarId}
								onCarIdChange={() => {}}
								isAllowedEditing={false}
							/>
						) : isCurrentClientCarLoaded && (
							// A disabled "Pesquisar Viatura..." box would suggest a car
							// could be picked here — say plainly there isn't one.
							<p className="service-cluster-add-no-car">
								<i className="fa-solid fa-car" /> Sem viatura
							</p>
						)}

						<div className="service-cluster-add-fields-grid">
							<div className="service-cluster-add-textfield">
								<label htmlFor="service-cluster-add-kms">Kms.</label>
								<input
									id="service-cluster-add-kms"
									type="number"
									value={newKms}
									disabled={creating}
									onChange={(e) => setNewKms(e.target.value)}
								/>
							</div>

							<div className="service-cluster-add-textfield">
								<label htmlFor="service-cluster-add-checkin">Entrada</label>
								<input
									id="service-cluster-add-checkin"
									type="date"
									value={newCheckin}
									disabled={creating}
									onChange={(e) => setNewCheckin(e.target.value)}
								/>
							</div>

							<div className="service-cluster-add-textfield">
								<label htmlFor="service-cluster-add-checkout-predict">Prev. Saída</label>
								<input
									id="service-cluster-add-checkout-predict"
									type="date"
									value={newCheckoutPredict}
									disabled={creating}
									onChange={(e) => setNewCheckoutPredict(e.target.value)}
								/>
							</div>

							<div className="service-cluster-add-textfield">
								<label htmlFor="service-cluster-add-r-name">Nome do Responsável</label>
								<input
									id="service-cluster-add-r-name"
									type="text"
									value={newRName}
									disabled={creating}
									onChange={(e) => setNewRName(e.target.value)}
								/>
							</div>

							<div className="service-cluster-add-textfield">
								<label htmlFor="service-cluster-add-r-phone">Telemóvel do Responsável</label>
								<input
									id="service-cluster-add-r-phone"
									type="text"
									value={newRPhone}
									disabled={creating}
									onChange={(e) => setNewRPhone(e.target.value)}
								/>
							</div>
						</div>

						<div className="service-cluster-add-textfield">
							<label htmlFor="service-cluster-add-malfunction">Descrição de Avaria</label>
							<textarea
								id="service-cluster-add-malfunction"
								value={newMalfunction}
								disabled={creating}
								onChange={(e) => setNewMalfunction(e.target.value)}
							/>
						</div>

						<div className="service-cluster-add-textfield">
							<label htmlFor="service-cluster-add-signed-service">Serviço a Realizar</label>
							<textarea
								id="service-cluster-add-signed-service"
								value={newSignedService}
								disabled={creating}
								onChange={(e) => setNewSignedService(e.target.value)}
							/>
						</div>

						<button
							className="confirm"
							disabled={!newClientId || creating}
							onClick={handleConfirmCreateNew}
						>
							{creating ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
							Criar Serviço
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export function ServiceClusterTabs({ currentId, currentService, clusterMates, onLinked }) {
	const [showAddModal, setShowAddModal] = useState(false);
	const [showDisassociateModal, setShowDisassociateModal] = useState(false);

	const currentInfo = {
		service_id: Number(currentId),
		checkout: currentService.checkout,
		is_finished: currentService.is_finished,
		service_type_id: currentService.service_type_id,
		service_type_name: currentService.service_type_name,
		client_name: currentService.client_name,
		car_plate: currentService.car_plate,
		car_make_name: currentService.car_make_name,
		car_model_name: currentService.car_model_name,
	};

	// clusterMates is fetched async and keyed off currentId, so right after
	// navigating between tabs there's a render where it still holds the
	// PREVIOUS service's mates — which can include the service we just
	// navigated to. Filter it out defensively to avoid a duplicate key.
	const mates = (clusterMates || []).filter((mate) => mate.service_id !== Number(currentId));
	const tabs = [currentInfo, ...mates].sort((a, b) => a.service_id - b.service_id);

	const excludedIds = new Set([Number(currentId), ...mates.map((m) => m.service_id)]);

	const finishedCount = tabs.filter((tab) => tab.is_finished).length;

	return (
		<div className="service-cluster-tabs">
			{mates.length > 0 && (
				<span
					className={`service-cluster-progress ${
						finishedCount === tabs.length ? "complete" : finishedCount > 0 ? "partial" : ""
					}`}
					title="Serviços terminados na associação"
				>
					<i className={`fa-solid ${finishedCount === tabs.length ? "fa-circle-check" : "fa-list-check"}`} />
					{finishedCount}/{tabs.length}
				</span>
			)}

			{tabs.map((tab) => {
				const isCurrent = tab.service_id === Number(currentId);
				const status = getStatusInfo(tab);
				const typeAccent = getServiceTypeAccent(tab.service_type_id, tab.service_type_name);
				const style = { "--tab-type-color": typeAccent };
				const tabTitle = [tab.service_type_name, status.label].filter(Boolean).join(" — ");

				const content = (
					<>
						<span className={`service-cluster-tab-dot ${status.badgeClass}`} title={status.label} />
						<span className="service-cluster-tab-id">#{tab.service_id}</span>
					</>
				);

				return isCurrent ? (
					<button
						type="button"
						key={tab.service_id}
						className="service-cluster-tab active"
						style={style}
						title={mates.length > 0 ? "Desassociar da Associação de Serviços" : tabTitle}
						disabled={mates.length === 0}
						onClick={() => setShowDisassociateModal(true)}
					>
						{content}
					</button>
				) : (
					<Link
						key={tab.service_id}
						to={`/services/${tab.service_id}`}
						className="service-cluster-tab"
						style={style}
						title={tabTitle}
					>
						{content}
					</Link>
				);
			})}

			<button
				type="button"
				className="service-cluster-tab service-cluster-tab-add"
				title="Adicionar serviço à Associação de Serviços"
				onClick={() => setShowAddModal(true)}
			>
				<i className="fa-solid fa-plus" />
			</button>

			{showAddModal && (
				<AddToClusterModal
					currentId={Number(currentId)}
					clusterTabs={tabs}
					excludedIds={excludedIds}
					onClose={() => setShowAddModal(false)}
					onLinked={onLinked}
				/>
			)}

			{showDisassociateModal && (
				<DisassociateModal
					currentId={Number(currentId)}
					onClose={() => setShowDisassociateModal(false)}
					onLinked={onLinked}
				/>
			)}
		</div>
	);
}
