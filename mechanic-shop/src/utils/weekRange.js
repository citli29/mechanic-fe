// Shared by the phone week view of Marcações and Serviços (calendar).

// "Out", "Nov", ... (pt-PT short month, without the trailing dot).
function shortMonth(date) {
	const name = date.toLocaleString("pt-PT", { month: "short" }).replace(".", "");
	return name.charAt(0).toUpperCase() + name.slice(1);
}

// Monday-Sunday label: "3 - 9 Nov" within one month, "28 Out - 3 Nov"
// across two.
export function formatWeekRange(monday, sunday) {
	if (monday.getMonth() === sunday.getMonth()) {
		return `${monday.getDate()} - ${sunday.getDate()} ${shortMonth(sunday)}`;
	}
	return `${monday.getDate()} ${shortMonth(monday)} - ${sunday.getDate()} ${shortMonth(sunday)}`;
}

// Which week row (0 = first) of the month grid holds today, when that
// month is the current one; 0 for any other month. The grid starts on the
// Monday on/before the 1st, like the calendars' own layout.
export function initialWeekIndex(year, month, today = new Date()) {
	if (year !== today.getFullYear() || month !== today.getMonth()) return 0;

	const firstDay = new Date(year, month, 1).getDay();
	const startDay = firstDay === 0 ? 6 : firstDay - 1;

	return Math.floor((startDay + today.getDate() - 1) / 7);
}
