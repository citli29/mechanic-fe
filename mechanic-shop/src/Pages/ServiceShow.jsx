import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "./../api/axios";
import BackButton from "../components/BackButton/BackButton";
import { notifyNotificationsUpdated } from "../utils/notificationView";
import { useVisiblePoll } from "../utils/useVisiblePoll";
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
// HIDDEN-PRODUCTS-REQUESTED (testing without it; uncomment to restore)
// import { ProductsRequested } from "./ProductsRequested";
import { ServiceLab } from "./ServiceLab";
import { QuoteProductPicker } from "./QuoteProductPicker";
import LabSummaryList from "../components/LabSummary/LabSummaryList";

// Id of an orçamento created on screen but not yet saved (Guardar).
const NEW_QUOTE_ID = "new";

const NAV_SECTIONS = [
	{ id: "section-car", label: "Viatura", icon: "fa-car" },
	{ id: "section-client", label: "Cliente", icon: "fa-user" },
	{ id: "section-agreed", label: "Serviço Acordado", icon: "fa-pen-fancy" },
	{ id: "section-done", label: "Serviço Realizado", icon: "fa-wrench" },
	{ id: "section-lab", label: "Laboratório", icon: "fa-flask", labOnly: true },
	// HIDDEN-PRODUCTS-REQUESTED (testing without it; uncomment to restore)
	// { id: "section-requested", label: "Pedido de Produtos", icon: "fa-cart-arrow-down" },
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
	const [labSummary, setLabSummary] = useState([]);

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

	// "Imprimir" / "Imprimir Resumo" open the print page (Pages/ServicePrint)
	// in a new tab; it prints when its own Imprimir is clicked (the signing
	// text can be edited there first). It reads the service from the API, so an edit still in
	// the autosave window is saved first (waits up to ~5 s). The tab is
	// opened right away (inside the click, so it isn't blocked as a popup)
	// and pointed at the page once the save is done.
	const saveStatusRef = useRef(saveStatus);
	saveStatusRef.current = saveStatus;
	async function handlePrint(doc) {
		const url = `/services/${id}/imprimir?doc=${doc}`;
		const printTab = window.open("", "_blank");
		for(let waited = 0; waited < 5000 && ["pending", "saving"].includes(saveStatusRef.current); waited += 100){
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		if(printTab) printTab.location.href = url;
		else window.open(url, "_blank");
	}

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
	const [isQuoteOpen, setIsQuoteOpen] = useState(false);
	// Orçamentos are saved in the backend (/services/{id}/budgets, each
	// with its products). The page keeps its own shape for them: done →
	// is_realized, product_name/reference/type_name → name/reference/type.
	const [quotes, setQuotes] = useState([]);
	const [activeQuoteId, setActiveQuoteId] = useState(null);
	// Falls back to the last tab when the open one was deleted.
	const activeQuote = quotes.find(q => q.id === activeQuoteId) ?? quotes[quotes.length - 1];
	const realizedQuoteCount = quotes.filter(q => q.is_realized).length;
	// Phone: the tabs collapse into a dropdown (the open orçamento + ▼).
	const [isQuoteMenuOpen, setIsQuoteMenuOpen] = useState(false);
	const quoteTabsRef = useRef(null);
	useEffect(() => {
		if (!isQuoteMenuOpen) return;
		const onDown = (e) => {
			if (quoteTabsRef.current && !quoteTabsRef.current.contains(e.target)) setIsQuoteMenuOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [isQuoteMenuOpen]);
	const quoteProductFromApi = (bp) => ({
		id: bp.id,
		product_id: bp.product_id,
		name: bp.product_name ?? "",
		reference: bp.product_reference ?? "",
		type: bp.product_type_name ?? "",
		quantity: bp.quantity,
		// "Pedir": this product is to be ordered.
		to_order: !!Number(bp.to_order),
	});
	const quoteFromApi = (b) => ({
		id: b.id,
		title: b.title ?? "",
		note: b.note ?? "",
		is_realized: !!Number(b.done),
		products: (b.products ?? []).map(quoteProductFromApi),
	});
	// A new orçamento only exists on screen (id NEW_QUOTE_ID) until its
	// first Guardar, so reloading keeps it.
	// Which service the loaded quotes belong to (for ?orcamento= below).
	const [quotesLoadedFor, setQuotesLoadedFor] = useState(null);
	const loadQuotes = async () => {
		try{
			const response = await api.get(`services/${id}/budgets`);
			const list = (response.data.budget_list ?? []).map(quoteFromApi);
			setQuotes(prev => [...list, ...prev.filter(q => q.id === NEW_QUOTE_ID)]);
		}catch(error){console.error(error, error?.response?.data?.error)}
		finally{ setQuotesLoadedFor(id); }
	};
	useEffect(() => {
		setQuotes([]);
		setActiveQuoteId(null);
		setQuoteDraft(null);
		setQuotesLoadedFor(null);
		loadQuotes();
	}, [id]);
	// Tells the escritório an orçamento was created / edited. The text and
	// the link it opens are decided by the backend, in
	// Oficina_Lima/api/app/Services/BudgetNotification.php. A failure here
	// only logs; the orçamento itself is already saved.
	const notifyQuote = async (quoteId, event) => {
		try{
			await api.post(`services/${id}/budgets/${quoteId}/notify`, { event });
			notifyNotificationsUpdated();
		}catch(error){console.error(error, error?.response?.data?.error)}
	};
	// services/{id}?orcamento={budget id} (the notification link) opens the
	// card on that orçamento and scrolls to it, then drops the param.
	const [searchParams, setSearchParams] = useSearchParams();
	const wantedQuoteId = Number(searchParams.get("orcamento")) || null;
	const quoteCardRef = useRef(null);
	useEffect(() => {
		if(wantedQuoteId == null || quotesLoadedFor !== id) return;
		if(!quoteDraft && quotes.some(q => q.id === wantedQuoteId)){
			setActiveQuoteId(wantedQuoteId);
			setIsQuoteOpen(true);
			setTimeout(() => quoteCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
		}
		setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete("orcamento"); return next; }, { replace: true });
	}, [wantedQuoteId, quotesLoadedFor, id]);
	// Editing an orçamento (title, products, quantities) works on a draft:
	// nothing is sent until Guardar, and Cancelar throws it away. One at a
	// time; while it's open the other tabs and + are locked so it can't be
	// lost by switching. Products added in the draft get a temporary id.
	// quoteDraft = { quoteId, isNew, title, products } or null. Each product
	// carries its own to_order ("Pedir"), sent with Guardar while editing.
	const [quoteDraft, setQuoteDraft] = useState(null);
	const [isSavingQuote, setIsSavingQuote] = useState(false);
	const draftProductSeq = useRef(0);
	const isEditingQuote = activeQuote != null && quoteDraft?.quoteId === activeQuote.id;
	// What the open tab shows: the draft while editing, else the saved one.
	const shownQuote = isEditingQuote
		? { ...activeQuote, title: quoteDraft.title, products: quoteDraft.products }
		: activeQuote;
	const isQuoteDraftValid = isEditingQuote && quoteDraft.products.every(p => Number.isInteger(p.quantity) && p.quantity >= 1);
	const handleClickEditQuote = () => {
		if(!activeQuote || activeQuote.is_realized || quoteDraft) return;
		setQuoteDraft({
			quoteId: activeQuote.id,
			isNew: false,
			title: activeQuote.title,
			products: activeQuote.products.map(p => ({ ...p })),
		});
	};
	const handleCancelQuoteEdit = () => {
		if(isSavingQuote) return;
		if(quoteDraft?.isNew) setQuotes(prev => prev.filter(q => q.id !== NEW_QUOTE_ID));
		setQuoteDraft(null);
	};
	// Guardar with no products asks first: save it empty, or discard
	// (a new one is dropped, an existing one goes back to what was saved).
	const [isConfirmEmptyQuoteOpen, setIsConfirmEmptyQuoteOpen] = useState(false);
	const handleClickSaveQuote = () => {
		if(isEditingQuote && quoteDraft.products.length === 0){
			setIsConfirmEmptyQuoteOpen(true);
			return;
		}
		handleSaveQuote();
	};
	useEffect(() => {
		if(!isConfirmEmptyQuoteOpen) return;
		const onKey = (e) => { if(e.key === "Escape") setIsConfirmEmptyQuoteOpen(false); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isConfirmEmptyQuoteOpen]);
	const updateQuoteDraft = (changes) => setQuoteDraft(prev => prev && { ...prev, ...changes });
	// Sends the draft as the changes against the saved orçamento: create it
	// if new, then title, removed / changed / added products. If something
	// fails half-way, the page shows what the server ended up with.
	const handleSaveQuote = async () => {
		if(!isEditingQuote || isSavingQuote || !isQuoteDraftValid) return;
		const draft = quoteDraft;
		const saved = quotes.find(q => q.id === draft.quoteId);
		let quoteId = draft.isNew ? null : draft.quoteId;
		let isChanged = draft.isNew;
		// Only Pedir ticks changed → "Orçamento para pedir" instead of "editado".
		let isOtherChange = draft.isNew;
		let hasNewToOrder = false;
		setIsSavingQuote(true);
		try{
			if(draft.isNew){
				const response = await api.post(`services/${id}/budgets`, { title: draft.title });
				quoteId = quoteFromApi(response.data.budget).id;
			}else if(draft.title !== saved.title){
				await api.patch(`services/${id}/budgets/${quoteId}`, { title: draft.title });
				isChanged = true;
				isOtherChange = true;
			}
			const savedProducts = draft.isNew ? [] : saved.products;
			const base = `services/${id}/budgets/${quoteId}/products`;
			for(const p of savedProducts){
				if(!draft.products.some(d => d.id === p.id)){ await api.delete(`${base}/${p.id}`); isChanged = true; isOtherChange = true; }
			}
			for(const d of draft.products){
				const before = savedProducts.find(p => p.id === d.id);
				if(!before){
					await api.post(base, { product_id: d.product_id, quantity: d.quantity, to_order: !!d.to_order });
					isChanged = true;
					isOtherChange = true;
				}else{
					const changes = {};
					if(before.quantity !== d.quantity){ changes.quantity = d.quantity; isOtherChange = true; }
					if(!!before.to_order !== !!d.to_order){
						changes.to_order = !!d.to_order;
						if(d.to_order) hasNewToOrder = true;
						else isOtherChange = true;
					}
					if(Object.keys(changes).length){ await api.patch(`${base}/${d.id}`, changes); isChanged = true; }
				}
			}
			setQuoteDraft(null);
			// Only when everything went through, and something actually changed.
			if(isChanged) notifyQuote(quoteId, draft.isNew ? "created" : (!isOtherChange && hasNewToOrder) ? "to_order" : "edited");
		}catch(error){
			console.error(error, error?.response?.data?.error);
			// Nothing saved yet: keep the draft so Guardar can be tried again.
			if(quoteId == null) return;
			setQuoteDraft(null);
		}finally{
			setIsSavingQuote(false);
		}
		setQuotes(prev => prev.filter(q => q.id !== NEW_QUOTE_ID));
		setActiveQuoteId(quoteId);
		await loadQuotes();
	};
	// Confirmation shown when "Adicionar Orçamento" is clicked while
	// orçamentos already exist.
	const [isConfirmNewQuoteOpen, setIsConfirmNewQuoteOpen] = useState(false);
	const handleClickAddQuote = () => {
		if(quotes.length > 0){
			setIsConfirmNewQuoteOpen(true);
			return;
		}
		addQuote();
	};
	const handleConfirmNewQuote = () => {
		setIsConfirmNewQuoteOpen(false);
		addQuote();
	};
	useEffect(() => {
		if(!isConfirmNewQuoteOpen) return;
		const onKey = (e) => { if(e.key === "Escape") setIsConfirmNewQuoteOpen(false); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isConfirmNewQuoteOpen]);
	// Un-marking an orçamentado orçamento asks first, so it isn't undone
	// by a stray click; marking it goes straight through.
	const [quoteToUnmark, setQuoteToUnmark] = useState(null);
	const handleClickToggleQuoteStatus = (quote) => {
		if(quote.is_realized){
			setQuoteToUnmark(quote);
			return;
		}
		saveQuoteStatus(quote.id, true);
	};
	const handleConfirmUnmarkQuote = () => {
		saveQuoteStatus(quoteToUnmark.id, false);
		setQuoteToUnmark(null);
	};
	// Orçamentado locks everything but the note (DB triggers); the button
	// is disabled while the orçamento is being edited, so no draft is lost.
	const saveQuoteStatus = async (quoteId, isRealized) => {
		try{
			const response = await api.patch(`services/${id}/budgets/${quoteId}`, { done: isRealized });
			const saved = quoteFromApi(response.data.budget);
			setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, is_realized: saved.is_realized } : q));
		}catch(error){console.error(error, error?.response?.data?.error)}
	};
	// "Pedir" per product, and "Pedir todo" = a shortcut that's ticked when
	// every product is (unticking one product unticks it). Like the rest of
	// the orçamento they only change while editing (Editar) and are saved
	// with Guardar; Orçamentado locks them (no Editar then).
	const handleToggleProductToOrder = (product) => {
		if(!isEditingQuote) return;
		updateQuoteProduct(product.id, "to_order", !product.to_order);
	};
	const handleToggleAllToOrder = (products) => {
		if(!isEditingQuote || products.length === 0) return;
		const next = !products.every(p => p.to_order);
		setQuoteDraft(prev => prev && { ...prev, products: prev.products.map(p => ({ ...p, to_order: next })) });
	};
	useEffect(() => {
		if(!quoteToUnmark) return;
		const onKey = (e) => { if(e.key === "Escape") setQuoteToUnmark(null); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [quoteToUnmark]);
	// Opens straight in edit mode, on screen only until Guardar.
	const addQuote = () => {
		if(quoteDraft) return;
		const title = `Orçamento #${quotes.length + 1}`;
		setQuotes(prev => [...prev, { id: NEW_QUOTE_ID, title, note: "", is_realized: false, products: [] }]);
		setQuoteDraft({ quoteId: NEW_QUOTE_ID, isNew: true, title, products: [] });
		setActiveQuoteId(NEW_QUOTE_ID);
		setIsQuoteOpen(true);
	};
	// Orçamento waiting on the delete confirmation modal (null = closed).
	const [quoteToDelete, setQuoteToDelete] = useState(null);
	const deleteQuote = async (quoteId) => {
		try{
			// notify=1: the backend also tells the escritório ("Orçamento apagado").
			await api.delete(`services/${id}/budgets/${quoteId}`, { params: { notify: 1 } });
			notifyNotificationsUpdated();
			setQuotes(prev => prev.filter(q => q.id !== quoteId));
			setQuoteDraft(prev => prev?.quoteId === quoteId ? null : prev);
		}catch(error){console.error(error, error?.response?.data?.error)}
	};
	const handleClickDeleteQuote = (quoteId) => {
		// Never saved: just drop it.
		if(quoteId === NEW_QUOTE_ID){
			handleCancelQuoteEdit();
			return;
		}
		// An empty orçamento goes straight away; one with products asks first.
		const quote = quotes.find(q => q.id === quoteId);
		if(quote?.products.length > 0){
			setQuoteToDelete(quote);
			return;
		}
		deleteQuote(quoteId);
	};
	const handleConfirmDeleteQuote = () => {
		deleteQuote(quoteToDelete.id);
		setQuoteToDelete(null);
	};
	useEffect(() => {
		if(!quoteToDelete) return;
		const onKey = (e) => { if(e.key === "Escape") setQuoteToDelete(null); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [quoteToDelete]);
	// Product rows only change the draft; Guardar sends them.
	const handleSelectQuoteProduct = (product) => {
		draftProductSeq.current += 1;
		setQuoteDraft(prev => prev && {
			...prev,
			products: [...prev.products, {
				id: `draft-${draftProductSeq.current}`,
				product_id: product.product_id,
				name: product.name,
				reference: product.reference,
				type: product.type,
				quantity: product.quantity ?? 1,
				to_order: false,
			}],
		});
	};
	// An empty / invalid quantity just keeps Guardar disabled.
	const updateQuoteProduct = (productId, field, value) => {
		setQuoteDraft(prev => prev && {
			...prev,
			products: prev.products.map(p => p.id === productId ? { ...p, [field]: value } : p),
		});
	};
	const handleClickDeleteQuoteProduct = (productId) => {
		setQuoteDraft(prev => prev && { ...prev, products: prev.products.filter(p => p.id !== productId) });
	};
	// The note is locked until "Editar"; ✓ saves it, ✗ / Esc drops the
	// changes. Like the lab action notes. quoteNoteDraft is the text being
	// edited, for the orçamento editingNoteQuoteId (null = not editing).
	const [editingNoteQuoteId, setEditingNoteQuoteId] = useState(null);
	const [quoteNoteDraft, setQuoteNoteDraft] = useState("");
	const [isSavingQuoteNote, setIsSavingQuoteNote] = useState(false);
	const isEditingQuoteNote = activeQuote != null && editingNoteQuoteId === activeQuote.id;
	// Picks up orçamentos changed elsewhere (e.g. the escritório marking one
	// Orçamentado), but never while one or its note is being edited or saved,
	// so nothing being typed is replaced.
	useVisiblePoll(() => {
		if(quoteDraft || editingNoteQuoteId != null || isSavingQuote || isSavingQuoteNote) return;
		loadQuotes();
	}, 30000);
	const quoteNoteRef = useRef(null);
	// Cursor at the end of the text when editing starts.
	useEffect(() => {
		const el = quoteNoteRef.current;
		if(!isEditingQuoteNote || !el) return;
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}, [isEditingQuoteNote]);
	const handleClickEditQuoteNote = () => {
		setQuoteNoteDraft(activeQuote.note);
		setEditingNoteQuoteId(activeQuote.id);
	};
	const handleCancelQuoteNote = () => {
		setEditingNoteQuoteId(null);
		setQuoteNoteDraft("");
	};
	const handleSaveQuoteNote = async () => {
		if(isSavingQuoteNote) return;
		const quoteId = editingNoteQuoteId;
		setIsSavingQuoteNote(true);
		try{
			const previousNote = quotes.find(q => q.id === quoteId)?.note;
			const response = await api.patch(`services/${id}/budgets/${quoteId}`, { note: quoteNoteDraft });
			const saved = quoteFromApi(response.data.budget);
			if(saved.note !== previousNote) notifyQuote(quoteId, "edited");
			setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, note: saved.note } : q));
			handleCancelQuoteNote();
		}catch(error){console.error(error, error?.response?.data?.error)}
		finally{ setIsSavingQuoteNote(false); }
	};
	// Leaving the tab (or the service) drops an unsaved edit.
	useEffect(() => {
		if(editingNoteQuoteId != null && editingNoteQuoteId !== activeQuote?.id) handleCancelQuoteNote();
	}, [activeQuote?.id]);
	useEffect(() => { handleCancelQuoteNote(); }, [id]);
	// The note grows with its text from 1 line up to the CSS max-height (3
	// lines), then scrolls.
	const autoGrowQuoteNote = (el) => {
		if(!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
	};
	const [aps, setAps] = useState([]);

	const isFinished = !!service.is_finished;
	const canEditCarClient = isAllowedEditing && !isFinished;

	const isLabService = labServiceTypeId != null
		&& Number(service.service_type_id) === Number(labServiceTypeId);

	const showLabSummary = isLabService && labSummary.length > 0;
	const visibleNavSections = NAV_SECTIONS.filter((section) => !section.labOnly || isLabService);

	return(
		<div className="service-page">
			<div className="service-layout">
				{/* Left column: Voltar on top of the section nav, sticky together. */}
				<aside className="service-side">
				{/* Same as the browser's ← (opened directly → Serviços). */}
				<BackButton fallback="/services" />
				<nav className="service-nav">
					<button type="button" className="service-nav-print" onClick={() => handlePrint("folha")}>
						<i className="fa-solid fa-print" /> Termo de Responsabilidade
					</button>
					<button type="button" className="service-nav-print" onClick={() => handlePrint("resumo")}>
						<i className="fa-solid fa-print" /> Resumo de Serviço
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
				</aside>
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
						<CarPicker
							car_id={service.car_id}
							onCarIdChange={(value)=>setService(prev => (
								prev.car_id === value
									? prev :
									{...prev, car_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
							confirmRemove
						/>
					</div>
					<div className="service-section" id="section-client">
						<ClientPicker
							client_id={service.client_id}
							onClientIdChange={(value)=>setService(prev => (
								prev.client_id === value
									? prev :
									{...prev, client_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
							confirmRemove
						/>
					</div>
					<div className="service-signed-info-card" id="section-agreed">
					<div className="header">
						<i className="fa-solid fa-pen-fancy"/> 
						<h1>Serviço Acordado</h1>
					</div>
					<div className="body">
						{showLabSummary && (
							<LabSummaryList items={labSummary} title="Descrição de Avaria" onClick={() => scrollToSection("section-lab")} />
						)}
						<div className={`text-entry ${showLabSummary ? "no-label" : ""}`}>
							{!showLabSummary && (
								<label htmlFor=""disabled={!isAllowedEditing || isFinished}>Descrição de Avaria</label>
							)}
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
							<ServiceLab id={id} disabled={isFinished} onSummaryChange={setLabSummary} />
						</div>
					</div>
				)}
				{/* HIDDEN-PRODUCTS-REQUESTED (testing without it; uncomment to restore)
				<div className="service-products-requested-card" id="section-requested">
					<div className="header">
						<i className="fa-solid fa-cart-arrow-down"/>
						<h1>Pedido de Produtos</h1>
					</div>	
					<div className="body">
						<ProductsRequested key={id} id={id} onProductForwarded={()=>setApReload(true)} disabled={isFinished}/>
					</div>
				</div>
				*/}
				{/* Reuses the Applied Products card/table styling. Shown and
				   editable on finished services too (user's call, for now). */}
				<div ref={quoteCardRef} className={`service-applied-products-card service-quote-card ${quotes.length > 0 && !isQuoteOpen ? "collapsed" : ""}`}>
					{/* The whole header shows / hides the orçamentos (once there are any). */}
					<div
						className={`header ${quotes.length > 0 ? "is-toggle" : ""}`}
						{...(quotes.length > 0 ? {
							role: "button",
							tabIndex: 0,
							"aria-expanded": isQuoteOpen,
							title: isQuoteOpen ? "Ocultar Orçamentos" : "Mostrar Orçamentos",
							onClick: () => setIsQuoteOpen(prev => !prev),
							onKeyDown: (e) => {
								if(e.key === "Enter" || e.key === " "){ e.preventDefault(); setIsQuoteOpen(prev => !prev); }
							},
						} : {})}
					>
						<i className="fa-solid fa-file-invoice"/>
						<h1>Orçamento</h1>
						{/* orçamentados/total badge: gray with none, red while some are
						   missing, green when all are done. */}
						<span
							className={`service-quote-badge ${
								quotes.length === 0 ? "" : realizedQuoteCount === quotes.length ? "all-done" : "missing"
							}`}
							title="Orçamentados / Total"
						>
							{realizedQuoteCount}/{quotes.length}
						</span>
						{quotes.length > 0 && (
							<span className="service-quote-toggle" aria-hidden="true">
								<i className={`fa-solid ${isQuoteOpen ? "fa-chevron-up" : "fa-chevron-down"}`}/>
							</span>
						)}
					</div>
					<div className="body">
						{/* Only before the first orçamento; after that the + beside
						   the tabs adds new ones. */}
						{quotes.length === 0 && (
							<div className="service-quote-buttons">
								<button type="button" className="service-request-quote service-add-quote" onClick={handleClickAddQuote}>
									<i className="fa-solid fa-plus"/>
									Adicionar Orçamento
								</button>
							</div>
						)}
						{isQuoteOpen && activeQuote && (
							<div className="service-quote">
								{/* One tab per orçamento; the open one's title is editable in place. */}
								<div ref={quoteTabsRef} className={`service-quote-tabs ${isQuoteMenuOpen ? "menu-open" : ""}`}>
									{quotes.map((quote) => quote.id === activeQuote.id ? (
										<div key={quote.id} className={`service-quote-tab active ${quote.is_realized ? "realized" : ""}`}>
											<i className={`service-quote-tab-status ${quote.is_realized ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`} title={quote.is_realized ? "Orçamentado" : "Não orçamentado"}/>
											<input
												type="text"
												size={Math.max(shownQuote.title.length, 10)}
												maxLength={96}
												value={shownQuote.title}
												placeholder="Título do orçamento"
												readOnly={!isEditingQuote}
												onChange={(e)=>updateQuoteDraft({ title: e.target.value })}
											/>
											{isEditingQuote && (
												<button type="button" className="cancel" title="Apagar orçamento" onClick={()=>handleClickDeleteQuote(quote.id)}><i className="fa-solid fa-trash"/></button>
											)}
											{/* Phone only (CSS): opens the orçamentos dropdown. */}
											{quotes.length > 1 && (
												<button type="button" className="service-quote-menu-toggle" title="Escolher orçamento" onClick={()=>setIsQuoteMenuOpen(prev=>!prev)}>
													<i className={`fa-solid ${isQuoteMenuOpen ? "fa-chevron-up" : "fa-chevron-down"}`}/>
												</button>
											)}
										</div>
									) : (
										<button key={quote.id} type="button" className={`service-quote-tab ${quote.is_realized ? "realized" : ""}`} disabled={!!quoteDraft} title={quoteDraft ? "Guarde ou cancele a edição primeiro" : undefined} onClick={()=>setActiveQuoteId(quote.id)}>
											<i className={`service-quote-tab-status ${quote.is_realized ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`} title={quote.is_realized ? "Orçamentado" : "Não orçamentado"}/>
											{quote.title || "Sem título"}
											{quote.products.some(p => p.to_order) && <i className="fa-solid fa-cart-shopping service-quote-tab-order" title="Tem produtos para pedir"/>}
										</button>
									))}
									<button type="button" className="service-quote-tab-add" title={quoteDraft ? "Guarde ou cancele a edição primeiro" : "Adicionar Orçamento"} disabled={!!quoteDraft} onClick={handleClickAddQuote}>
										<i className="fa-solid fa-plus"/>
									</button>
									{/* Phone only (CSS): every orçamento, the open one marked. */}
									{isQuoteMenuOpen && quotes.length > 1 && (
										<ul className="service-quote-menu">
											{quotes.map((quote) => (
												<li key={quote.id}>
													<button
														type="button"
														className={`${quote.id === activeQuote.id ? "active" : ""} ${quote.is_realized ? "realized" : ""}`}
														disabled={!!quoteDraft && quote.id !== activeQuote.id}
														onClick={()=>{ setActiveQuoteId(quote.id); setIsQuoteMenuOpen(false); }}
													>
														<i className={`service-quote-tab-status fa-fw ${quote.is_realized ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`}/>
														<span>{quote.title || "Sem título"}</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
								<div className="service-quote-panel">
									{/* has-edit-btn: only Editar is showing (phone turns it into a
									   circle beside Orçamentado). */}
									<div className={`service-quote-toolbar ${!isEditingQuote && !activeQuote.is_realized ? "has-edit-btn" : ""}`}>
										{/* Products can only be added while editing. */}
										{isEditingQuote && (
											<QuoteProductPicker
												placeholder="Pesquisar produto..."
												onSelect={handleSelectQuoteProduct}
											/>
										)}
										{/* Editar unlocks the orçamento into a draft; Guardar sends it,
										   Cancelar drops it. No Editar while Orçamentado. */}
										<span className="service-quote-edit-btns">
											{isEditingQuote ? (
												<>
													<button type="button" className="is-cancel" disabled={isSavingQuote} onClick={handleCancelQuoteEdit}>
														<i className="fa-solid fa-xmark"/> Cancelar
													</button>
													<button
														type="button"
														className="is-confirm"
														disabled={isSavingQuote || !isQuoteDraftValid}
														title={isQuoteDraftValid ? "Guardar orçamento" : "Há quantidades inválidas"}
														onClick={handleClickSaveQuote}
													>
														<i className={`fa-solid ${isSavingQuote ? "fa-spinner fa-spin" : "fa-check"}`}/> Guardar
													</button>
												</>
											) : !activeQuote.is_realized && (
												<button type="button" className="is-edit" title="Editar orçamento" disabled={!!quoteDraft} onClick={handleClickEditQuote}>
													<i className="fa-solid fa-pen"/> <span className="service-quote-edit-label">Editar</span>
												</button>
											)}
										</span>
										<button
											type="button"
											className={`service-quote-status ${activeQuote.is_realized ? "realized" : ""}`}
											disabled={isEditingQuote}
											title={isEditingQuote ? "Guarde ou cancele a edição primeiro" : undefined}
											onClick={()=>handleClickToggleQuoteStatus(activeQuote)}
										>
											<i className={`fa-fw ${activeQuote.is_realized ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}`}/>
											{/* Both labels share one grid cell so the button keeps the
											   longer one's width in either state. */}
											<span className="service-quote-status-labels">
												<span className={activeQuote.is_realized ? "hidden" : ""}>Não orçamentado</span>
												<span className={activeQuote.is_realized ? "" : "hidden"}>Orçamentado</span>
											</span>
										</button>
										{(() => {
											const products = shownQuote.products;
											const isAll = products.length > 0 && products.every(p => p.to_order);
											return (
												<button
													type="button"
													role="checkbox"
													aria-checked={isAll}
													className={`service-quote-order ${isAll ? "checked" : ""}`}
													disabled={!isEditingQuote || products.length === 0 || isSavingQuote}
													title={!isEditingQuote ? (activeQuote.is_realized ? "Orçamentado: não é possível alterar" : "Carregue em Editar para alterar") : products.length === 0 ? "Sem produtos" : isAll ? "Desmarcar Pedir em todos os produtos" : "Marcar Pedir em todos os produtos"}
													onClick={()=>handleToggleAllToOrder(products)}
												>
													<i className={`fa-fw ${isAll ? "fa-solid fa-square-check" : "fa-regular fa-square"}`}/>
													Pedir todo
												</button>
											);
										})()}
									</div>
									<table className={isEditingQuote ? "" : "is-locked"}>
										<thead>
											<tr>
												<th>Nome</th>
												<th>Referência</th>
												<th>Tipo de Produto</th>
												<th>Quantidade</th>
												<th className="p-to-order-head">Pedir</th>
												<th></th>
											</tr>
										</thead>
										<tbody>
											{shownQuote.products.map((p) => (
												<tr key={p.id}>
													<td className="p-name">
														<label className="magic-label">Nome:</label>
														<input disabled type="text" placeholder="-" value={p.name}/>
													</td>
													<td className="p-reference">
														<label className="magic-label">Referência:</label>
														<input disabled type="text" placeholder="-" value={p.reference}/>
													</td>
													<td className="p-p-type">
														<label className="magic-label">T. Produto:</label>
														<input disabled type="text" placeholder="-" value={p.type}/>
													</td>
													<td className="p-quantity">
														<label className="magic-label">Qt:</label>
														<input type="number" min="1" step="1" disabled={!isEditingQuote} value={p.quantity} onChange={(e)=>updateQuoteProduct(p.id, "quantity", e.target.value.trim()!=="" ? Number(e.target.value) : "")}/>
													</td>
													{/* The whole cell is the click target (a label around the checkbox). */}
													<td className={`p-to-order ${isEditingQuote ? "is-editable" : ""}`}>
														<label title={isEditingQuote ? (p.to_order ? "Desmarcar Pedir" : "Marcar Pedir") : (p.to_order ? "Marcado para pedir" : "Não marcado para pedir")}>
															<span className="magic-label">Pedir:</span>
															<input
																type="checkbox"
																checked={!!p.to_order}
																disabled={!isEditingQuote || isSavingQuote}
																onChange={()=>handleToggleProductToOrder(p)}
															/>
														</label>
													</td>
													<td className="p-cancel">
														{isEditingQuote && (
															<button type="button" className="cancel" onClick={()=>handleClickDeleteQuoteProduct(p.id)}><i className="fa-solid fa-trash"/></button>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
									{/* Phone (≤750px): the table above is hidden and the products
									   show as simple cards instead. Editing uses a −/+ stepper; at
									   quantity 1 the − turns into the trash. */}
									<ul className={`quote-items ${isEditingQuote ? "is-editing" : ""}`}>
										{shownQuote.products.map((p) => {
											const meta = [p.reference, p.type]
												.filter(v => v != null && String(v).trim() !== "" && String(v).trim() !== "-")
												.join(" · ");
											const qty = p.quantity;
											const hasQty = Number.isInteger(qty) && qty >= 1;
											return (
												<li key={p.id} className="quote-item">
													<label className={`quote-item-order ${p.to_order ? "checked" : ""} ${isEditingQuote ? "is-editable" : ""}`} title={p.to_order ? "Marcado para pedir" : "Não marcado para pedir"}>
														<input
															type="checkbox"
															checked={!!p.to_order}
															disabled={!isEditingQuote || isSavingQuote}
															onChange={()=>handleToggleProductToOrder(p)}
														/>
														<span>Pedir</span>
													</label>
													<div className="quote-item-text">
														<span className="quote-item-name">{p.name || "-"}</span>
														{meta && <span className="quote-item-meta">{meta}</span>}
													</div>
													{isEditingQuote ? (
														<div className="quote-item-stepper">
															{hasQty && qty > 1 ? (
																<button type="button" aria-label="Menos um" title="Menos um" onClick={()=>updateQuoteProduct(p.id, "quantity", qty - 1)}>
																	<i className="fa-solid fa-minus"/>
																</button>
															) : (
																<button type="button" className="is-delete" aria-label="Remover produto" title="Remover produto" onClick={()=>handleClickDeleteQuoteProduct(p.id)}>
																	<i className="fa-solid fa-trash"/>
																</button>
															)}
															<input
																type="number"
																inputMode="numeric"
																min="1"
																step="1"
																aria-label="Quantidade"
																className={hasQty ? "" : "is-invalid"}
																value={qty}
																onChange={(e)=>updateQuoteProduct(p.id, "quantity", e.target.value.trim()!=="" ? Number(e.target.value) : "")}
															/>
															<button type="button" aria-label="Mais um" title="Mais um" onClick={()=>updateQuoteProduct(p.id, "quantity", hasQty ? qty + 1 : 1)}>
																<i className="fa-solid fa-plus"/>
															</button>
														</div>
													) : (
														<span className="quote-item-qty" title="Quantidade">× {qty}</span>
													)}
												</li>
											);
										})}
									</ul>
									<div className={`service-quote-note-field ${isEditingQuoteNote ? "is-editing" : ""}`}>
										<i className="fa-solid fa-note-sticky service-quote-note-icon"/>
										<textarea
											className={`service-quote-note ${isEditingQuoteNote ? "" : "is-locked"}`}
											rows={1}
											ref={(el)=>{ quoteNoteRef.current = el; autoGrowQuoteNote(el); }}
											value={isEditingQuoteNote ? quoteNoteDraft : activeQuote.note}
											placeholder="Nota"
											readOnly={!isEditingQuoteNote}
											onChange={(e)=>setQuoteNoteDraft(e.target.value)}
											onKeyDown={(e)=>{ if(isEditingQuoteNote && e.key === "Escape") handleCancelQuoteNote(); }}
										/>
										<span className="service-quote-note-btns">
											{isEditingQuoteNote ? (
												<>
													<button type="button" className="is-confirm" title="Guardar nota" disabled={isSavingQuoteNote} onClick={handleSaveQuoteNote}>
														<i className={`fa-solid ${isSavingQuoteNote ? "fa-spinner fa-spin" : "fa-check"}`}/>
													</button>
													<button type="button" className="is-cancel" title="Cancelar edição" disabled={isSavingQuoteNote} onClick={handleCancelQuoteNote}>
														<i className="fa-solid fa-xmark"/>
													</button>
												</>
											) : activeQuote.id !== NEW_QUOTE_ID && (
												<button type="button" title="Editar nota" onClick={handleClickEditQuoteNote}>
													<i className="fa-solid fa-pen"/>
												</button>
											)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
				{isConfirmNewQuoteOpen && (
					<div className="quote-modal-backdrop" onClick={()=>setIsConfirmNewQuoteOpen(false)}>
						<div className="quote-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
							<div className="quote-modal-header">
								<i className="fa-solid fa-file-invoice"/>
								<div>
									<h2>Criar novo orçamento?</h2>
									<p>
										Já {quotes.length === 1 ? "existe 1 orçamento" : `existem ${quotes.length} orçamentos`} neste serviço.
									</p>
								</div>
							</div>
							<div className="quote-modal-buttons">
								<button type="button" onClick={()=>setIsConfirmNewQuoteOpen(false)}>Cancelar</button>
								<button type="button" className="primary" autoFocus onClick={handleConfirmNewQuote}>
									<i className="fa-solid fa-plus"/> Criar orçamento
								</button>
							</div>
						</div>
					</div>
				)}
				{isConfirmEmptyQuoteOpen && isEditingQuote && (
					<div className="quote-modal-backdrop" onClick={()=>setIsConfirmEmptyQuoteOpen(false)}>
						<div className="quote-modal quote-modal-wide" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
							<div className="quote-modal-header">
								<i className="fa-solid fa-circle-question"/>
								<div>
									<h2>Orçamento sem produtos</h2>
									<p>
										{quoteDraft.isNew
											? <>"{quoteDraft.title || "Sem título"}" não tem produtos. Guardar mesmo assim, ou descartar?</>
											: <>"{quoteDraft.title || "Sem título"}" vai ficar sem produtos. Guardar assim, ou descartar as alterações?</>}
									</p>
								</div>
							</div>
							<div className="quote-modal-buttons quote-modal-buttons-three">
								<button type="button" autoFocus onClick={()=>setIsConfirmEmptyQuoteOpen(false)}>Continuar a editar</button>
								<button type="button" className="danger" onClick={()=>{ setIsConfirmEmptyQuoteOpen(false); handleCancelQuoteEdit(); }}>
									<i className="fa-solid fa-xmark"/> {quoteDraft.isNew ? "Descartar" : "Descartar alterações"}
								</button>
								<button type="button" className="primary" onClick={()=>{ setIsConfirmEmptyQuoteOpen(false); handleSaveQuote(); }}>
									<i className="fa-solid fa-check"/> Guardar vazio
								</button>
							</div>
						</div>
					</div>
				)}
				{quoteToUnmark && (
					<div className="quote-modal-backdrop" onClick={()=>setQuoteToUnmark(null)}>
						<div className="quote-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
							<div className="quote-modal-header">
								<i className="fa-solid fa-circle-question"/>
								<div>
									<h2>Tem a certeza?</h2>
									<p>
										"{quoteToUnmark.title || "Sem título"}" vai passar de Orçamentado para Não orçamentado.
									</p>
								</div>
							</div>
							<div className="quote-modal-buttons">
								<button type="button" autoFocus onClick={()=>setQuoteToUnmark(null)}>Cancelar</button>
								<button type="button" className="primary" onClick={handleConfirmUnmarkQuote}>
									Marcar como Não orçamentado
								</button>
							</div>
						</div>
					</div>
				)}
				{quoteToDelete && (
					<div className="quote-delete-backdrop" onClick={()=>setQuoteToDelete(null)}>
						<div className="quote-delete-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
							<div className="quote-delete-header">
								<i className="fa-solid fa-trash"/>
								<div>
									<h2>Apagar orçamento?</h2>
									<p>
										"{quoteToDelete.title || "Sem título"}" tem {quoteToDelete.products.length} {quoteToDelete.products.length === 1 ? "produto" : "produtos"} que serão removidos.
									</p>
								</div>
							</div>
							<ul className="quote-delete-products">
								{quoteToDelete.products.map(p => (
									<li key={p.id}>
										<span className="name">{p.name || "-"}</span>
										<span className="ref">{p.reference || "-"}</span>
										<span className="qty">x{p.quantity}</span>
									</li>
								))}
							</ul>
							<div className="quote-delete-buttons">
								<button type="button" onClick={()=>setQuoteToDelete(null)}>Cancelar</button>
								<button type="button" className="danger" autoFocus onClick={handleConfirmDeleteQuote}>
									<i className="fa-solid fa-trash"/> Apagar
								</button>
							</div>
						</div>
					</div>
				)}
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
				</div>
			</div>
		</div>

	);
}
