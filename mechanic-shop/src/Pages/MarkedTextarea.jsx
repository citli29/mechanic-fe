import { RichTextarea, createRegexRenderer } from "rich-textarea";
import React, { forwardRef, useEffect, useImperativeHandle, useRef,useState } from "react"

export const MarkedTextarea =forwardRef(({
	value,
	onChange,
},ref) => {

	const textareaRef = useRef(null);

	const [currentMarkers, setCurrentMarkers] = useState([
		{ from: 3, to: 5 } ]);

	const markSelection = () => {
		const s = textareaRef.current.selectionStart;
		const f = textareaRef.current.selectionEnd;

		const newMarker = { from: s, to: f };

		setCurrentMarkers(prevMarkers => {
			let mergedMarker = newMarker;

			const newMarkers = prevMarkers.filter(marker => {
				const overlaps =
					mergedMarker.from <= marker.to &&
						mergedMarker.to >= marker.from;

				if (overlaps) {
					mergedMarker = {
						from: Math.min(mergedMarker.from, marker.from),
						to: Math.max(mergedMarker.to, marker.to),
					};

					return false; // remove the overlapping marker
				}

				return true;
			});

			return [...newMarkers, mergedMarker].sort((a, b) => a.from - b.from);;
		});
	};

	useImperativeHandle(ref, () =>({markSelection}));

	const markers = [{
			red :{
			className:"note-red",
			char:"|",
		},
		yellow :{
			className:"note-yellow",
			char:"!",
		},
	}];

	const markerChars = markers.flatMap(group =>
		Object.values(group).map(marker => marker.char)
	);
	
	const getStringDifference = (oldStr, newStr) => {
		// No change
		if (oldStr === newStr) {
			return {
				op: null,
				i: -1,
				str: "",
			};
		}

		// Find where they first differ
		let start = 0;

		while (
			start < oldStr.length &&
				start < newStr.length &&
				oldStr[start] === newStr[start]
		) {
			start++;
		}

		// Find matching characters from the end
		let oldEnd = oldStr.length - 1;
		let newEnd = newStr.length - 1;

		while (
			oldEnd >= start &&
				newEnd >= start &&
				oldStr[oldEnd] === newStr[newEnd]
		) {
			oldEnd--;
			newEnd--;
		}

		const removed = oldStr.slice(start, oldEnd + 1);
		const added = newStr.slice(start, newEnd + 1);

		// Delete
		if (removed && !added) {
			return {
				op: "del",
				i: start,
				str: removed,
			};
		}

		// Add
		if (!removed && added) {
			return {
				op: "add",
				i: start,
				str: added,
			};
		}

		// Replacement
		return {
			op: "replace",
			i: start,
			removed,
			added,
		};
	};

	const [textRaw, setTextRaw] = useState("");
	const [textPresenting, setTextPresenting] = useState("");

	useEffect(()=>{
		setTextRaw(value);
		const v = skipChars(value,markers);
		setTextPresenting(v);
	},[]);

	const skipChars = (txt, mks ) => {
			const result = [...txt]
			.filter(char => !mks.some(mk => mk.char === char))
			.join("");

			console.log("SkipChars " , result);
			return result;
		}
	
	const renderer = (text) => (
			<>
				{currentMarkers.map((marker, i) => {
					const previousTo = i === 0 ? 0 : currentMarkers[i - 1].to;

					return (
						<React.Fragment key={i}>
							{text.slice(previousTo, marker.from)}

							<span className="note-red">
								{text.slice(marker.from, marker.to)}
							</span>
						</React.Fragment>
					);
				})}

				{/* remaining text after the last marker */}
				{text.slice(currentMarkers.at(-1)?.to ?? 0)}
			</>
		);


	const moveMarkerSkinny = (index, pos ,delta) =>{
		let newMarkerPos = currentMarkers[index];

		if( pos <= newMarkerPos.from ){
			newMarkerPos.from += delta
			newMarkerPos.to += delta
		}else if(pos <= newMarkerPos.to ){
			newMarkerPos.to += delta
		}

		console.log(newMarkerPos);
		setCurrentMarkers(prev => prev.with(index, newMarkerPos));
	};

	const moveMarkerSelected = (index, start, end, nData)=>{
		for(let i = end ; i >= start; i--){
			moveMarkerSkinny(index,i,-1);
		}

		moveMarkerSkinny(index,start, nData);
	}


		const handleBeforeInput = (e) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			// Only handle actual text edits
			const isInsert = e.inputType.startsWith("insert");
			const isDelete = e.inputType.startsWith("delete");

			if (!isInsert && !isDelete) {
				e.preventDefault();
				return;
			}

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;

			const insertedText = e.data ?? "";

			// Block marker characters
			const containsMarker = [...insertedText]
			.some(char => markerChars.includes(char));

			if (containsMarker) {
				e.preventDefault();
				return;
			}


			updateMarkersForEdit(
				start,
				end,
				isInsert ? insertedText : ""
			);
		};

		const updateMarkersForEdit = (start, end, insertedText) => {
			const deletedLength = end - start;
			const insertedLength = insertedText?.length ?? 0;
			const delta = insertedLength - deletedLength;

			setCurrentMarkers(prevMarkers =>
				prevMarkers.map(marker => {
					let { from, to } = marker;

					if (end <= from) {
						return {
							from: from + delta,
							to: to + delta
						};
					}

					// Edit happens completely after marker
					if (start >= to) { return marker; }

					if (start <= from) { from = start; }

					to += delta;

					if (to < from) { to = from; }

					return { from, to };
				})
			);
		};

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		textarea.addEventListener("beforeinput", handleBeforeInput);

		return () => {
			textarea.removeEventListener("beforeinput", handleBeforeInput);
		};
	}, []);

	return (
		<>
			<RichTextarea
				ref={textareaRef}
				style={{width:"100%"}}
				value={textPresenting}
				onChange={(e)=>{e.preventDefault();setTextPresenting(e.target.value)}}
			>
				{renderer}
			</RichTextarea>

			<div className="note-toolbar">
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						addRedMarker();
					}}
				>
					Red
				</button>

				<button
					type="button"
					onClick={()=>removeSelectionFormatting()}
				>
					Remove
				</button>
			</div>
		</>
)
});
