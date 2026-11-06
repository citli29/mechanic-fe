// What the printed service documents (Termo de Responsabilidade, Resumo de Serviço)
// say about the shop. THE ONE PLACE TO CHANGE IT.
//
// Empty strings are simply left out of the print, so fill in what you have.

export const SHOP = {
	name: "Oficina Lima",
	subtitle: "Reparação e Manutenção Automóvel",
	address: "Rua da Vista Alegre, 1206, Alpendorada e Matos",          // e.g. "Rua …, 4900-000 Viana do Castelo"
	phone: "255 619 440",            // e.g. "258 000 000"
	email: "oficinavieiralima@gmail.com",            // e.g. "geral@oficina.pt"
	taxNr: "505 805 545",            // NIF of the shop
	website: "",
	// Logo at the top left (the original, cropped). In public/brand/.
	logo: "/brand/oficina_logo_print.svg",
};

// Conditions printed above the signatures on the Termo de Responsabilidade, one
// paragraph per entry (waiting on the administration's texts). An empty
// list leaves the block out.
export const TERMS = [
	// "O orçamento é válido por 30 dias.",
	// "Viaturas não levantadas no prazo de 15 dias após aviso estão sujeitas a parqueamento.",
];

// The authorization above the signatures on the Termo de Responsabilidade: two
// predefined texts, picked with the toggle on the print page (the first is
// the default). On the page each can still be edited for that print only.
//   label  = the toggle button      title = optional bold heading
//   text   = "\n" starts a new paragraph, *like this* prints in bold
//   {name}   = who dropped the car off   (blank line when empty)
//   {phone}  = their phone               (blank line when empty)
//   {client} = the service's client
export const AUTHORIZATION_TEXTS = [
	{
		label: "Compromisso do cliente",
		text: "Autorizo a realização dos serviços constantes nesta folha de obra e aceito as condições gerais de reparação da oficina. Comprometo-me a efetuar o pagamento integral dos trabalhos e peças faturados no momento do levantamento da viatura. Autorizo ainda a circulação do veículo na via pública para a realização de testes de diagnóstico e pós-reparação indispensáveis ao serviço. Fui informado(a) de que a oficina não se responsabiliza por quaisquer objetos ou valores deixados no veículo.",
	},
	{
		label: "Declaração de autorização",
		title: "Declaração de autorização e compromisso do cliente",
		text: [
			"Pelo presente documento, o cliente acima identificado autoriza expressamente a realização dos serviços e reparações descritos nesta folha de obra, bem como a aplicação das peças, consumíveis e mão de obra necessários.",
			"*1. Orçamentos e custos:* O cliente declara ter tomado conhecimento e aprovado o orçamento inicial estimado para esta intervenção. Caso surja a necessidade de trabalhos ou peças adicionais não previstos, a oficina compromete-se a solicitar uma nova autorização (verbal ou escrita) antes de proceder à sua execução.",
			"*2. Condições de pagamento e retirada:* O cliente compromete-se a efetuar o pagamento integral do valor final dos serviços no ato de levantamento do veículo. Mais declara ter conhecimento de que o veículo apenas será entregue após a liquidação total da fatura.",
			"*3. Testes de estrada:* Fica autorizada a realização de testes de condução e rodagem em via pública por técnicos qualificados da oficina, sempre que tal seja estritamente necessário para o diagnóstico ou verificação da eficácia da reparação.",
			"*4. Objetos pessoais:* A oficina não se responsabiliza pelo extravio de objetos de valor, equipamentos eletrónicos ou dinheiro deixados no interior do veículo.",
			"Por estar de pleno acordo com todas as condições acima descritas, assina o presente documento.",
		].join("\n"),
	},
];
