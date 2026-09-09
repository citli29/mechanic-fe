import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./../api/axios";

import { ServiceHeader } from "./Service/ServiceHeader";
import { CarPicker } from "../components/Pickers/CarPicker";

import "./Style/ServiceShow.css";
import { ClientPicker } from "../components/Pickers/ClientPicker";
import { MarkedTextarea } from "./MarkedTextarea";
import { AppliedProducts } from "./AppliedProducts";
import { UserTimes } from "./UserTimes";
import { UserTimePunches } from "./UserTimePunches";
import { ProductsRequested } from "./ProductsRequested";

const NAV_SECTIONS = [
	{ id: "section-car", label: "Viatura", icon: "fa-car" },
	{ id: "section-client", label: "Cliente", icon: "fa-user" },
	{ id: "section-agreed", label: "Serviço Acordado", icon: "fa-pen-fancy" },
	{ id: "section-done", label: "Serviço Realizado", icon: "fa-wrench" },
	{ id: "section-requested", label: "Pedido de Produtos", icon: "fa-cart-arrow-down" },
	{ id: "section-applied", label: "Produtos Aplicados", icon: "fa-store" },
	{ id: "section-times", label: "Tempos de Serviço", icon: "fa-hourglass-half" },
	{ id: "section-finished", label: "Finalizado", icon: "fa-flag-checkered" },
];

export default function ServiceShow2() {
	const { id } = useParams();
	const defaultService = {
		id: "",
		client_id:"",
		kms:"",
		checkin: "",
		checkout: "",
		malfunction:"",
		service:"",
		car_id:"",
		schedule_id: "",
		note:"",
		is_finished: false,
		
		service_type_id: "",
		service_type_name: "",
		signed_service:"",
		checkout_predict: "2030-01-01",
		r_name: "",
		r_phone: "",

		office_check: false,
	}

	const markedTextarea = useRef();
	const [service, setService] = useState(defaultService);
	const [isAllowedEditing, setIsAllowedEditing] = useState(false);
	const skipSave = useRef(true);
	const [activeSection, setActiveSection] = useState(NAV_SECTIONS[0].id);
	const [saveStatus, setSaveStatus] = useState("idle"); // idle | pending | saving | saved | error

	useEffect(() => { loadService(); }, []);

	useEffect(()=>{
		document.querySelectorAll(".info").forEach((element) => {
			element.addEventListener("mouseenter", () => {
				element.classList.add("show");
			});

			element.addEventListener("mouseleave", () => {
				element.classList.remove("show");
			});
		});
	},[])

	useEffect(() => {
		const OFFSET = 96;
		let ticking = false;

		function updateActiveSection() {
			let current = NAV_SECTIONS[0].id;

			for (const { id } of NAV_SECTIONS) {
				const el = document.getElementById(id);
				if (!el) continue;

				if (el.getBoundingClientRect().top <= OFFSET) {
					current = id;
				} else {
					break;
				}
			}

			setActiveSection((prev) => (prev === current ? prev : current));
		}

		function onScroll() {
			if (ticking) return;
			ticking = true;

			requestAnimationFrame(() => {
				updateActiveSection();
				ticking = false;
			});
		}

		updateActiveSection();

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);

		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, []);

	function scrollToSection(id) {
		document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	function handlePrint(mode) {
		document.body.classList.toggle("print-summary", mode === "summary");
		window.print();
	}

	useEffect(() => {
		function resetPrintMode() {
			document.body.classList.remove("print-summary");
		}

		window.addEventListener("afterprint", resetPrintMode);
		return () => window.removeEventListener("afterprint", resetPrintMode);
	}, []);

	const NOTE_SEPARATOR = "\u001E";
	function extractPlainNote(raw) {
		if (typeof raw !== "string") return "";
		const i = raw.indexOf(NOTE_SEPARATOR);
		return i === -1 ? raw : raw.slice(i + NOTE_SEPARATOR.length);
	}

	async function loadService() {
		try {
			const response = await api.get(`/services/${id}`);

			setService({
				...defaultService,
				...response.data.service
			});
		} catch (error) {
			console.error(error);
		}
	}

	const putService = async (service) =>{
		try{
			if(service?.id){
				const response = await api.put(`services/${service.id}`,service)
				if(typeof response.data.service !== "undefined"){
					return response.data.service;
				}else{
					return null;
				}
			}
			return defaultService;
		}catch(error){console.error(error, error.response.data.error)}
	}


	useEffect(() => {
		const f = async () =>{
			setSaveStatus("saving");

			const s = await putService(service);

			if(!s) {
				setSaveStatus("error");
				loadService();
			} else {
				setSaveStatus("saved");
			}
		}

		if (!service?.id) return;

		if (skipSave.current) {
			skipSave.current = false;
			return;
		}

		setSaveStatus("pending");

		const timer = setTimeout(() => {
			f();
		}, 300);

		return () => clearTimeout(timer);
	}, [service]);

	useEffect(() => {
		if (saveStatus !== "saved" && saveStatus !== "error") return;

		const timer = setTimeout(() => {
			setSaveStatus("idle");
		}, saveStatus === "error" ? 5000 : 2000);

		return () => clearTimeout(timer);
	}, [saveStatus]);

	/* USER TIME */
	const[uts,setUts] = useState([]);
	const[utps,setUtps] = useState([]);
	const[timeSummary,setTimeSummary] = useState([]);
	useEffect(()=>{ setTimeSummary(sumUserMinutes(uts,utps)); },[uts,utps]);

	const  sumUserMinutes = (arr1, arr2) => { 
		const users = {};
		[...arr1, ...arr2].forEach(({ user_id, user_name, minutes }) => { 
			if (!users[user_id]) { 
				users[user_id] = { user_id, user_name, minutes: 0, }; 
			} 
			users[user_id].minutes += minutes??0; 
		}); 
		return Object.values(users);
	}

	const formatMinutes = (minutes) => {
		const m = minutes ?? 0;
		const h = Math.floor(m / 60);
		const rest = m % 60;
		return h > 0 ? `${h}h ${rest}m` : `${rest}m`;
	}

	/*const getServiceStatus = () => {
		if(service?.checkout) return {index: 3, desc:"Entregue"};
		if(service?.office_check) return {index: 2, desc:"Validado"};
		if(service?.is_finished) return {index: 1, desc:"Terminado"};
		return {index: 0, desc:"Por Terminar"}; 
	}
	const getStateClass = () => {
		switch(getServiceStatus().index){
			case 0: return "state-not-finished-bg";
			case 1: return "state-finished-bg";
			case 2: return "state-validated-bg";
			case 3: return "state-delivered-bg";
			default: return "";
		}
	}*/
	const handleClickCheckIsFinished =async (checked) => {
		const s = await putService({...service,is_finished: checked});
		if(s){
			setService(s);
		}
	}
	const [apReload, setApReload] = useState(false);
	const [aps, setAps] = useState([]);

	const isFinished = !!service.is_finished;
	const canEditCarClient = isAllowedEditing && !isFinished;

	return(
		<div className="service-page">
			<div className="service-layout">
				<nav className="service-nav">
					<button type="button" className="service-nav-print" onClick={() => handlePrint("agreement")}>
						<i className="fa-solid fa-print" /> Imprimir
					</button>
					<button type="button" className="service-nav-print" onClick={() => handlePrint("summary")}>
						<i className="fa-solid fa-file-lines" /> Imprimir Resumo
					</button>
					{saveStatus !== "idle" && (
						<div className={`service-save-status service-save-status-${saveStatus}`}>
							{saveStatus === "pending" && <><i className="fa-regular fa-circle"/> Alterações por guardar</>}
							{saveStatus === "saving" && <><i className="fa-solid fa-spinner fa-spin"/> A guardar...</>}
							{saveStatus === "saved" && <><i className="fa-solid fa-circle-check"/> Guardado</>}
							{saveStatus === "error" && <><i className="fa-solid fa-triangle-exclamation"/> Erro ao guardar</>}
						</div>
					)}
					{NAV_SECTIONS.map((section) => (
						<button
							key={section.id}
							type="button"
							className={activeSection === section.id ? "active" : ""}
							onClick={() => scrollToSection(section.id)}
						>
							<i className={`fa-solid ${section.icon}`} />
							{section.label}
						</button>
					))}
				</nav>
				<div className="content">
					<ServiceHeader
						service={service}
						onServiceChange={
							(field, value) =>
								setService(prev => ({
									...prev,
									[field]: value,
								}))
						}
						lock={!isAllowedEditing}
						onLockChange={()=>{setIsAllowedEditing(!isAllowedEditing)}}
					/>
					<div className="service-section" id="section-car">
						<h1 className="print-title">
							Informação da viatura
						</h1>
						<CarPicker
							car_id={service.car_id}
							onCarIdChange={(value)=>setService(prev => (
								prev.car_id === value
									? prev :
									{...prev, car_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
						/>
					</div>
					<div className="service-section" id="section-client">
						<h1 className="print-title">
							Informação do cliente
						</h1>
						<ClientPicker
							client_id={service.client_id}
							onClientIdChange={(value)=>setService(prev => (
								prev.client_id === value
									? prev :
									{...prev, client_id: value,}
							))}
							isAllowedEditing={canEditCarClient}
						/>
					</div>
					<div className="service-signed-info-card" id="section-agreed">
					<div className="header">
						<i className="fa-solid fa-pen-fancy"/> 
						<h1>Serviço Acordado</h1>
					</div>
					<div className="body">
						<div className="text-entry">
							<label htmlFor=""disabled={!isAllowedEditing || isFinished}>Descrição de Avaria</label>
							<textarea
								type="text"
								value={service.malfunction??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									malfunction:e.target.value
								}))}
								disabled={!isAllowedEditing || isFinished}/>
						</div>
						<div className="text-entry">
							<label htmlFor="malfunction">Serviço a Realizar</label>
							<textarea
								type="text"
								value={service.signed_service??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									signed_service:e.target.value
								}))}
								disabled={!isAllowedEditing || isFinished}/>
						</div>
					</div>
					<div className="text-entry" id="signing">
						<p>Eu, <span>{service?.r_name??"".trim()?service?.r_name:"______________________________"}</span> , tomei conhecimento e autorizo a realização do serviço acima indicado e contacto através do nrº <span>{service?.r_phone??"".trim()?service?.r_phone:"______________________________"}</span>.</p>
						<p>Assinatura: ________________________________</p>
					</div>
					<div className="service-print-action">
						<button className="options" onClick={() => handlePrint("agreement")}>
							<i className="fa-solid fa-print"/> Imprimir
						</button>
					</div>
				</div>
				<div className="service-done-info-card" id="section-done">
					<div className="header">
						<i className="fa-solid fa-wrench"></i>
						<h1>Serviço Realizado</h1>
					</div>	
					<div className="body">

						<div className="text-entry">
							<label htmlFor="malfunction">Serviço Realizado</label>
							<textarea
								type="text"
								value={service.service??""}
								onChange={(e)=>setService(prev => ({
									...prev,
									service:e.target.value
								}))}
								disabled={isFinished}
							/>
						</div>

						<div className="coloring-buttons">
							<button
								disabled={isFinished}
								onClick={()=>{
									markedTextarea.current.markSelection("note-red");
								}}
							><i className="fa-solid fa-square-pen note-red-button"/></button>
							<button
								disabled={isFinished}
								onClick={()=>{
									markedTextarea.current.markSelection("note-yellow");
								}}
							><i className="fa-solid fa-square-pen note-yellow-button"/></button>
							<button
								disabled={isFinished}
								onClick={()=>{
									markedTextarea.current.markSelection("note-green");
								}}
							><i className="fa-solid fa-square-pen note-green-button"/></button>
							<button
								disabled={isFinished}
								onClick={()=>{
									markedTextarea.current.unmarkSelection();
								}}
							><i className="fa-regular fa-square f"/></button>

						</div>

						<div className="text-entry">
							<label htmlFor="">Notas/Observações</label>

							<MarkedTextarea
								ref={markedTextarea}
								value={service.note??""}
								onChange={(newValue) => {
									setService(prev => ({
										...prev,
										note: newValue,
									}));
								}}
								disabled={isFinished}
							/>
						</div>
					</div>
					<div className="service-print-action">
						<button className="options" onClick={() => handlePrint("summary")}>
							<i className="fa-solid fa-file-lines"/> Imprimir Resumo
						</button>
					</div>
				</div>
				<div className="service-products-requested-card" id="section-requested">
					<div className="header">
						<i className="fa-solid fa-cart-arrow-down"/>
						<h1>Pedido de Produtos</h1>
					</div>	
					<div className="body">
						<ProductsRequested id={id} onProductForwarded={()=>setApReload(true)} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-applied-products-card" id="section-applied">
					<div className="header">
						<i className="fa-solid fa-store"></i>
						<h1>Produtos Aplicados</h1>
					</div>	
					<div className="body">
						<AppliedProducts id={id} apReload={apReload} onApReloaded={()=>setApReload(false)} copy_aps={setAps} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-user-times-card" id="section-times">
					<div className="header">
						<i className="fa-solid fa-hourglass-half"></i>
						<h1>Tempos de Serviço</h1>
					</div>	
					<div className="body">
						<table className="times-summary">
							<thead>
								<tr>
									<th>Funcionário</th>
									<th>Tempo</th>
								</tr>
							</thead>
							<tbody>
								{timeSummary.map(ts=>(
									<tr key={ts.user_id}>
										<td>{ts.user_name}</td>
										<td>{ts.minutes}</td>
									</tr>
								))}
							</tbody>
						</table>
						<UserTimes id={id} copy_uts={setUts} disabled={isFinished}/>
						<UserTimePunches id={id} copy_uts={setUtps} disabled={isFinished}/>
					</div>
				</div>
				<div className="service-is-finished-card" id="section-finished">
					<label htmlFor="is-finished">
						<div className="header">
							<i className="fa-solid fa-flag-checkered"></i>
							<h1>Finalizado</h1>
							<input
								id="is-finished"
								type="checkbox"
								checked={service.is_finished}
								onChange={(e) => {handleClickCheckIsFinished(e.target.checked); }}
							/>
						</div>
					</label>
				</div>
				<div className="print-summary-block">
					<h1>Resumo do Serviço #{service.id}</h1>

					<div className="print-summary-grid">
						<div><strong>Viatura:</strong> {[service.car_plate, service.car_make_name, service.car_model_name].filter(Boolean).join(" - ") || "-"}</div>
						<div><strong>Cliente:</strong> {service.client_name || "-"}</div>
						<div><strong>Telemóvel:</strong> {service.client_phone || "-"}</div>
						<div><strong>Tipo de Serviço:</strong> {service.service_type_name || "-"}</div>
						<div><strong>Entrada:</strong> {service.checkin || "-"}</div>
						<div><strong>Saída:</strong> {service.checkout || "-"}</div>
						<div><strong>Kms:</strong> {service.kms || "-"}</div>
					</div>

					<h2>Descrição de Avaria</h2>
					<p>{service.malfunction || "-"}</p>

					<h2>Serviço Realizado</h2>
					<p>{service.service || "-"}</p>

					<h2>Notas/Observações</h2>
					<p>{extractPlainNote(service.note) || "-"}</p>

					<h2>Produtos Aplicados</h2>
					{aps.length === 0 ? (
						<p>Sem produtos aplicados.</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Referência</th>
									<th>Tipo</th>
									<th>Qt.</th>
									<th>Aplicado</th>
								</tr>
							</thead>
							<tbody>
								{aps.map((ap) => (
									<tr key={ap.sap_id}>
										<td>{ap.product_name || "-"}</td>
										<td>{ap.product_reference || "-"}</td>
										<td>{ap.product_type_name || "-"}</td>
										<td>{ap.quantity}</td>
										<td>{ap.is_applied == "1" ? "Sim" : "Não"}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}

					<h2>Tempo dos Funcionários</h2>
					{timeSummary.length === 0 ? (
						<p>Sem tempos registados.</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Funcionário</th>
									<th>Tempo</th>
								</tr>
							</thead>
							<tbody>
								{timeSummary.map(ts => (
									<tr key={ts.user_id}>
										<td>{ts.user_name}</td>
										<td>{formatMinutes(ts.minutes)}</td>
									</tr>
								))}
								<tr>
									<td><strong>Total</strong></td>
									<td><strong>{formatMinutes(timeSummary.reduce((sum, ts) => sum + (ts.minutes ?? 0), 0))}</strong></td>
								</tr>
							</tbody>
						</table>
					)}
				</div>
				</div>
			</div>
		</div>

	);
}
