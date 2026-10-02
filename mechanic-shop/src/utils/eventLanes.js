// Lays out the events of one calendar week (7 consecutive days, each
// carrying `key` and the `events` that cover it) into "lanes" — fixed
// rows inside the day cells. A multi-day event keeps the same lane on
// every day it covers in that week, so its per-day pills line up and can
// be drawn as one continuous bar across the cells.
//
// Returns one array per day, indexed by lane: either null (an empty lane,
// rendered as a spacer so the lanes below stay aligned) or a segment
// describing how that day's piece of the bar should look.
export function layoutWeekEvents(week) {
	const weekEvents = [];
	const seen = new Set();

	week.forEach((day) => {
		day.events.forEach((event) => {
			if (seen.has(event.id)) return;
			seen.add(event.id);
			weekEvents.push(event);
		});
	});

	// Earliest start first, then longest first — the usual calendar order,
	// which keeps long bars on top and packs the short ones underneath.
	weekEvents.sort((a, b) =>
		a.start_date.localeCompare(b.start_date) || b.end_date.localeCompare(a.end_date)
	);

	const laneOf = {};
	const lanes = []; // lanes[lane] = key of the last day that lane is taken

	weekEvents.forEach((event) => {
		const firstKey = week.find((day) => day.events.includes(event)).key;
		let lane = lanes.findIndex((lastKey) => lastKey < firstKey);
		if (lane === -1) lane = lanes.length;

		lanes[lane] = event.end_date;
		laneOf[event.id] = lane;
	});

	// Every day of the row gets the same number of lanes, so the strip on
	// top of the cells has one height and the day numbers under it line up.
	const laneCount = lanes.length;

	return week.map((day, column) => {
		const dayLanes = [];

		day.events.forEach((event) => {
			const isStart = event.start_date === day.key;
			const isEnd = event.end_date === day.key;

			dayLanes[laneOf[event.id]] = {
				event,
				dayKey: day.key,
				isStart,
				isEnd,
				joinsPrevious: !isStart && column > 0,
				joinsNext: !isEnd && column < week.length - 1,
				// Label only the first piece of the bar on each week row —
				// repeating it on every day would break the "one bar" look.
				showTitle: isStart || column === 0,
			};

			if (dayLanes[laneOf[event.id]].showTitle) {
				// The label is drawn across every day the bar covers in this
				// row, not squeezed into the first cell — `span` is how many
				// cells it may use, `spanEndKey` the last of them.
				let span = 1;
				while (column + span < week.length && week[column + span].events.includes(event)) span++;

				dayLanes[laneOf[event.id]].span = span;
				dayLanes[laneOf[event.id]].spanEndKey = week[column + span - 1].key;
			}
		});

		return Array.from({ length: laneCount }, (_, lane) => dayLanes[lane] || null);
	});
}


// Same default EventModal's color picker starts on, so an event saved
// without a color looks the same in the calendar as in its modal.
export const DEFAULT_EVENT_COLOR = "#2563eb";


// Event colors come from a free color picker, so pick white or dark text
// by the background's perceived brightness to keep the label readable.
export function getEventTextColor(hex) {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
	if (!match) return "#fff";

	const value = parseInt(match[1], 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;

	return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#1e293b" : "#fff";
}


// Which of an event's hours belong on a given day: the start time only on
// its first day, the end time only on its last (a single-day event gets
// both). Either is null when the event has no hours set.
export function getEventDayTimes(event, dayKey) {
	const start = event.start_date === dayKey && event.start_time ? event.start_time.slice(0, 5) : null;
	const end = event.end_date === dayKey && event.end_time ? event.end_time.slice(0, 5) : null;

	return { start, end };
}


// Which day of the event `dayKey` is, e.g. { day: 2, total: 3 } — the
// phone view stacks days as separate cards, so a multi-day event is tied
// together by this counter instead of a bar running across cells.
export function getEventDayPosition(event, dayKey) {
	const DAY_MS = 24 * 60 * 60 * 1000;
	const toTime = (key) => Date.UTC(...key.split("-").map((part, i) => Number(part) - (i === 1 ? 1 : 0)));

	return {
		day: Math.round((toTime(dayKey) - toTime(event.start_date)) / DAY_MS) + 1,
		total: Math.round((toTime(event.end_date) - toTime(event.start_date)) / DAY_MS) + 1,
	};
}
