import { getServiceTypeAccent } from "../../utils/serviceTypeColor";
import "./ServiceTypeBadge.css";

export default function ServiceTypeBadge({ serviceTypeId, label, className = "" }) {
	const accent = getServiceTypeAccent(serviceTypeId, label);

	return (
		<span
			className={`service-type-badge ${className}`}
			style={{ background: `${accent}1a`, borderColor: accent }}
			title={label || "Sem Tipo"}
		>
			<span className="service-type-badge-label">{label || "Sem Tipo"}</span>
		</span>
	);
}
