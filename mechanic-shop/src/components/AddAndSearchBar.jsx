import { useEffect, useRef, useState } from "react";
import api from "./../api/axios";
import "./AddAndSearchBar.css";

// @url: api call to get the items
// @search_term: the column to search the item (usually the normalized one)
// @list_term: name of the list that the api returns in json
// @item_term: name to present in the placeholders (use singular)
// @fields: the fields on the get request to present int the items
// @onSelect: function that is called when item is selected (passed as argument the item selected)
// @hasAdd: boolean -> Add functionality toggle
// @onAdd: function called when is pressed the add option (passed as argument the current search value)
// @css_class: css class of the div around the component
// @visibleItems: how many items to show in the dropdown

export default function AddAndSearchBar({
	url,
	search_term,
	list_term,
	item_term,
	fields,
	onSelect,
	hasAdd = false,
	onAdd,
	css_class = "",
	visibleItems = 5,
}) {
	const [search, setSearch] = useState("");
	const [results, setResults] = useState([]);
	const [isSelected, setIsSelected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const containerRef = useRef(null);
	const [error, setError] = useState("");

	useEffect(() => {
		function handleClickOutside(event) {
			if (
				containerRef.current &&
					!containerRef.current.contains(event.target)
			) {
				setIsSelected(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();

		const timeoutId = setTimeout(async () => {
			try {
				setIsLoading(true);

				const response = await api.get(url, {
					params: {
						[search_term]: search,
					},
					signal: controller.signal,
				});

				setResults(response.data?.[list_term] ?? []);
			} catch (e) {
				if (e.code !== "ERR_CANCELED") {
					setError(`Erro ao pesquisar items: ${e}` )
					console.error("Erro ao pesquisar items:", e);
					setResults([]);
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		}, 300);

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [search, url, search_term, list_term]);

	function handleSearch(value){
		setSearch(value);
	}

	function handleSelect(item) {
		setIsSelected(false);
		onSelect(item);
	}

	function handleAdd() {
		setIsSelected(false);
		onAdd?.(search);
		setSearch("");
	}

	return (
		<div
			ref={containerRef}
			className={`add-search-bar ${css_class}`}
			style={{
				"--visible-items": visibleItems,
			}}
		>
			<input
				className={`search-input ${error?"error":""}`}
				value={search}
				placeholder={`Pesquisar ${item_term}`}
				onChange={(event) => handleSearch(event.target.value)}
				onFocus={() => setIsSelected(true)}
			/>

			{isSelected && (
				<div className={`search-dropdown ${error?"error":""}`}>
					{hasAdd && (
						<button
							className="search-dropdown-item add-item"
							type="button"
							onClick={handleAdd}
						>
							<span>{`Adicionar ${item_term}${search?": ":""}`}</span>
							{search}
						</button>
					)}

					{results.map((item) => (
						<button
							className="search-dropdown-item"
							key={item.id}
							type="button"
							onClick={() => handleSelect(item)}
						>
							{fields.map((field, index) => (
								<span key={field.name}>
									{item[field.name] ?? field.emptyLabel}
									{index !== fields.length - 1 ? " - " : ""}
								</span>
							))}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
