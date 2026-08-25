import { RichTextarea, createRegexRenderer } from "rich-textarea";
import { forwardRef, useEffect, useImperativeHandle, useRef,useState } from "react"

export const MarkedTextarea =forwardRef(({
	value,
	onChange,
},ref) => {

	const textareaRef = useRef(null);

	const markSelection = ()=>{
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
	
	const renderer = (text) => {


		return (
			<>
				{text.slice(0,currentMarkers[0].from)}
				
				<span className="note-red">
						{text.slice(currentMarkers[0].from, currentMarkers[0].to)}
				</span>
				{text.slice(currentMarkers[0].to)}
			</>
		);
	};


	const [currentMarkers, setCurrentMarkers] = useState([{from: 3 , to: 5}]);

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
		if( e.inputType.startsWith("history")) return e.preventDefault();

		const textarea = textareaRef.current;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;

		console.log("Selection:", start, end);
		console.log("Selected text:", textarea.value.slice(start, end));

		// Block marker characters
		const containsMarker = [...(e.data ?? "")]
		.some(char => markerChars.includes(char));

		const p = e.inputType.startsWith("insert")?1:-1;

		if(end===start){
			moveMarkerSkinny(0, start, p *(e.data?e.data.length:1));
		}else{
			const dSelected = end - start;
			if(p<0){
				moveMarkerSelected(0,start, end,0);
			}else{

			}


		}

		if (containsMarker) {
			e.preventDefault();
		}
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
				onChange={(e)=>setTextPresenting(e.target.value)}
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
