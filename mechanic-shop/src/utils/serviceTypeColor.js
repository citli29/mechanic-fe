// One accent color per service type, cycling through this palette by id —
// shared so every place that shows a service type (calendars, lists, the
// service header, notification previews) agrees on the same color.
const SERVICE_TYPE_COLORS = ["#2563eb", "#e8aa2e", "#ba2323", "#22c55e", "#a3540a", "#e823d1"];

// A few types get a deliberately chosen color instead of whatever the
// id happens to cycle to — Deslocações' purple predates the shared
// palette (it was the calendars' own hardcoded accent) and is kept as
// the one override everyone agreed looks better than the generic cycle.
const NAMED_OVERRIDES = {
	"Deslocações": "#4c1d95",
};

export function getServiceTypeAccent(serviceTypeId, serviceTypeName) {
	if (serviceTypeName && NAMED_OVERRIDES[serviceTypeName]) return NAMED_OVERRIDES[serviceTypeName];
	if (!serviceTypeId) return "#cbd5e1";
	return SERVICE_TYPE_COLORS[serviceTypeId % SERVICE_TYPE_COLORS.length];
}
