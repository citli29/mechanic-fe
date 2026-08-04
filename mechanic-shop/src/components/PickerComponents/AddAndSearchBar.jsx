import { useEffect, useRef, useState } from "react";
import api from "./../../api/axios";
//import "./AddAndSearchBar.css";

// @url: api call to get the items
// @search_term: the column to search the item (usually the normalized one)
// @list_term: name of the list that the api returns in json
// @item_term: name to present in the placeholders (use singular)
// @fields: the fields on the get request to present in the items
// @onSelect: function called when an item is selected
// @hasAdd: boolean -> Add functionality toggle
// @onAdd: function called when the add option is pressed
// @css_class: css class of the div around the component
// @visibleItems: how many items to show in the dropdown
// @disabled: disables the input, dropdown, handlers, and API requests

export default function AddAndSearchBar({
	url,
	search_term,
	list_term,
	item_term,
	fields = [],
	onSelect,
	hasAdd = false,
	onAdd,
	css_class = "",
	visibleItems = 5,
	disabled = false,
}) {
	const [search, setSearch] = useState("");
	const [results, setResults] = useState([]);
	const [isSelected, setIsSelected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const containerRef = useRef(null);

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
		if (disabled) {
			setIsSelected(false);
			setResults([]);
			setIsLoading(false);
			setError("");
		}
	}, [disabled]);

	useEffect(() => {
		if (disabled || !url || !search_term || !list_term) {
			setResults([]);
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();

		const timeoutId = setTimeout(async () => {
			try {
				setIsLoading(true);
				setError("");

				const response = await api.get(url, {
					params: {
						[search_term]: search,
					},
					signal: controller.signal,
				});

				setResults(response.data?.[list_term] ?? []);
			} catch (e) {
				if (
					e.code !== "ERR_CANCELED" &&
					!controller.signal.aborted
				) {
					setError(`Erro ao pesquisar items: ${e}`);
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
	}, [
		search,
		url,
		search_term,
		list_term,
		disabled,
	]);

	function handleSearch(value) {
		if (disabled) return;

		setSearch(value);
	}

	function handleSelect(item) {
		if (disabled) return;

		setIsSelected(false);
		onSelect?.(item);
	}

	function handleAdd() {
		if (disabled) return;

		setIsSelected(false);
		onAdd?.(search);
		setSearch("");
	}

	function handleFocus() {
		if (disabled) return;

		setIsSelected(true);
	}

	return (
		<div
			ref={containerRef}
			className={`add-search-bar ${css_class} ${
				disabled ? "disabled" : ""
			}`}
			style={{
				"--visible-items": visibleItems,
			}}
			aria-disabled={disabled}
		>
			<input
				className={`search-input ${error ? "error" : ""}`}
				value={search}
				placeholder={`Pesquisar ${item_term}`}
				onChange={(event) =>
					handleSearch(event.target.value)
				}
				onFocus={handleFocus}
				disabled={disabled}
			/>

			{!disabled && isSelected && (
				<div
					className={`search-dropdown ${
						error ? "error" : ""
					}`}
				>
					{hasAdd && (
						<button
							className="search-dropdown-item add-item"
							type="button"
							onClick={handleAdd}
							disabled={isLoading}
						>
							<span>
								{`Adicionar ${item_term}${
									search ? ": " : ""
								}`}
							</span>

							{search}
						</button>
					)}

					{results.map((item) => (
						<button
							className="search-dropdown-item"
							key={item.id}
							type="button"
							onClick={() => handleSelect(item)}
							disabled={isLoading}
						>
							{fields.map((field, index) => (
								<span key={field.name}>
									{item[field.name] ??
										field.emptyLabel}

								</span>
							))}
						</button>
					))}
				</div>
			)}
			{hasAdd && (
				<button
					className="add-button"
					type="button"
					onClick={handleAdd}
				>
					<i className="fa-solid fa-plus"></i>
				</button>
			) }
		</div>
	);
}
