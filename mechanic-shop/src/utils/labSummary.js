// What the lab is doing on a service, as a nested list: one entry per
// lab item, grouped by item type, with its filled-in properties and its
// actions — each with its done state and note — e.g.
//   Injetor — Referencia: um um · Marca: Bosch
//     ☑ Reparação: com fuga
//     ☐ Teste
// Identical items are merged and counted (see the end of the function).
export function buildLabSummary(labItems, labActionValues, labPropertyValuesByLabItem) {
	// Items of the same type sit together (all Injetores, then all
	// Turbos…), types in the order their first item was added.
	const typeOrder = new Map();
	labItems.forEach((labItem) => {
		if (!typeOrder.has(labItem.t_item_id)) typeOrder.set(labItem.t_item_id, typeOrder.size);
	});
	const groupedItems = [...labItems].sort((a, b) => typeOrder.get(a.t_item_id) - typeOrder.get(b.t_item_id));

	const entries = groupedItems.map((labItem) => {
		const properties = (labPropertyValuesByLabItem[labItem.id] || [])
			.filter((lpv) => lpv.value != null && String(lpv.value).trim() !== "")
			.sort((a, b) => String(a.property_name).localeCompare(String(b.property_name), "pt"))
			.map((lpv) => ({ name: lpv.property_name, value: String(lpv.value).trim() }));

		const actions = labActionValues
			.filter((lav) => lav.l_item_id === labItem.id)
			.sort((a, b) => a.t_action_id - b.t_action_id)
			.map((lav) => ({
				name: lav.action_name,
				note: lav.note ? String(lav.note).trim() || null : null,
				isDone: !!lav.is_done,
			}));

		return {
			id: labItem.id,
			name: labItem.item_name,
			iClass: labItem.item_i_class,
			properties,
			actions,
			count: 1,
		};
	});

	// Items that would read exactly the same (same type, properties and
	// actions with values) collapse into one entry with a count — "2x
	// Injetor". Any difference, like one having a Referência and the
	// other not, keeps them apart.
	const merged = new Map();
	entries.forEach((entry) => {
		const key = JSON.stringify([entry.name, entry.properties, entry.actions]);
		if (merged.has(key)) merged.get(key).count += 1;
		else merged.set(key, entry);
	});
	return [...merged.values()];
}

