import { Link } from "react-router-dom";
import { getServiceTypeAccent } from "../../utils/serviceTypeColor";
import "./Style/ServiceClusterTabs.css";

function getStatusInfo(info) {
	if (info.checkout) return { badgeClass: "state-delivered", label: "Entregue" };
	if (info.is_finished) return { badgeClass: "state-finished", label: "Terminado" };
	return { badgeClass: "state-not-finished", label: "Por Terminar" };
}

function subLabel(info) {
	const car = [info.car_plate, [info.car_make_name, info.car_model_name].filter(Boolean).join(" ")]
		.filter(Boolean)
		.join(" - ");

	return car || info.client_name || "";
}

export function ServiceClusterTabs({ currentId, currentService, clusterMates }) {
	if (!clusterMates || clusterMates.length === 0) return null;

	const currentInfo = {
		service_id: Number(currentId),
		checkout: currentService.checkout,
		is_finished: currentService.is_finished,
		service_type_id: currentService.service_type_id,
		service_type_name: currentService.service_type_name,
		client_name: currentService.client_name,
		car_plate: currentService.car_plate,
		car_make_name: currentService.car_make_name,
		car_model_name: currentService.car_model_name,
	};

	// clusterMates is fetched async and keyed off currentId, so right after
	// navigating between tabs there's a render where it still holds the
	// PREVIOUS service's mates — which can include the service we just
	// navigated to. Filter it out defensively to avoid a duplicate key.
	const mates = clusterMates.filter((mate) => mate.service_id !== Number(currentId));
	const tabs = [currentInfo, ...mates].sort((a, b) => a.service_id - b.service_id);

	return (
		<div className="service-cluster-tabs">
			{tabs.map((tab) => {
				const isCurrent = tab.service_id === Number(currentId);
				const status = getStatusInfo(tab);
				const sub = subLabel(tab);
				const typeAccent = getServiceTypeAccent(tab.service_type_id, tab.service_type_name);
				const style = { "--tab-type-color": typeAccent };
				const tabTitle = [tab.service_type_name, status.label].filter(Boolean).join(" — ");

				const content = (
					<>
						<span className={`service-cluster-tab-dot ${status.badgeClass}`} title={status.label} />
						<span className="service-cluster-tab-id">#{tab.service_id}</span>
						{sub && <span className="service-cluster-tab-sub">{sub}</span>}
					</>
				);

				return isCurrent ? (
					<div key={tab.service_id} className="service-cluster-tab active" style={style} title={tabTitle}>
						{content}
					</div>
				) : (
					<Link
						key={tab.service_id}
						to={`/services/${tab.service_id}`}
						className="service-cluster-tab"
						style={style}
						title={tabTitle}
					>
						{content}
					</Link>
				);
			})}
		</div>
	);
}
