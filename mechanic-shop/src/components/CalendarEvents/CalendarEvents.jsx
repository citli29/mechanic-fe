import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
	getEventTextColor,
	getEventDayTimes,
	getEventDayPosition,
	DEFAULT_EVENT_COLOR,
} from "../../utils/eventLanes";
import "./CalendarEvents.css";

// Events as shown on the Marcações and Serviços calendars — the loading
// state plus the two ways a day draws them (the desktop grid's connected
// bars and the phone view's per-card strip), shared so both calendars stay
// identical.


function formatEventTimes({ start, end }) {
	if (start && end) return `${start}–${end}`;
	if (start) return `desde ${start}`;
	if (end) return `até ${end}`;
	return "";
}


// Loads the events overlapping [startDate, endDate] (the calendar's padded
// grid range) and holds which one is open in the modal / hovered on the grid.
export function useCalendarEvents(startDate, endDate, onError) {
	const [events, setEvents] = useState([]);
	const [selectedEvent, setSelectedEvent] = useState(null);
	// Hovering any piece of a multi-day bar highlights the whole bar.
	const [hoveredEventId, setHoveredEventId] = useState(null);

	async function reload() {
		try {
			// The backend's start_date/end_date filters already mean "overlaps
			// this window" (end_date >= window start AND start_date <= window end).
			const res = await api.get("/events", { params: { start_date: startDate, end_date: endDate } });
			setEvents(res.data.event_list || []);
		} catch (err) {
			onError?.(err);
		}
	}

	useEffect(() => { reload(); }, [startDate, endDate]);

	return { events, reload, selectedEvent, setSelectedEvent, hoveredEventId, setHoveredEventId };
}


// Desktop grid: a strip across the top of the day cell, one lane per event
// (laid out per week by layoutWeekEvents, so a multi-day event keeps the
// same lane and its pieces join into one bar across the cells).
export function DayEventLanes({ lanes, hoveredEventId, onHover, onSelect }) {
	if (!lanes || lanes.length === 0) return null;

	return (
		<div className="day-event-lanes">
			{lanes.map((segment, lane) => {
				if (!segment) return <div key={`empty-${lane}`} className="day-event-bar empty" />;

				const { event } = segment;
				const color = event.color || DEFAULT_EVENT_COLOR;

				const classes = [
					"day-event-bar",
					segment.isStart ? "is-start" : "",
					segment.joinsNext ? "joins-next" : "",
					hoveredEventId === event.id ? "hovered" : "",
				].filter(Boolean).join(" ");

				// Start time only if the event starts on this label's first
				// day, end time only if it finishes within this row.
				const timeLabel = segment.showTitle && formatEventTimes({
					start: getEventDayTimes(event, segment.dayKey).start,
					end: getEventDayTimes(event, segment.spanEndKey).end,
				});

				return (
					<button
						type="button"
						key={event.id}
						className={classes}
						style={{ background: color, color: getEventTextColor(color) }}
						title={event.description || event.title}
						onClick={() => onSelect(event)}
						onMouseEnter={() => onHover(event.id)}
						onMouseLeave={() => onHover(null)}
					>
						{segment.showTitle && (
							<span className="day-event-label" style={{ "--span": segment.span }}>
								<span className="day-event-title">{event.title}</span>
								{event.user_name && <span className="day-event-user">{event.user_name}</span>}
								{timeLabel && <span className="day-event-time">{timeLabel}</span>}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}


// Phone view: the same coloured strip across the top of the day card, one
// full-width bar per event. Days are separate cards there, so a multi-day
// event is tied together by a "2/3" counter instead of a joined bar.
export function DayEventStrip({ events, dayKey, onSelect }) {
	if (!events || events.length === 0) return null;

	return (
		<div className="day-event-strip">
			{events.map((event) => {
				const timeLabel = formatEventTimes(getEventDayTimes(event, dayKey));
				const position = getEventDayPosition(event, dayKey);
				const color = event.color || DEFAULT_EVENT_COLOR;

				return (
					<button
						type="button"
						key={event.id}
						className={`day-event-strip-bar ${position.day === 1 ? "is-start" : ""}`}
						style={{ background: color, color: getEventTextColor(color) }}
						title={event.description || event.title}
						onClick={() => onSelect(event)}
					>
						<span className="day-event-title">{event.title}</span>
						{event.user_name && <span className="day-event-user">{event.user_name}</span>}
						{timeLabel && <span className="day-event-time">{timeLabel}</span>}
						{position.total > 1 && (
							<span className="day-event-count">{position.day}/{position.total}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
