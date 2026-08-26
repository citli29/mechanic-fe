import { RichTextarea, createRegexRenderer } from "rich-textarea";
import React, { forwardRef, useEffect, useImperativeHandle, useRef,useState } from "react"

export const MarkedTextarea =forwardRef(({
	value,
	onChange,
},ref) => {

		const textareaRef = useRef(null);

		const [currentMarkers, setCurrentMarkers] = useState([
			{className:"note-red", from: 10, to: 20 } ]);

		const markSelection = (clName) => {
			const s = textareaRef.current.selectionStart;
			const f = textareaRef.current.selectionEnd;

			const newMarker = {className: clName, from: s, to: f };

			setCurrentMarkers(prevMarkers => {
				let mergedMarker = newMarker;

				const newMarkers = prevMarkers.reduce((acc, marker) => {
					const overlaps =
						mergedMarker.from <= marker.to &&
							mergedMarker.to >= marker.from;

					if (overlaps) {
						if (mergedMarker.className === marker.className) {
							mergedMarker = {
								className: marker.className,
								from: Math.min(mergedMarker.from, marker.from),
								to: Math.max(mergedMarker.to, marker.to),
							};

							return acc;
						}else{
							if(mergedMarker.from <= marker.from && mergedMarker.to >= marker.to ){
								return acc;
							}else if ( marker.from < mergedMarker.from && marker.to > mergedMarker.to) {
								acc.push({
									className: marker.className,
									from: marker.from,
									to: mergedMarker.from,
								});

								acc.push({
									className: marker.className,
									from: mergedMarker.to,
									to: marker.to,
								});

								return acc;
							}else if(mergedMarker.from < marker.from && mergedMarker.to < marker.to){
								acc.push({
									className: marker.className,
									from: mergedMarker.to,
									to: marker.to,
								});
								return acc;
							}else if (mergedMarker.from > marker.from && mergedMarker.to > marker.to){
								acc.push({
									className: marker.className,
									from: marker.from,
									to: mergedMarker.from,
								})
								return acc;
							}else{
								console.log("no Match");
								return acc;
							}
						}

					}

					acc.push(marker);

					return acc;
				}, []).filter(marker=>marker.from!==marker.to);

				const res = [...newMarkers, mergedMarker]
				.sort((a, b) => a.from - b.from);

				return res;
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
					const a = (
						<React.Fragment key={i}>
							{text.slice(previousTo, marker.from)}

							<span className={marker.className}>
								{text.slice(marker.from, marker.to)}
							</span>
						</React.Fragment>
					)

					return (a);
				})}

				{text.slice(currentMarkers.at(-1)?.to ?? 0)}
			</>
		);




		useEffect(()=>{ console.log(currentMarkers) },[currentMarkers]);
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

			if (isInsert) {
				// insertion logic

			} else if (isDelete) {
				//if(start !== end)
					updateMarkersDelete(start,end);
				//updateMarkersDeleteSkinny(start,end);
				// deletion logic
			}


		};
		const updateMarkersDelete = (start,end) => {
			let delL = end - start;
			if(delL === 0) delL=1;

			setCurrentMarkers(prevMarkers =>
				prevMarkers.map(marker => {
					let { from, to ,className} = marker;
					if(start < from && end > to) return {from:0, to:0,className:""}; //delete around marker
					if(from < start && end < to) return {from: from, to: to-delL,className};//delete inside marker
					if(start > to) return marker; // delete after marker
					if(end < from) return {from:from - delL, to:to - delL, className}; //delete before marker
					if(start < from && end< to) return{from:start, to:  start + (to - end),className};//delete before start into marker
					if(start < from && end< to) return{from:start, to:  start + (to - end),className};//delete after start into after marker
					if(from < start && to< end) return{from:from, to:  start,className};//delete after start into after marker
					return{from:from, to:  start,className:className};
					
				}).filter(marker => marker.from !== marker.to)
			);
		}

		const updateMarkersForEdit = (start, end, insertedText) => {
			const deletedLength = end - start;
			const insertedLength = insertedText?.length ?? 0;
			const delta = insertedLength - deletedLength;

			setCurrentMarkers(prevMarkers =>
				prevMarkers.map(marker => {
					let { from, to ,className} = marker;
					if (end <= from) {
						return {
							className: className,
							from: from + delta,
							to: to + delta
						};
					}

					if (start >= to) { return marker; }
					if (start <= from) { from = start; }

					to += delta;
					if (to < from) { to = from; }
					return { from, to ,className};
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

			</>
		)
	});
