import "./LabSummary.css";

// Generated from the Laboratório section (see utils/labSummary.js) —
// read-only, shown above Descrição de Avaria and in the print summary.
// With a title it takes over the label of the field under it.
export default function LabSummaryList({ items, title, onClick }) {
	return (
		<ul
			className={`lab-summary ${onClick ? "is-clickable" : ""}`}
			title={onClick ? "Gerado a partir do Laboratório — clique para abrir" : "Gerado a partir do Laboratório"}
			onClick={onClick}
			{...(onClick && {
				role: "link",
				tabIndex: 0,
				onKeyDown: (e) => { if (e.key === "Enter") onClick(); },
			})}
		>
			{title && <li className="lab-summary-title">{title}</li>}
			{items.map((item) => (
				<li key={item.id}>
					<span className="lab-summary-item">
						<i className={item.iClass || "fa-solid fa-flask"}/> {item.count > 1 && `${item.count}x `}{item.name}
					</span>
					{item.properties.length > 0 && (
						<span className="lab-summary-properties">
							{item.properties.map((p) => `${p.name}: ${p.value}`).join(" · ")}
						</span>
					)}
					{item.actions.length > 0 && (
						<ul>
							{item.actions.map((action, index) => (
								<li key={index} className={action.isDone ? "is-done" : ""}>
									<i className={action.isDone ? "fa-solid fa-square-check" : "fa-regular fa-square"}/>
									{" "}{action.name}
									{action.note && <span className="lab-summary-value"> {action.note}</span>}
								</li>
							))}
						</ul>
					)}
				</li>
			))}
		</ul>
	);
}
