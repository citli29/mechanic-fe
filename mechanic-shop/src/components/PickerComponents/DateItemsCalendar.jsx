import {
	useEffect,
	useMemo,
	useState
} from "react";

import api from "../../api/axios";

// import "./DateItemsCalendar.css";

function formatDateKey(date) {
	const year = date.getFullYear();

	const month = String(
		date.getMonth() + 1
	).padStart(2, "0");

	const day = String(
		date.getDate()
	).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function getFilteredParams(params) {
	return Object.fromEntries(
		Object.entries(params || {}).filter(
			([, value]) =>
				value !== "" &&
				value !== null &&
				value !== undefined
		)
	);
}

export default function DateItemsCalendar({
	url,
	list_term,
	date_term = "date",
	params = {},
	renderItem,
	getItemKey = item => item.id,
	onItemClick,
	width = "100%",
	locale = "pt-PT",
	weekdays = [
		"Seg",
		"Ter",
		"Qua",
		"Qui",
		"Sex",
		"Sab",
		"Dom"
	],
	initialDate = null,
	showLoading = true,
	emptyMessage = "",
	handleApiError,
	className = ""
}) {
	const [items, setItems] = useState([]);

	const [currentMonth, setCurrentMonth] = useState(() => {
		const date = initialDate
			? new Date(initialDate)
			: new Date();

		return new Date(
			date.getFullYear(),
			date.getMonth(),
			1
		);
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const serializedParams = useMemo(
		() => JSON.stringify(params || {}),
		[params]
	);

	useEffect(() => {
		loadItems();
	}, [url, list_term, serializedParams]);

	async function loadItems() {
		if (!url || !list_term) {
			setItems([]);
			return;
		}

		setLoading(true);
		setError("");

		try {
			const response = await api.get(url, {
				params: getFilteredParams(params)
			});

			const list =
				response.data?.[list_term] ?? [];

			setItems(
				Array.isArray(list)
					? list
					: []
			);
		}
		catch (err) {
			setItems([]);

			if (handleApiError) {
				handleApiError(err);
			}
			else {
				console.error(err);
			}

			setError(
				"Não foi possível carregar os dados."
			);
		}
		finally {
			setLoading(false);
		}
	}

	function previousMonth() {
		setCurrentMonth(previousMonth =>
			new Date(
				previousMonth.getFullYear(),
				previousMonth.getMonth() - 1,
				1
			)
		);
	}

	function nextMonth() {
		setCurrentMonth(previousMonth =>
			new Date(
				previousMonth.getFullYear(),
				previousMonth.getMonth() + 1,
				1
			)
		);
	}

	function goToToday() {
		const today = new Date();

		setCurrentMonth(
			new Date(
				today.getFullYear(),
				today.getMonth(),
				1
			)
		);
	}

	const itemsByDate = useMemo(() => {
		return items.reduce((grouped, item) => {
			const rawDate = item?.[date_term];

			if (!rawDate) {
				return grouped;
			}

			const dateKey = String(rawDate).slice(
				0,
				10
			);

			if (!grouped[dateKey]) {
				grouped[dateKey] = [];
			}

			grouped[dateKey].push(item);

			return grouped;
		}, {});
	}, [items, date_term]);

	const calendarDays = useMemo(() => {
		const year =
			currentMonth.getFullYear();

		const month =
			currentMonth.getMonth();

		const firstDay = new Date(
			year,
			month,
			1
		);

		const lastDay = new Date(
			year,
			month + 1,
			0
		);

		const mondayOffset =
			(firstDay.getDay() + 6) % 7;

		const days = [];

		for (
			let index = 0;
			index < mondayOffset;
			index += 1
		) {
			days.push(null);
		}

		for (
			let dayNumber = 1;
			dayNumber <= lastDay.getDate();
			dayNumber += 1
		) {
			const date = new Date(
				year,
				month,
				dayNumber
			);

			const dateKey =
				formatDateKey(date);

			days.push({
				date,
				dateKey,
				dayNumber,
				items:
					itemsByDate[dateKey] ?? []
			});
		}

		while (days.length % 7 !== 0) {
			days.push(null);
		}

		return days;
	}, [currentMonth, itemsByDate]);

	const monthName = useMemo(() => {
		const formattedMonth =
			new Intl.DateTimeFormat(locale, {
				month: "long",
				year: "numeric"
			}).format(currentMonth);

		return (
			formattedMonth
				.charAt(0)
				.toUpperCase() +
			formattedMonth.slice(1)
		);
	}, [currentMonth, locale]);

	const monthItemCount = useMemo(() => {
		return calendarDays.reduce(
			(total, day) =>
				total +
				(day?.items.length ?? 0),
			0
		);
	}, [calendarDays]);

	const todayKey =
		formatDateKey(new Date());

	return (
		<div
			className={[
				"date-items-calendar",
				className
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				width,
				maxWidth: width
			}}
		>
			<div className="month-navigation">
				<button
					type="button"
					aria-label="Mês anterior"
					onClick={previousMonth}
				>
					◀
				</button>

				<div className="month-title">
					<h2>{monthName}</h2>

					<button
						type="button"
						className="today-button"
						onClick={goToToday}
					>
						Hoje
					</button>
				</div>

				<button
					type="button"
					aria-label="Mês seguinte"
					onClick={nextMonth}
				>
					▶
				</button>
			</div>

			{showLoading && loading && (
				<p className="calendar-status">
					A carregar...
				</p>
			)}

			{error && (
				<div className="calendar-error">
					<span>{error}</span>

					<button
						type="button"
						onClick={loadItems}
					>
						Tentar novamente
					</button>
				</div>
			)}

			{!loading &&
				!error &&
				emptyMessage &&
				monthItemCount === 0 && (
					<p className="calendar-empty">
						{emptyMessage}
					</p>
				)}

			<div className="calendar-wrapper">
				<div className="calendar">
					{weekdays.map(
						(weekday, index) => (
							<div
								key={`${weekday}-${index}`}
								className="calendar-header"
							>
								{weekday}
							</div>
						)
					)}

					{calendarDays.map(
						(day, index) => {
							if (!day) {
								return (
									<div
										key={`empty-${index}`}
										className="calendar-day empty"
									/>
								);
							}

							const isToday =
								day.dateKey ===
								todayKey;

							return (
								<div
									key={day.dateKey}
									className={[
										"calendar-day",
										isToday
											? "today"
											: ""
									]
										.filter(Boolean)
										.join(" ")}
								>
									<div className="day-number">
										{day.dayNumber}
									</div>

									<div className="calendar-items">
										{day.items.map(
											(item, itemIndex) => {
												const itemKey =
													getItemKey?.(
														item
													) ??
													`${day.dateKey}-${itemIndex}`;

												const content =
													renderItem
														? renderItem(
															item,
															{
																date:
																	day.date,
																dateKey:
																	day.dateKey,
																dayNumber:
																	day.dayNumber
															}
														)
														: JSON.stringify(
															item
														);

												if (onItemClick) {
													return (
														<button
															key={itemKey}
															type="button"
															className="calendar-item calendar-item-button"
															onClick={() =>
																onItemClick(
																	item
																)
															}
														>
															{content}
														</button>
													);
												}

												return (
													<div
														key={itemKey}
														className="calendar-item"
													>
														{content}
													</div>
												);
											}
										)}
									</div>
								</div>
							);
						}
					)}
				</div>
			</div>
		</div>
	);
}
