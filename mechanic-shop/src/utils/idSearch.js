// "#123" typed in any search/filter field searches by id instead: the
// field is dropped and id=123 is sent, which the API matches with
// id LIKE %123% (so "#12" also finds 112, 120, ...). A lone "#" is ignored.
export function applyIdSearch(params) {
	for (const [key, value] of Object.entries(params)) {
		if (typeof value !== "string") continue;

		const match = value.trim().match(/^#\s*(\d*)$/);
		if (!match) continue;

		delete params[key];
		if (match[1]) params.id = match[1];
	}
	return params;
}
