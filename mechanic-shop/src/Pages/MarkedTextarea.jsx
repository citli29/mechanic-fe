import { RichTextarea, createRegexRenderer } from "rich-textarea";
import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

const SEPARATOR = "\u001E";

export const MarkedTextarea = forwardRef(
	(
		{
			value,
			onChange,
		},
		ref
	) => {
		const textareaRef = useRef(null);

		// Start empty.
		// The initial value is parsed by the effect below.
		const [currentMarkers, setCurrentMarkers] = useState([]);

		const [textRaw, setTextRaw] = useState("");
		const [textPresenting, setTextPresenting] = useState("");

		const isSyncingFromProps = useRef(false);

		const markers = [
			{
				red: {
					className: "note-red",
					char: "|",
				},
				yellow: {
					className: "note-yellow",
					char: "!",
				},
			},
		];

		const markerChars = markers.flatMap((group) =>
			Object.values(group).map((marker) => marker.char)
		);

		/*
		 * ------------------------------------------------------------
		 * Parse serialized value
		 * ------------------------------------------------------------
		 *
		 * Expected format:
		 *
		 * {note-red,10,20},{note-yellow,30,40}<SEPARATOR>some text
		 *
		 * But plain text is also allowed:
		 *
		 * some text
		 *
		 * Invalid marker definitions are simply ignored.
		 */
		const parseMarkedString = (str) => {
			// null / undefined / non-string
			if (typeof str !== "string") {
				return {
					markers: [],
					presentingText: "",
				};
			}

			// No separator means this is plain/unmarked text.
			if (!str.includes(SEPARATOR)) {
				return {
					markers: [],
					presentingText: str,
				};
			}

			/*
			 * IMPORTANT:
			 *
			 * Don't use:
			 *
			 * const [markersString, presentingText] = str.split(SEPARATOR);
			 *
			 * because if the actual text contains SEPARATOR,
			 * everything after the second separator gets lost.
			 *
			 * Only the first separator has special meaning.
			 */
			const separatorIndex = str.indexOf(SEPARATOR);

			const markersString = str.slice(0, separatorIndex);
			const presentingText = str.slice(
				separatorIndex + SEPARATOR.length
			);

			// No markers, but valid serialized text.
			if (!markersString.trim()) {
				return {
					markers: [],
					presentingText,
				};
			}

			const markerMatches =
				markersString.match(/\{[^{}]+\}/g) ?? [];

			const parsedMarkers = [];

			for (const marker of markerMatches) {
				const content = marker.slice(1, -1);
				const parts = content.split(",");

				// Must be:
				// className,from,to
				if (parts.length !== 3) {
					continue;
				}

				const [className, fromString, toString] = parts;

				const from = Number(fromString);
				const to = Number(toString);

				// Invalid marker
				if (
					!className ||
					!Number.isInteger(from) ||
					!Number.isInteger(to)
				) {
					continue;
				}

				// Invalid range
				if (from < 0 || to <= from) {
					continue;
				}

				// Marker starts completely outside the text.
				if (from >= presentingText.length) {
					continue;
				}

				// Clamp marker to text length.
				const safeTo = Math.min(to, presentingText.length);

				if (from >= safeTo) {
					continue;
				}

				parsedMarkers.push({
					className,
					from,
					to: safeTo,
				});
			}

			/*
			 * The renderer assumes markers are ordered.
			 *
			 * Keep the normal behavior for valid data, but make
			 * malformed/out-of-order initial data safe.
			 */
			parsedMarkers.sort((a, b) => {
				if (a.from !== b.from) {
					return a.from - b.from;
				}

				return a.to - b.to;
			});

			/*
			 * Prevent overlapping markers from breaking renderer().
			 *
			 * Your normal marking logic already attempts to prevent
			 * overlaps. This is mainly protection for malformed
			 * initial values coming from outside the component.
			 */
			const safeMarkers = [];

			for (const marker of parsedMarkers) {
				const previous = safeMarkers.at(-1);

				if (!previous) {
					safeMarkers.push(marker);
					continue;
				}

				// No overlap.
				if (marker.from >= previous.to) {
					safeMarkers.push(marker);
					continue;
				}

				/*
				 * Existing marker takes precedence over the overlapping
				 * beginning of this marker.
				 *
				 * If there is still a valid part after previous.to,
				 * preserve that part.
				 */
				if (marker.to > previous.to) {
					safeMarkers.push({
						...marker,
						from: previous.to,
					});
				}
			}

			return {
				markers: safeMarkers,
				presentingText,
			};
		};

		/*
		 * ------------------------------------------------------------
		 * Create serialized value
		 * ------------------------------------------------------------
		 */
		const createMarkedString = (
			currentMarkers,
			presentingText
		) => {
			return (
				currentMarkers
					.map(
						(marker) =>
							`{${marker.className},${marker.from},${marker.to}}`
					)
					.join(",") +
				SEPARATOR +
				presentingText
			);
		};

		/*
		 * ------------------------------------------------------------
		 * Sync from parent value
		 * ------------------------------------------------------------
		 */
		useEffect(() => {
			isSyncingFromProps.current = true;

			const v = parseMarkedString(value);

			setTextPresenting(v.presentingText);
			setCurrentMarkers(v.markers);
		}, [value]);

		/*
		 * ------------------------------------------------------------
		 * Sync changes back to parent
		 * ------------------------------------------------------------
		 */
		useEffect(() => {
			if (isSyncingFromProps.current) {
				isSyncingFromProps.current = false;
				return;
			}

			const s = createMarkedString(
				currentMarkers,
				textPresenting
			);

			onChange(s);
		}, [textPresenting, currentMarkers]);

		/*
		 * ------------------------------------------------------------
		 * Remove marker from selection
		 * ------------------------------------------------------------
		 */
		const unmarkSelection = () => {
			markSelection("remove");

			setCurrentMarkers((prevMarkers) =>
				prevMarkers.filter(
					(marker) => marker.className !== "remove"
				)
			);
		};

		/*
		 * ------------------------------------------------------------
		 * Mark selection
		 * ------------------------------------------------------------
		 */
		const markSelection = (clName) => {
			const textarea = textareaRef.current;

			if (!textarea) return;

			const s = textarea.selectionStart;
			const f = textarea.selectionEnd;

			const newMarker = {
				className: clName,
				from: s,
				to: f,
			};

			setCurrentMarkers((prevMarkers) => {
				let mergedMarker = newMarker;

				const newMarkers = prevMarkers
					.reduce((acc, marker) => {
						const overlaps =
							mergedMarker.from <= marker.to &&
							mergedMarker.to >= marker.from;

						if (overlaps) {
							if (
								mergedMarker.className ===
								marker.className
							) {
								mergedMarker = {
									className: marker.className,
									from: Math.min(
										mergedMarker.from,
										marker.from
									),
									to: Math.max(
										mergedMarker.to,
										marker.to
									),
								};

								return acc;
							} else {
								if (
									mergedMarker.from <= marker.from &&
									mergedMarker.to >= marker.to
								) {
									return acc;
								} else if (
									marker.from <
										mergedMarker.from &&
									marker.to > mergedMarker.to
								) {
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
								} else if (
									mergedMarker.from <
										marker.from &&
									mergedMarker.to < marker.to
								) {
									acc.push({
										className: marker.className,
										from: mergedMarker.to,
										to: marker.to,
									});

									return acc;
								} else if (
									mergedMarker.from >
										marker.from &&
									mergedMarker.to > marker.to
								) {
									acc.push({
										className: marker.className,
										from: marker.from,
										to: mergedMarker.from,
									});

									return acc;
								} else {
									return acc;
								}
							}
						}

						acc.push(marker);

						return acc;
					}, [])
					.filter(
						(marker) => marker.from !== marker.to
					);

				const res = [...newMarkers, mergedMarker].sort(
					(a, b) => a.from - b.from
				);

				return res;
			});

			textarea.setSelectionRange(s, s);
			textarea.focus();
		};

		useImperativeHandle(ref, () => ({
			markSelection,
			unmarkSelection,
		}));

		/*
		 * ------------------------------------------------------------
		 * Renderer
		 * ------------------------------------------------------------
		 */
		const renderer = (text) => (
			<>
				{currentMarkers.map((marker, i) => {
					const previousTo =
						i === 0
							? 0
							: currentMarkers[i - 1].to;

					return (
						<React.Fragment key={i}>
							{text.slice(
								previousTo,
								marker.from
							)}

							<span className={marker.className}>
								{text.slice(
									marker.from,
									marker.to
								)}
							</span>
						</React.Fragment>
					);
				})}

				{text.slice(
					currentMarkers.at(-1)?.to ?? 0
				)}
			</>
		);

		/*
		 * ------------------------------------------------------------
		 * Handle beforeinput
		 * ------------------------------------------------------------
		 */
		const handleBeforeInput = (e) => {
			const textarea = textareaRef.current;

			if (!textarea) return;

			const isInsert =
				e.inputType?.startsWith("insert");

			const isDelete =
				e.inputType?.startsWith("delete");

			// Only handle actual text edits.
			if (!isInsert && !isDelete) {
				e.preventDefault();
				return;
			}

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;

			const insertedText = e.data ?? "";

			// Block marker characters.
			const containsMarker = [...insertedText].some(
				(char) => markerChars.includes(char)
			);

			if (containsMarker) {
				e.preventDefault();
				return;
			}

			if (isInsert) {
				setCurrentMarkers((prevMarkers) =>
					updateMarkersInsert(
						prevMarkers,
						start,
						end,
						insertedText
					)
				);
			} else if (isDelete) {
				setCurrentMarkers((prevMarkers) =>
					updateMarkersDelete(
						prevMarkers,
						start,
						end
					)
				);
			}
		};

		/*
		 * ------------------------------------------------------------
		 * Update markers after insertion
		 * ------------------------------------------------------------
		 */
		const updateMarkersInsert = (
			markers,
			start,
			end,
			insertedText
		) => {
			const delL = end - start;
			const i = insertedText.length;

			if (delL === 0) {
				return markers.map((marker) => {
					let {
						from,
						to,
						className,
					} = marker;

					if (start <= from) {
						return {
							from: from + i,
							to: to + i,
							className,
						};
					}

					if (start < to) {
						return {
							from,
							to: to + i,
							className,
						};
					}

					return marker;
				});
			} else {
				return markers.map((marker) => {
					let {
						from,
						to,
						className,
					} = marker;

					if (start > to) {
						return marker;
					}

					if (end < from) {
						return {
							from: from - delL,
							to: to - delL,
							className,
						};
					}

					if (start < from && end < to) {
						return {
							from: start + i,
							to:
								start +
								i +
								(to - end),
							className,
						};
					}

					if (from < start && end < to) {
						return {
							from,
							to:
								to -
								(end - start) +
								i,
							className,
						};
					}

					if (from < start && to <= end) {
						return {
							from,
							to: start + i,
							className,
						};
					}

					return {
						from,
						to,
						className,
					};
				});
			}
		};

		/*
		 * ------------------------------------------------------------
		 * Update markers after deletion
		 * ------------------------------------------------------------
		 */
		const updateMarkersDelete = (
			markers,
			start,
			end
		) => {
			const delL = end - start;

			if (delL === 0) {
				return markers
					.map((marker) => {
						let {
							from,
							to,
							className,
						} = marker;

						if (start <= from) {
							return {
								from: from - 1,
								to: to - 1,
								className,
							};
						}

						if (start <= to) {
							return {
								from,
								to: to - 1,
								className,
							};
						}

						return marker;
					})
					.filter(
						(marker) =>
							marker.from !== marker.to
					);
			} else {
				return markers
					.map((marker) => {
						let {
							from,
							to,
							className,
						} = marker;

						if (start > to) {
							return marker;
						}

						if (end < from) {
							return {
								from: from - delL,
								to: to - delL,
								className,
							};
						}

						if (start < from && end < to) {
							return {
								from: start,
								to:
									start +
									(to - end),
								className,
							};
						}

						if (from < start && end < to) {
							return {
								from,
								to:
									start +
									(to - end),
								className,
							};
						}

						if (from < start && to < end) {
							return {
								from,
								to: start,
								className,
							};
						}

						return {
							from,
							to: start,
							className,
						};
					})
					.filter(
						(marker) =>
							marker.from !== marker.to
					);
			}
		};

		/*
		 * ------------------------------------------------------------
		 * Generic marker update helper
		 * ------------------------------------------------------------
		 *
		 * Kept here because it existed in the original component.
		 */
		const updateMarkersForEdit = (
			start,
			end,
			insertedText
		) => {
			const deletedLength = end - start;
			const insertedLength =
				insertedText?.length ?? 0;

			const delta =
				insertedLength - deletedLength;

			setCurrentMarkers((prevMarkers) =>
				prevMarkers.map((marker) => {
					let {
						from,
						to,
						className,
					} = marker;

					if (end <= from) {
						return {
							className,
							from: from + delta,
							to: to + delta,
						};
					}

					if (start >= to) { return marker; }

					if (start <= from) {
						from = start;
					}

					to += delta;

					if (to < from) {
						to = from;
					}

					return {
						from,
						to,
						className,
					};
				})
			);
		};

		useEffect(() => {
			const textarea = textareaRef.current;

			if (!textarea) return;

			textarea.addEventListener(
				"beforeinput",
				handleBeforeInput
			);

			return () => {
				textarea.removeEventListener(
					"beforeinput",
					handleBeforeInput
				);
			};
		}, []);

		useEffect(() => {
			const textarea = textareaRef.current;

			if (!textarea) return;

			const updateCaret = () => {
				const cursorPosition =
					textarea.selectionStart;

				const insideMarker =
					currentMarkers.some(
						(marker) =>
							cursorPosition >=
								marker.from &&
							cursorPosition <
								marker.to
					);

				textarea.classList.toggle(
					"white-caret",
					insideMarker
				);
			};

			textarea.addEventListener(
				"select",
				updateCaret
			);

			textarea.addEventListener(
				"keyup",
				updateCaret
			);

			textarea.addEventListener(
				"click",
				updateCaret
			);

			return () => {
				textarea.removeEventListener(
					"select",
					updateCaret
				);

				textarea.removeEventListener(
					"keyup",
					updateCaret
				);

				textarea.removeEventListener(
					"click",
					updateCaret
				);
			};
		}, [currentMarkers]);

		return (
			<RichTextarea
				ref={textareaRef}
				style={{ width: "100%" }}
				value={textPresenting ?? ""}
				onChange={(e) => {
					e.preventDefault();
					setTextPresenting(e.target.value);
				}}
			>
				{renderer}
			</RichTextarea>
		);
	}
);
