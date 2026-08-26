import { RichTextarea, createRegexRenderer } from "rich-textarea";
import React, { forwardRef, useEffect, useImperativeHandle, useRef,useState } from "react"

export const MarkedTextarea =forwardRef(({
	value,
	onChange,
},ref) => {

		const textareaRef = useRef(null);

		const [currentMarkers, setCurrentMarkers] = useState([
			{className:"note-red", from: 10, to: 20 } ]);

		const unmarkSelection = () => {
			markSelection("remove");
			setCurrentMarkers(prevMarkers => prevMarkers.filter(marker => marker.className !="remove"));
		}
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
			textareaRef.current.setSelectionRange(s, s);
			textareaRef.current.focus();
		};

		useImperativeHandle(ref, () =>({markSelection,unmarkSelection}));

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
				setCurrentMarkers(prevMarkers => updateMarkersInsert(prevMarkers,start,end,insertedText))
			} else if (isDelete) {
				setCurrentMarkers(prevMarkers => updateMarkersDelete(prevMarkers,start,end))
			}


		};
		const updateMarkersInsert = (markers,start,end,insertedText) => {
			let delL = end - start;
			const i = insertedText.length;
			if(delL === 0){
				return markers.map(marker => {
					let { from, to ,className} = marker;
					
					if(start <= from ) return {from: from+i, to:to+i,className}; 
					if(start < to ) return {from: from, to: to+i,className};
					return marker;
				});
			}else{
				return markers.map(marker =>{
					let { from, to ,className} = marker;

					if(start > to) return marker; // delete after marker i
					if(end < from) return {from:from - delL, to:to-delL, className}; //delete before marker
					if(start < from && end< to) return{from:start+i, to:  (start + i + (to-end)),className};//delete before start into marker
					if(from < start && end < to) return{from:from, to:  to - (end - start) + i,className}; //delete in the middle
					if(from < start && to <= end) return{from:from, to: start + i,className};//delete after start into after marker
					return{from:from, to: to,className:className};
				});
			}
		}

		const updateMarkersDelete = (markers,start,end) => {
			let delL = end - start;
			if(delL === 0){
				return markers.map(marker => {
					let { from, to ,className} = marker;
					
					if(start <= from ) return {from: from-1, to:to-1,className}; 
					if(start <= to ) return {from: from, to: to-1,className};
					return marker;
				}).filter(marker => marker.from !== marker.to);
			}else{
				return markers.map(marker => {
					let { from, to ,className} = marker;
					if(start > to) return marker; // delete after marker if(end < from) return {from:from - delL, to:to-delL, className}; //delete before marker
					if(start < from && end< to) return{from:start, to:  start + (to - end),className};//delete before start into marker
					if(from < start && end< to) return{from:from, to:  start + (to - end),className};//delete before start into marker
					if(from < start && to< end) return{from:from, to:  start,className};//delete after start into after marker
					return{from:from, to:  start,className:className};

				}).filter(marker => marker.from !== marker.to);
			}

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

		useEffect(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const updateCaret = () => {
				const cursorPosition = textarea.selectionStart;
				const insideMarker = currentMarkers.some(marker =>
					cursorPosition >= marker.from && cursorPosition < marker.to);
				textarea.classList.toggle("white-caret", insideMarker);
				console.log(textarea.classList)
			};

			textarea.addEventListener("select", updateCaret);
			textarea.addEventListener("keyup", updateCaret);
			textarea.addEventListener("click", updateCaret);

			return () => {
				textarea.removeEventListener("select", updateCaret);
				textarea.removeEventListener("keyup", updateCaret);
				textarea.removeEventListener("click", updateCaret);
			};
		}, [currentMarkers]);

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
