// Browser tab title per page: "Oficina Lima - <page>". The Navbar sets it on
// every navigation (with the unread count in front: "(3) Oficina Lima - …").
// Add a new page here when adding a route in App.jsx.

export const APP_NAME = "Oficina Lima";

const STATIC_TITLES = {
	"/": "Início",
	"/services": "Serviços",
	"/services/new": "Novo Serviço",
	"/services_calendar": "Calendário de Serviços",
	"/services_manage": "Gestão de Serviços",
	"/schedules": "Marcações",
	"/schedules/new": "Nova Marcação",
	"/schedules_calendar": "Calendário de Marcações",
	"/budgets": "Orçamentos",
	"/budgets_manage": "Gestão de Orçamentos",
	"/notifications": "Notificações",
	"/clients": "Clientes",
	"/cars": "Viaturas",
	"/makes": "Marcas",
	"/models": "Modelos",
	"/products": "Produtos",
	"/product_types": "Tipos de Produtos",
	"/service_types": "Tipos de Serviço",
	"/products_requested": "Encomendas",
	"/lab_management": "Gestão de Laboratório",
	"/users": "Utilizadores",
	"/user_times_stats": "Tempos dos Utilizadores",
	"/time_records": "Registos de Tempo",
	"/events": "Eventos",
	"/devices": "Dispositivos",
	"/backups": "Cópias de Segurança",
	"/trash": "Lixo",
};

// Detail pages: "<name> #<id>".
const DETAIL_TITLES = [
	[/^\/services\/(\d+)$/, "Serviço"],
	[/^\/schedules\/(\d+)$/, "Marcação"],
	[/^\/clients\/(\d+)$/, "Cliente"],
	[/^\/cars\/(\d+)$/, "Viatura"],
	[/^\/products\/(\d+)$/, "Produto"],
	[/^\/users\/(\d+)$/, "Utilizador"],
];

export function pageTitleFor(pathname) {
	const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
	if (STATIC_TITLES[path]) return STATIC_TITLES[path];
	for (const [pattern, name] of DETAIL_TITLES) {
		const match = path.match(pattern);
		if (match) return `${name} #${match[1]}`;
	}
	return null;
}

// "Oficina Lima - Serviço #116" (just "Oficina Lima" for an unknown page).
export function fullTitle(page) {
	return page ? `${APP_NAME} - ${page}` : APP_NAME;
}
