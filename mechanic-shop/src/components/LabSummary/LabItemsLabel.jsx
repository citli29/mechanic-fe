import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { buildLabSummary } from "../../utils/labSummary";
import LabSummaryList from "./LabSummaryList";
import "./LabSummary.css";

// Same data the Laboratório card loads, turned into the summary list.
async function fetchLabSummary(serviceId) {
	const [labItemsResponse, labActionValuesResponse, labPropertyValuesResponse] = await Promise.all([
		api.get(`/services/${serviceId}/lab_items`),
		api.get(`/services/${serviceId}/lab_action_values`),
		api.get(`/services/${serviceId}/lab_property_values`),
	]);

	const propertyValuesGrouped = {};
	(labPropertyValuesResponse.data.slpv_list || []).forEach((lpv) => {
		if (!propertyValuesGrouped[lpv.l_item_id]) propertyValuesGrouped[lpv.l_item_id] = [];
		propertyValuesGrouped[lpv.l_item_id].push(lpv);
	});

	return buildLabSummary(
		labItemsResponse.data.lab_item_list || [],
		labActionValuesResponse.data.slav_list || [],
		propertyValuesGrouped
	);
}

// Loads the summary once, on first use (hover or tap).
function useLabSummary(serviceId) {
	const [summary, setSummary] = useState(null);
	const loadingRef = useRef(false);

	const load = () => {
		if (summary || loadingRef.current) return;
		loadingRef.current = true;
		fetchLabSummary(serviceId)
			.then(setSummary)
			.catch((error) => console.error(error))
			.finally(() => { loadingRef.current = false; });
	};

	return [summary, load];
}

function LabSummaryContent({ summary }) {
	return summary
		? <LabSummaryList items={summary} title="Laboratório" />
		: <span className="lab-items-popup-loading">A carregar...</span>;
}

// Laboratório services in the lists: the item type in place of the plate
// (the caller builds the text — e.g. "3x Injetor" or "Variado"). Hovering
// shows the same generated summary as above Descrição de Avaria.
// It sits above the row's link overlay (to get the hover), so it carries
// its own link to the service when given `to`.
export default function LabItemsLabel({ serviceId, label, to }) {
	const [summary, loadSummary] = useLabSummary(serviceId);
	const [popupPos, setPopupPos] = useState(null);

	const handleEnter = (e) => {
		// Fixed and portalled to <body>, so neither the table's overflow nor
		// the row's stacking (cells painted over it) can get in the way;
		// flips above the label when there's no room underneath.
		const rect = e.currentTarget.getBoundingClientRect();
		const below = rect.bottom + 6;
		const left = Math.max(8, Math.min(rect.left, window.innerWidth - 408));
		setPopupPos(
			window.innerHeight - below < 220
				? { left, bottom: window.innerHeight - rect.top + 6 }
				: { left, top: below }
		);
		loadSummary();
	};

	const Wrapper = to ? Link : "span";

	return (
		<Wrapper
			className="lab-items-label"
			{...(to && { to })}
			onMouseEnter={handleEnter}
			onMouseLeave={() => setPopupPos(null)}
		>
			<span className="cell-truncate">{label}</span>
			{popupPos && createPortal(
				<div className="lab-items-popup" style={popupPos}>
					<LabSummaryContent summary={summary} />
				</div>,
				document.body
			)}
		</Wrapper>
	);
}

// Phone (no hover): a small flask button that opens the summary in a
// centred popup; tapping outside or the X closes it. It lives inside the
// row's link, so it stops the tap from also opening the service.
export function LabSummaryButton({ serviceId }) {
	const [summary, loadSummary] = useLabSummary(serviceId);
	const [open, setOpen] = useState(false);

	const handleOpen = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setOpen(true);
		loadSummary();
	};

	const handleClose = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setOpen(false);
	};

	return (
		<>
			<button type="button" className="lab-summary-btn" title="Ver resumo do Laboratório" onClick={handleOpen}>
				<i className="fa-solid fa-flask" />
			</button>
			{open && createPortal(
				<div className="lab-summary-sheet-backdrop" onClick={handleClose}>
					<div className="lab-summary-sheet" onClick={(e) => e.stopPropagation()}>
						<button type="button" className="lab-summary-sheet-close" title="Fechar" onClick={handleClose}>
							<i className="fa-solid fa-xmark" />
						</button>
						<LabSummaryContent summary={summary} />
					</div>
				</div>,
				document.body
			)}
		</>
	);
}
