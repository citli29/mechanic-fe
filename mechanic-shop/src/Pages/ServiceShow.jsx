import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";
import { pushErrorToast } from "../utils/errorToast";

import { ServiceHeader } from "./Service/ServiceHeader";
import { ServiceClusterTabs } from "./Service/ServiceClusterTabs";
import { CarPicker } from "../components/Pickers/CarPicker";

import "./Style/ServiceShow.css";
import { ClientPicker } from "../components/Pickers/ClientPicker";
import { MarkedTextarea } from "./MarkedTextarea";
import { AppliedProducts } from "./AppliedProducts";
import { UserTimes } from "./UserTimes";
import { UserTimePunches } from "./UserTimePunches";
import { ProductsRequested } from "./ProductsRequested";
import { ServiceLab } from "./ServiceLab";

const NAV_SECTIONS = [
	{ id: "section-car", label: "Viatura", icon: "fa-car" },
	{ id: "section-client", label: "Cliente", icon: "fa-user" },
	{ id: "section-agreed", label: "Serviço Acordado", icon: "fa-pen-fancy" },
	{ id: "section-done", label: "Serviço Realizado", icon: "fa-wrench" },
	{ id: "section-lab", label: "Laboratório", icon: "fa-flask", labOnly: true },
	{ id: "section-requested", label: "Pedido de Produtos", icon: "fa-cart-arrow-down" },
	{ id: "section-applied", label: "Produtos Aplicados", icon: "fa-store" },
	{ id: "section-times", label: "Tempos de Serviço", icon: "fa-hourglass-half" },
	{ id: "section-finished", label: "Finalizado", icon: "fa-flag-checkered" },
];

const LAB_SERVICE_TYPE_NAME = "Laboratório";

// The service fields the page saves. A save sends only the ones that
// changed since the last known server copy, each with the value it had
// there (PATCH /services/{id}) — so a save never overwrites a field the
// user didn't touch (e.g. kms changed meanwhile on another service of the
// same association), and only a change to the *same* field by someone
// else counts as a conflict.
const SAVED_FIELDS = [
	"client_id", "kms", "checkin", "checkout", "malfunction", "service",
	"car_id", "schedule_id", "note", "is_finished", "office_check",
	"service_type_id", "r_name", "r_phone", "checkout_predict", "signed_service",
];

// For the conflict toast.
const FIELD_LABELS = {
	client_id: "Cliente", kms: "Kms", checkin: "Entrada", checkout: "Saída",
	malfunction: "Descrição de Avaria", service: "Serviço Realizado", car_id: "Viatura",
	schedule_id: "Marcação", note: "Notas/Observações", is_finished: "Terminado",
	office_check: "Validado", service_type_id: "Tipo de Serviço", r_name: "Nome",
	r_phone: "Telemóvel", checkout_predict: "Prev. Saída", signed_service: "Serviço a Realizar",
};

// null / undefined / "" all mean "empty" (the backend stores them all as
// NULL), numbers and their text are the same value (an input gives "999",
// the server 999), and true/false match 1/0.
// The save sent when leaving a service (switching association tab or
// navigating away). Module-level so the next service page — this one with a
// new id, or a fresh mount — waits for it before loading: otherwise it can
// load the old values (the save also syncs shared fields to the rest of the
// association) and its next edit gets a false conflict.
let pendingLeaveSave = Promise.resolve();

function sameFieldValue(a, b) {
	const norm = (v) => {
		if (v === null || v === undefined || v === "") return "";
		if (typeof v === "boolean") return v ? "1" : "0";
		return String(v);
	};
	return norm(a) === norm(b);
}

function diffService(base, next) {
	const changes = {};
	const original = {};

	for (const field of SAVED_FIELDS) {
		if (!sameFieldValue(base?.[field], next?.[field])) {
			changes[field] = next[field];
			original[field] = base?.[field] ?? null;
		}
	}

	return { changes, original, isEmpty: Object.keys(changes).length === 0 };
}

export default function ServiceShow2() {
	const { id } = useParams();
	const defaultService = {
		id: "",
		version: null,
		client_id:"",
		kms:"",
		checkin: "",
		checkout: "",
		malfunction:"",
		service:"",
		car_id:"",
		schedule_id: "",
		note:"",
		is_finished: false,
		
		service_type_id: "",
		service_type_name: "",
		signed_service:"",
		checkout_predict: "2030-01-01",
		r_name: "",
		r_phone: "",

		office_check: false,
	}

	const markedTextarea = useRef();
	const [service, setService] = useState(defaultService);
	const [isAllowedEditing, setIsAllowedEditing] = useState(false);
	const lastSavedServiceRef = useRef(null);

	// Autosave bookkeeping, so leaving a service (another association tab,
	// another page) never drops the last edits:
	// - unsavedServiceRef: the latest edit still waiting on the debounce
	//   timer (saveTimerRef) — flushed right away when leaving.
	// - inFlightSaveRef / serverServiceRef: the save currently on its way
	//   and the newest copy of the service the server returned, so that
	//   flush waits for it and only sends what's still unsaved.
	// - activeIdRef: the service this page is showing now — a save answer
	//   for any other service is ignored instead of being applied here.
	const unsavedServiceRef = useRef(null);
	const saveTimerRef = useRef(null);
	const inFlightSaveRef = useRef(null);
	const serverServiceRef = useRef(null);
	const activeIdRef = useRef(id);
	const [activeSection, setActiveSection] = useState(NAV_SECTIONS[0].id);
	const [saveStatus, setSaveStatus] = useState("idle"); // idle | pending | saving | saved | error | conflict
	const [labServiceTypeId, setLabServiceTypeId] = useState(null);

	useEffect(() => {
		let cancelled = false;

		loadService(() => cancelled);

		return () => { cancelled = true; };
	}, [id]);

	const [clusterMates, setClusterMates] = useState([]);
	const clusterMatesRef = useRef(clusterMates);
	clusterMatesRef.current = clusterMates;
	const clusterMatesRequestIdRef = useRef(null);

	async function loadClusterMates() {
		const requestId = id;
		clusterMatesRequestIdRef.current = requestId;

		try {
			await pendingLeaveSave;
			const response = await api.get(`/services/${requestId}/associations`);
			if (clusterMatesRequestIdRef.current === requestId) {
				setClusterMates(response.data.cluster_mate_list || []);
			}
		} catch (error) {
			if (clusterMatesRequestIdRef.current === requestId) console.error(error);
		}
	}

	useEffect(() => {
		loadClusterMates();
	}, [id]);

	useEffect(() => {
		let cancelled = false;

		async function loadLabServiceTypeId() {
			try {
				const response = await api.get("/service_types");
				if (cancelled) return;

				const labType = (response.data.service_type_list || [])
					.find((st) => st.name === LAB_SERVICE_TYPE_NAME);

				setLabServiceTypeId(labType ? labType.id : null);
			} catch (error) {
				if (!cancelled) console.error(error);
			}
		}

		loadLabServiceTypeId();

		return () => { cancelled = true; };
	}, []);

	useEffect(()=>{
		document.querySelectorAll(".info").forEach((element) => {
			element.addEventListener("mouseenter", () => {
				element.classList.add("show");
			});

			element.addEventListener("mouseleave", () => {
				element.classList.remove("show");
			});
		});
	},[])

	useEffect(() => {
		const OFFSET = 96;
		let ticking = false;

		function updateActiveSection() {
			let current = NAV_SECTIONS[0].id;

			for (const { id } of NAV_SECTIONS) {
				const el = document.getElementById(id);
				if (!el) continue;

				if (el.getBoundingClientRect().top <= OFFSET) {
					current = id;
				} else {
					break;
				}
			}

			setActiveSection((prev) => (prev === current ? prev : current));
		}

		function onScroll() {
			if (ticking) return;
			ticking = true;

			requestAnimationFrame(() => {
				updateActiveSection();
				ticking = false;
			});
		}

		updateActiveSection();

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);

		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, []);

	function scrollToSection(id) {
		document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	const hasScrolledToHash = useRef(false);

	useEffect(() => {
		if (!service?.id) return;
		if (hasScrolledToHash.current) return;

		hasScrolledToHash.current = true;

		const hash = window.location.hash?.slice(1);

		if (hash) {
			scrollToSection(hash);
		}
	}, [service]);

	function handlePrint(mode) {
		document.body.classList.toggle("print-summary", mode === "summary");
		window.print();
	}

	useEffect(() => {
		function resetPrintMode() {
			document.body.classList.remove("print-summary");
		}

		window.addEventListener("afterprint", resetPrintMode);
		return () => window.removeEventListener("afterprint", resetPrintMode);
	}, []);

	const NOTE_SEPARATOR = "\u001E";
	function extractPlainNote(raw) {
		if (typeof raw !== "string") return "";
		const i = raw.indexOf(NOTE_SEPARATOR);
		return i === -1 ? raw : raw.slice(i + NOTE_SEPARATOR.length);
	}

	async function loadService(isCancelled = () => false) {
		try {
			await pendingLeaveSave;
			if (isCancelled()) return;

			const response = await api.get(`/services/${id}`);

			if (isCancelled()) return;

			const merged = {
				...defaultService,
				...response.data.service
			};

			// Set the baseline *before* setService, using this exact object
			// reference, so the autosave effect below sees no real change
			// to save for this load.
			lastSavedServiceRef.current = merged;
			serverServiceRef.current = merged;
			setService(merged);
		} catch (error) {
			if (!isCancelled()) console.error(error);
		}
	}

	// Sends only what differs between `base` (the last known server copy)
	// and `next`. Returns the updated service, or null if nothing changed.
	const patchService = async (base, next) => {
		const { changes, original, isEmpty } = diffService(base, next);
		if (isEmpty || !next?.id) return null;

		const response = await api.patch(`services/${next.id}`, { changes, original });
		const saved = response.data.service ? { ...defaultService, ...response.data.service } : null;
		if (saved) serverServiceRef.current = saved;
		return saved;
	};

	// After a save (or a failed one), the page takes the server's copy as
	// its new baseline but keeps the user's own unsaved edits on top:
	// anything typed after `sent` was sent. A field that was sent takes
	// the server's value — what was stored, which can differ from what was
	// typed (kms "0" is stored as empty); keeping the typed value there
	// would look unsaved forever and resend it in a loop. The exception is
	// a conflict, where nothing was written: pass `unsavedExcept` (the
	// conflicting fields) to keep the other sent changes for the next save.
	function rebaseOnServer(server, base, sent, current, unsavedExcept = null) {
		const baseline = { ...defaultService, ...server };
		const sentChanges = diffService(base, sent).changes;
		let result = baseline;

		for (const field of SAVED_FIELDS) {
			const editedAfterSend = !sameFieldValue(current[field], sent[field]);
			const sentAndKept = unsavedExcept !== null && field in sentChanges && !unsavedExcept.includes(field);

			if ((editedAfterSend || sentAndKept) && !sameFieldValue(current[field], baseline[field])) {
				if (result === baseline) result = { ...baseline };
				result[field] = current[field];
			}
		}

		// If nothing of the user's is left on top, `result` IS the baseline,
		// so the autosave effect sees nothing more to save.
		return { baseline, result };
	}

	// Sends the edit still waiting on the debounce timer immediately (after
	// any save already in flight). Its answer isn't applied to the page —
	// by then it shows another service or is gone.
	function flushUnsavedService() {
		clearTimeout(saveTimerRef.current);

		const pending = unsavedServiceRef.current;
		unsavedServiceRef.current = null;
		if (!pending?.id) return;

		const baseAtFlush = lastSavedServiceRef.current;
		const previous = inFlightSaveRef.current ?? Promise.resolve();

		pendingLeaveSave = previous
			.catch(() => {})
			.then(() => {
				const known = serverServiceRef.current;
				const base = String(known?.id) === String(pending.id) ? known : baseAtFlush;
				return patchService(base, pending);
			})
			.catch((error) => console.error(error, error?.response?.data?.error));
	}

	useEffect(() => {
		activeIdRef.current = id;

		return () => {
			activeIdRef.current = null;
			flushUnsavedService();
			// The status belonged to the service being left.
			setSaveStatus("idle");
		};
	}, [id]);

	// Closing or reloading the tab inside the debounce window: ask first.
	useEffect(() => {
		function onBeforeUnload(e) {
			if (!unsavedServiceRef.current) return;
			e.preventDefault();
			e.returnValue = "";
		}

		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, []);


	useEffect(() => {
		const sentSnapshot = service;

		const isStale = () => String(sentSnapshot.id) !== String(activeIdRef.current);

		const f = async () =>{
			if (unsavedServiceRef.current === sentSnapshot) unsavedServiceRef.current = null;

			const base = lastSavedServiceRef.current;
			if (diffService(base, sentSnapshot).isEmpty) {
				// Only fields the page doesn't save changed — nothing to send.
				lastSavedServiceRef.current = sentSnapshot;
				setSaveStatus("idle");
				return;
			}

			setSaveStatus("saving");

			const request = patchService(base, sentSnapshot);
			inFlightSaveRef.current = request;

			try {
				const s = await request;

				// Answer for a service this page no longer shows (switched
				// tab / left) — don't apply it here.
				if (isStale()) return;

				setSaveStatus("saved");

				// Saída syncs to the rest of the association server-side (DB
				// trigger) and changes their status — refresh the tab bar so
				// it shows straight away. Other fields don't change what the
				// tabs show, so no extra request on every save.
				if (clusterMatesRef.current.length > 0 && !sameFieldValue(base.checkout, sentSnapshot.checkout)) {
					loadClusterMates();
				}

				setService(current => {
					const { baseline, result } = rebaseOnServer(s, base, sentSnapshot, current);
					lastSavedServiceRef.current = baseline;
					return result;
				});
			} catch (error) {
				const data = error?.response?.data;
				const isConflict = error?.response?.status === 409 && data?.service;

				if (isConflict) {
					const labels = (data.conflict_fields || []).map((f) => FIELD_LABELS[f] || f).join(", ");
					pushErrorToast(`${labels || "Um campo"} foi alterado por outro utilizador entretanto — ficou o valor dele. As suas outras alterações foram guardadas.`);
				} else {
					console.error(error, error?.response?.data?.error);
				}

				if (isStale()) return;

				if (isConflict) {
					// Someone else changed one of these fields: theirs is
					// kept for those fields only — the user's other edits
					// stay and get saved on the next round.
					setSaveStatus("conflict");
					serverServiceRef.current = { ...defaultService, ...data.service };
					setService(current => {
						const { baseline, result } = rebaseOnServer(data.service, base, sentSnapshot, current, data.conflict_fields || []);
						lastSavedServiceRef.current = baseline;
						return result;
					});
					return;
				}

				// Rejected (e.g. a rule like kms required to finish). The server
				// can't say which field broke the rule, so when the save had
				// several, each is retried on its own: the ones that go
				// through stay, only the failing ones go back to the server's
				// value. Anything typed since is kept either way.
				setSaveStatus("error");
				const changedFields = Object.keys(diffService(base, sentSnapshot).changes);

				if (changedFields.length > 1) {
					let known = base;

					for (const field of changedFields) {
						try {
							const saved = await patchService(known, { ...known, [field]: sentSnapshot[field] });
							if (saved) known = saved;
						} catch {
							// This one broke the rule — it takes the server's value below.
						}
					}
				}

				try {
					const fresh = (await api.get(`/services/${sentSnapshot.id}`)).data.service;
					if (isStale()) return;
					serverServiceRef.current = { ...defaultService, ...fresh };
					setService(current => {
						const { baseline, result } = rebaseOnServer(fresh, base, sentSnapshot, current);
						lastSavedServiceRef.current = baseline;
						return result;
					});
				} catch {
					if (!isStale()) loadService();
				}
			} finally {
				if (inFlightSaveRef.current === request) inFlightSaveRef.current = null;
			}
		}

		if (!service?.id) return;

		// No real change since the last load/save (covers the initial
		// load and React StrictMode's extra dev-mode effect re-run) —
		// nothing to save.
		if (lastSavedServiceRef.current === service) {
			unsavedServiceRef.current = null;
			return;
		}

		setSaveStatus("pending");
		unsavedServiceRef.current = service;

		const timer = setTimeout(() => {
			f();
		}, 500);
		saveTimerRef.current = timer;

		return () => clearTimeout(timer);
	}, [service]);

	useEffect(() => {
		if (saveStatus !== "saved" && saveStatus !== "error" && saveStatus !== "conflict") return;

		const timer = setTimeout(() => {
			setSaveStatus("idle");
		}, saveStatus === "saved" ? 2000 : 5000);

		return () => clearTimeout(timer);
	}, [saveStatus]);

	/* USER TIME */
	const[uts,setUts] = useState([]);
	const[utps,setUtps] = useState([]);
	const[timeSummary,setTimeSummary] = useState([]);
	useEffect(()=>{ setTimeSummary(sumUserMinutes(uts,utps)); },[uts,utps]);

	const  sumUserMinutes = (arr1, arr2) => { 
		const users = {};
		[...arr1, ...arr2].forEach(({ user_id, user_name, minutes }) => { 
			if (!users[user_id]) { 
				users[user_id] = { user_id, user_name, minutes: 0, }; 
			} 
			users[user_id].minutes += minutes??0; 
		}); 
		return Object.values(users);
	}

	const formatMinutes = (minutes) => {
		const m = minutes ?? 0;
		const h = Math.floor(m / 60);
		const rest = m % 60;
		return h > 0 ? `${h}h ${rest}m` : `${rest}m`;
	}

	/*const getServiceStatus = () => {
		if(service?.checkout) return {index: 3, desc:"Entregue"};
		if(service?.office_check) return {index: 2, desc:"Validado"};
		if(service?.is_finished) return {index: 1, desc:"Terminado"};
		return {index: 0, desc:"Por Terminar"}; 
	}
	const getStateClass = () => {
		switch(getServiceStatus().index){
			case 0: return "state-not-finished-bg";
			case 1: return "state-finished-bg";
			case 2: return "state-validated-bg";
			case 3: return "state-delivered-bg";
			default: return "";
		}
	}*/
	// Saves one field right away (bypassing the debounce), keeping any other
	// edit still waiting to be autosaved.
	const saveFieldNow = async (field, value) => {
		const base = lastSavedServiceRef.current;
		if (!base?.id) return;

		try {
			const s = await patchService(base, { ...base, [field]: value });
			if (!s || String(s.id) !== String(activeIdRef.current)) return;

			setService(current => {
				const { baseline, result } = rebaseOnServer(s, base, base, current);
				lastSavedServiceRef.current = baseline;
				return result;
			});
			loadClusterMates();
		} catch (error) {
			console.error(error, error?.response?.data?.error);
		}
	};

	const handleClickCheckIsFinished = (checked) => saveFieldNow("is_finished", checked);

	// Bypasses the debounced autosave — a quick "leave the page right after
	// checking it" is common enough with this specific field that waiting
	// out the debounce risks losing the change entirely.
	const handleOfficeCheckChange = (checked) => saveFieldNow("office_check", checked);

	const [apReload, setApReload] = useState(false);
	const [aps, setAps] = useState([]);

	const isFinished = !!service.is_finished;
	const canEditCarClient = isAllowedEditing && !isFinished;

	const isLabService = labServiceTypeId != null
		&& Number(service.service_type_id) === Number(labServiceTypeId);

	const visibleNavSections = NAV_SECTIONS.filter((section) => !section.labOnly || isLabService);

	return(
		<div className="service-page">
			<div className="service-layout">
				<nav className="service-nav">
					<button type="button" className="service-nav-print" onClick={() => handlePrint("agreement")}>
						<i className="fa-solid fa-print" /> Imprimir
					</button>
					<button type="button" className="service-nav-print" onClick={() => handlePrint("summary")}>
						<i className="fa-solid fa-file-lines" /> Imprimir Resumo
					</button>
					{saveStatus !== "idle" && (
						<div className={`service-save-status service-save-status-${saveStatus}`}>
							{saveStatus === "pending" && <><i className="fa-regular fa-circle"/> Alterações por guardar</>}
							{saveStatus === "saving" && <><i className="fa-solid fa-spinner fa-spin"/> A guardar...</>}
							{saveStatus === "saved" && <><i className="fa-solid fa-circle-check"/> Guardado</>}
							{saveStatus === "error" && <><i className="fa-solid fa-triangle-exclamation"/> Erro ao guardar</>}
						{saveStatus === "conflict" && <><i className="fa-solid fa-triangle-exclamation"/> Alterado por outro utilizador — dados recarregados</>}
						</div>
					)}
					{visibleNavSections.map((section) => (
						<button
							key={section.id}
							type="button"
							className={activeSection === section.id ? "active" : ""}
							onClick={() => scrollToSection(section.id)}
						>
							<i className={`fa-solid ${section.icon}`} />
							{section.label}
						</button>
					))}
				</nav>
				<div className="content">
					<ServiceClusterTabs
						currentId={id}
						currentService={service}
						clusterMates={clusterMates}
						onLinked={loadClusterMates}
					/>
					<ServiceHeader
						service={service}
						onServiceChange={
							(field, value) =>
								setService(prev => ({
									...prev,
									[field]: value,
								}))
						}
						onOfficeCheckChange={handleOfficeCheckChange}
						lock={!isAllowedEditing}
						onLockChange={()=>{setIsAllowedEditing(!isAllowedEditing)}}
						clusterMates={clusterMates}
					/>
					<div className="service-section" id="section-car">
						<h1 className="print-title">
							Informação da viatura
						</h1>
						<CarPicker
							car_id={service.car_id}
							onCarIdChange={(value)=>setService(prev => (
								prev.car_id === value
									? prev :
									{...prev, car_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
						/>
					</div>
					<div className="service-section" id="section-client">
						<h1 className="print-title">
							Informação do cliente
						</h1>
						<ClientPicker
							client_id={service.client_id}
							onClientIdChange={(value)=>setService(prev => (
								prev.client_id === value
									? prev :
									{...prev, client_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
						/>
					</div>
					<div className="service-signed-info-card" id="section-agreed">
					<div className="header">
						<i className="fa-solid fa-pen-fancy"/> 
						<h1>Serviço Acordado</h1>
					</div>
					<div className="body">
						<div className="text-entry">
							<label htmlFor=""disabled={!isAllowedEditing || isFinished}>Descrição de Avaria</label>
							<textarea
								type="text"
								value={service.malfunction??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									malfunction:e.target.value
								}))}
								disabled={!isAllowedEditing || isFinished}/>
						</div>
						<div className="text-entry">
							<label htmlFor="malfunction">Serviço a Realizar</label>
							<textarea
								type="text"
								value={service.signed_service??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									signed_service:e.target.value
								}))}
								disabled={!isAllowedEditing || isFinished}/>
						</div>
					</div>
					<div className="text-entry" id="signing">
						<p>Eu, <span>{service?.r_name??"".trim()?service?.r_name:"______________________________"}</span> , tomei conhecimento e autorizo a realização do serviço acima indicado e contacto através do nrº <span>{service?.r_phone??"".trim()?service?.r_phone:"______________________________"}</span>.</p>
						<p>Assinatura: ________________________________</p>
					</div>
				</div>
				<div className="service-done-info-card" id="section-done">
					<div className="header">
						<i className="fa-solid fa-wrench"></i>
						<h1>Serviço Realizado</h1>
					</div>	
					<div className="body">

						<div className="text-entry">
							<label htmlFor="malfunction">Serviço Realizado</label>
							<textarea
								type="text"
								value={service.service??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									service:e.target.value
								}))}
								disabled={isFinished}
							/>
						</div>

						<div className="coloring-buttons">
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-red");
								}}
							><i className="fa-solid fa-square-pen note-red-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-yellow");
								}}
							><i className="fa-solid fa-square-pen note-yellow-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.markSelection("note-green");
								}}
							><i className="fa-solid fa-square-pen note-green-button"/></button>
							<button
								onClick={()=>{
									markedTextarea.current.unmarkSelection();
								}}
							><i className="fa-regular fa-square f"/></button>

						</div>

						<div className="text-entry">
							<label htmlFor="">Notas/Observações</label>

							<MarkedTextarea
								ref={markedTextarea}
								value={service.note??""}
								onChange={(newValue) => {
									setService(prev => ({
										...prev,
										note: newValue,
									}));
								}}
							/>
						</div>
					</div>
				</div>
				{isLabService && (
					<div className="service-lab-card" id="section-lab">
						<div className="header">
							<i className="fa-solid fa-flask"/>
							<h1>Laboratório</h1>
						</div>
						<div className="body">
							<ServiceLab id={id} disabled={isFinished} />
						</div>
					</div>
				)}
				<div className="service-products-requested-card" id="section-requested">
					<div className="header">
						<i className="fa-solid fa-cart-arrow-down"/>
						<h1>Pedido de Produtos</h1>
					</div>	
					<div className="body">
						<ProductsRequested key={id} id={id} onProductForwarded={()=>setApReload(true)} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-applied-products-card" id="section-applied">
					<div className="header">
						<i className="fa-solid fa-store"></i>
						<h1>Produtos Aplicados</h1>
					</div>	
					<div className="body">
						<AppliedProducts key={id} id={id} apReload={apReload} onApReloaded={()=>setApReload(false)} copy_aps={setAps} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-user-times-card" id="section-times">
					<div className="header">
						<i className="fa-solid fa-hourglass-half"></i>
						<h1>Tempos de Serviço</h1>
					</div>	
					<div className="body">
						<table className="times-summary">
							<thead>
								<tr>
									<th>Funcionário</th>
									<th>Tempo</th>
								</tr>
							</thead>
							<tbody>
								{timeSummary.map(ts=>(
									<tr key={ts.user_id}>
										<td>{ts.user_name}</td>
										<td>{ts.minutes}</td>
									</tr>
								))}
							</tbody>
						</table>
						<UserTimes key={`ut-${id}`} id={id} copy_uts={setUts} disabled={isFinished} checkin={service.checkin} checkout={service.checkout}/>
						<UserTimePunches key={`utp-${id}`} id={id} copy_uts={setUtps} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-is-finished-card" id="section-finished">
					<label htmlFor="is-finished">
						<div className="header">
							<i className="fa-solid fa-flag-checkered"></i>
							<h1>Finalizado</h1>
							<input
								id="is-finished"
								type="checkbox"
								checked={service.is_finished}
								onChange={(e) => {handleClickCheckIsFinished(e.target.checked); }}
							/>
						</div>
					</label>
				</div>
				<div className="print-summary-block">
					<h1>Resumo do Serviço #{service.id}</h1>

					<div className="print-summary-grid">
						<div><strong>Viatura:</strong> {[service.car_plate, service.car_make_name, service.car_model_name].filter(Boolean).join(" - ") || "-"}</div>
						<div><strong>Cliente:</strong> {service.client_name || "-"}</div>
						<div><strong>Telemóvel:</strong> {service.client_phone || "-"}</div>
						<div><strong>Tipo de Serviço:</strong> {service.service_type_name || "-"}</div>
						<div><strong>Entrada:</strong> {service.checkin || "-"}</div>
						<div><strong>Saída:</strong> {service.checkout || "-"}</div>
						<div><strong>Kms:</strong> {service.kms || "-"}</div>
					</div>

					<h2>Descrição de Avaria</h2>
					<p>{service.malfunction || "-"}</p>

					<h2>Serviço Realizado</h2>
					<p>{service.service || "-"}</p>

					<h2>Notas/Observações</h2>
					<p>{extractPlainNote(service.note) || "-"}</p>

					<h2>Produtos Aplicados</h2>
					{aps.length === 0 ? (
						<p>Sem produtos aplicados.</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Referência</th>
									<th>Tipo</th>
									<th>Qt.</th>
									<th>Aplicado</th>
								</tr>
							</thead>
							<tbody>
								{aps.map((ap) => (
									<tr key={ap.sap_id}>
										<td>{ap.product_name || "-"}</td>
										<td>{ap.product_reference || "-"}</td>
										<td>{ap.product_type_name || "-"}</td>
										<td>{ap.quantity}</td>
										<td>{ap.is_applied == "1" ? "Sim" : "Não"}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}

					<h2>Tempo dos Funcionários</h2>
					{timeSummary.length === 0 ? (
						<p>Sem tempos registados.</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Funcionário</th>
									<th>Tempo</th>
								</tr>
							</thead>
							<tbody>
								{timeSummary.map(ts => (
									<tr key={ts.user_id}>
										<td>{ts.user_name}</td>
										<td>{formatMinutes(ts.minutes)}</td>
									</tr>
								))}
								<tr>
									<td><strong>Total</strong></td>
									<td><strong>{formatMinutes(timeSummary.reduce((sum, ts) => sum + (ts.minutes ?? 0), 0))}</strong></td>
								</tr>
							</tbody>
						</table>
					)}
				</div>
				</div>
			</div>
		</div>

	);
}
