import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";
import "./Style/Page.css";
import "./Style/ProductsRequested.css";
import { pushSuccessToast } from "../utils/errorToast";

export const ProductsRequested = ({
	id,
	onProductForwarded,
	disabled
}) =>{

	const [productsRequested,setProductsRequested] = useState([]);
	const [products,setProducts] = useState([]);
	const [productTypes,setProductTypes] = useState([]);

	const [newProduct, setNewProduct] = useState({
		name: "",
		reference: "",
		product_type_id: ""
	});

	const [isAddingProduct, setIsAddingProduct] = useState(false);
	const [isSearchSelected, setIsSearchSelected] = useState(false);
	const [searchProduct, setSearchProduct] = useState("");
	const refSearch = useRef(null);
	const [debouncedValue, setDebouncedValue] = useState("");

	const [pendingForwardPR, setPendingForwardPR] = useState(null);

	useEffect(()=>{
		loadPRs();
		loadProducts();
		loadProductTypes();
	},[]); 

	const loadProductTypes = async () => {
		try{
			const response = await api.get(`/product_types`);
			setProductTypes(response.data.product_type_list);
		}catch(error){
			console.error(error);
		}
	}

	const loadProducts = async () => {
		try{
			const p = await getProducts(searchProduct);
			setProducts(p);
		}catch(error){
			console.error(error);
		}
	}
	
	const loadPRs = async () => {
		try{
			const response = await api.get(`/services/${id}/products_requested`);
			setProductsRequested(response.data.spr_list);
		}catch(error){
			console.error(error);
		}
	}

	const getProducts = async (str) =>{
		try{

			const response = await api.get(`productsOr`,{
				params: {
					q: str,
				}});
			if(typeof response.data.product_list !== "undefined"){
				return response.data.product_list;
			}else{
				return null;
			}
		}catch(error){console.error(error, error?.response?.data?.error)}
	}

	const postProduct = async (name, reference, product_type_id) =>{
		try{
			const response = await api.post(`products`,{
				 name: name ,
				 reference: reference ,
				 product_type_id: product_type_id ,
			})
			if(typeof response.data.product !== "undefined"){
				return response.data.product;
			}else{
				return null;
			}
		}catch(error){console.error(error, error?.response?.data?.error)}
	}

	const postPR = async (p_id) =>{
		try{
			const response = await api.post(`services/${id}/products_requested`,{
				product_id: p_id ,
				quantity: 1,
			})
			if(typeof response.data.spr !== "undefined"){
				return response.data.spr;
			}else{
				return null;
			}
		}catch(error){console.error(error, error?.response?.data?.error)}
	}

	const postAP = async (ap) =>{
		try{
			const response = await api.post(`services/${id}/applied_products`, ap)
			if(typeof response.data.sap !== "undefined"){
				return response.data.sap;
			}else{
				return null;
			}
		}catch(error){console.error(error, error?.response?.data?.error)}
	}

	const deletePR = async (spr_id) =>{
		try{
			const response = await api.delete(`services/${id}/products_requested/${spr_id}`);
			if(typeof response.data.spr !== "undefined"){
				return response.data.spr;
			}else{
				return null;
			}
		}catch(error){console.error(error, error?.response?.data?.error)}
	}
	const updatePR = async (pr) => {
		try {
			const response = await api.put(
				`services/${id}/products_requested/${pr.spr_id}`,
				{
					product_id: pr.product_id,
					quantity: pr.quantity,
					is_ordered: pr.is_ordered,
					is_delivered: pr.is_delivered
				}
			);

			return response.data.spr;
		} catch (error) {
			console.error(error);
			return null;
		}
	};


	useEffect(() => {
		function handleClickOutside(e) {
			if ( refSearch.current && !refSearch.current.contains(e.target)) {
				setIsSearchSelected(false);
			}else{
				setIsSearchSelected(true);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);


	useEffect(()=>{
		const timer = setTimeout(()=>{
			setDebouncedValue(searchProduct);	
		},300);
		return () => clearTimeout(timer);
	},[searchProduct]);

	useEffect(()=>{
		let isCurrent = true;

		const f = async () =>{
			const tempProducts = await getProducts(debouncedValue);
			if(isCurrent) setProducts(tempProducts);
		}
		f();
		return ()=>{isCurrent=false};
	},[debouncedValue]);

	const capitalize = str => {
		str = str.trim();
		return str.charAt(0).toUpperCase() + str.slice(1);
	};
	const handleClickStartAdd = () => {
		if(disabled) return;
		setNewProduct(({...newProduct, name:capitalize(searchProduct)}));
		setIsAddingProduct(true);
		setIsSearchSelected(false);
	}

	const handleClickStartAddCancel = () => {
		setIsAddingProduct(false);
		setNewProduct({ name: "", reference: "", product_type_id: "" });
	}

	const handleClickSelect  = async (p) =>{
		if(disabled) return;
		setIsSearchSelected(false);
		const pr = await postPR(p.id);
		if(pr) pushSuccessToast("Produto pedido adicionado com sucesso");
		loadPRs();
	}

	const handleActionAddProduct = async () =>{
		if(disabled) return;
		const p = await postProduct(newProduct.name, newProduct.reference, newProduct.product_type_id);
		if(p){
			const ap = await postPR(p.id);
			if(ap) pushSuccessToast("Produto pedido adicionado com sucesso");
			loadPRs();
			setIsAddingProduct(false);
			setSearchProduct("");
			setNewProduct({ name: "", reference: "", product_type_id: "" });
		}
	}
	const handleInputChangeBlur = async (pr) => {
		if(disabled) return;
		const newPr = await updatePR(pr);
		if(newPr){
			loadPRs();
		}
	}

	const handleInputChange = (pr) => {
		setProductsRequested(prev =>
			prev.map(item =>
				item.spr_id === pr.spr_id
					? pr
					: item
			)
		);
	};

	const handleActionDeletePR = async (id) => {
		if(disabled) return;
		const pr = await deletePR(id);
		loadPRs();
	}

	const handleActionForwardPR = (pr) => {
		if(disabled) return;

		if(pr.is_delivered != 1){
			setPendingForwardPR(pr);
			return;
		}

		forwardPR(pr);
	}

	const handleConfirmForwardPR = () => {
		if(!pendingForwardPR) return;
		forwardPR(pendingForwardPR);
		setPendingForwardPR(null);
	}

	const forwardPR = async (pr) => {
		const newAp = {
			product_id: pr.product_id,
			quantity: pr.quantity,
			is_applied: "0",
		}
		const ap = await postAP(newAp);
		if(ap) {
			onProductForwarded();
			await deletePR(pr.spr_id);
		}

		loadPRs();
	}

	return(
		<>
			<div ref={refSearch}className="search-bar search-products">
				<span><i className="fa-solid fa-magnifying-glass"/></span>
				<input
					type="text"
					onFocus={()=>setIsSearchSelected(true)}
					placeholder={"Pesquisar Produto..."}
					value={searchProduct}
					onChange={(e)=>{setSearchProduct(e.target.value)}}
					disabled={disabled}
				/>
				{!disabled && isSearchSelected && (<ul className="dropdown">
					<li >
						<button className="addEntry" onClick={()=>handleClickStartAdd()}>

							<span><i className="fa-solid fa-plus"/>Adicionar Produto </span>
							<span>{searchProduct}</span>
							<span></span>
						</button>
					</li>
					{products?.map(p => (<li  key={p.id}>
						<button onClick={()=>handleClickSelect(p)}>
							<span>{p.name}</span>
							<span>{p.reference}</span>
							<span>{p.product_type_name}</span>
						</button>
					</li>))}
				</ul>)}
			</div>

			{!disabled && isAddingProduct && (<div className="add-product-card">
				<div className="header">
					<div className="card-title">
						<i className="fa-solid fa-dolly"/>
						<h1>Adicionar Produto</h1>
					</div>
					<div className="card-buttons">
						<button className="confirm" onClick={()=>handleActionAddProduct()}><i className="fa-solid fa-check"/></button>
						<button className="cancel" onClick={()=>handleClickStartAddCancel()}><i className="fa-solid fa-x"/></button>
					</div>
				</div>
				<div className="item-info add-product">
					<div className="item-field">
						<label htmlFor="product-name">Nome: </label>
						<input type="text"  placeholder="S/Nome" value={newProduct.name} onChange={(e)=>setNewProduct(prev=>({...prev, name:e.target.value}))}/>
					</div>
					<div className="item-field ">
						<label htmlFor="product-reference">Referencia: </label>
						<input className="uppercase" type="text" placeholder="S/Referencia"value={newProduct.reference} onChange={(e)=>setNewProduct(prev=>({...prev, reference:e.target.value}))}/>
					</div>
					<div className="item-field">
						<label htmlFor="product-type">Tipo de Produto: </label>
						<select  
							name="productType"
							id="productType"
							value={newProduct.product_type_id}
							onChange={(e)=>(setNewProduct(prev => ({...prev, product_type_id: e.target.value})))}>
							<option value="" disabled>
								Selecione um tipo de produto
							</option>
							{productTypes.map(pt =>(
								<option key={pt.id} value={pt.id}>{pt.name}</option>
							))}
						</select>
					</div>
				</div>
			</div>)}

			<table>
				<thead>
					<tr>
						<th>Nome</th>
						<th>Referencia</th>
						<th>Tipo de Produto</th>
						<th>Quantidade</th>
						<th>Pedido</th>
						<th>Recebido</th>
						<th/>
						<th/>
					</tr>
				</thead>
				<tbody>
					{productsRequested.map((pr) =>(
						<tr key={pr.spr_id}>
							<td id="pr-p-name">{pr.product_name}</td>
							<td id="pr-p-ref">{pr.product_reference}</td>
							<td id="pr-p-p-t">{pr.product_type_name}</td>
							<td id="pr-quant">
								<label htmlFor="product-quantity" className="magic-label">Qt:</label>
								<input type="number" value={pr.quantity} disabled={disabled}
								onChange={(e)=>{handleInputChange({...pr, quantity:e.target.value})}}
								onBlur={(e)=>{handleInputChangeBlur({...pr, quantity:e.target.value});}}/></td>
							<td id="pr-ord" className="pr-status-cell" title="Gerido na página de Encomendas">
								<label className="magic-label">P</label>
								<span className="pr-status-wrap">
									<i className={`fa-solid ${pr.is_ordered==1 ? "fa-circle-check pr-status-yes" : "fa-circle pr-status-no"}`}/>
								</span>
							</td>
							<td id="pr-del" className="pr-status-cell" title="Gerido na página de Encomendas">
								<label className="magic-label">E</label>
								<span className="pr-status-wrap">
									<i className={`fa-solid ${pr.is_delivered==1 ? "fa-circle-check pr-status-yes" : "fa-circle pr-status-no"}`}/>
								</span>
							</td>
							<td id="pr-for"><button className="confirm" disabled={disabled}><i className="fa-solid fa-forward" onClick={(e)=>handleActionForwardPR(pr)}/></button></td>
							<td id="pr-delete"><button className="cancel" disabled={disabled}><i className="fa-solid fa-trash" onClick={(e)=>handleActionDeletePR(pr.spr_id)}/></button></td>
						</tr>
					))}
				</tbody>
			</table>

			{pendingForwardPR && (
				<div className="pr-forward-confirm-backdrop" onClick={() => setPendingForwardPR(null)}>
					<div className="pr-forward-confirm-modal" onClick={(e) => e.stopPropagation()}>
						<div className="pr-forward-confirm-header">
							<h2>Produto ainda não recebido</h2>
							<button className="cancel" onClick={() => setPendingForwardPR(null)}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>
						<p>
							"{pendingForwardPR.product_name}" ainda não foi marcado como recebido.
							Quer avançar mesmo assim e enviá-lo para Produtos Aplicados?
						</p>
						<div className="pr-forward-confirm-actions">
							<button className="confirm" onClick={handleConfirmForwardPR}>
								<i className="fa-solid fa-check" /> Sim, Avançar
							</button>
							<button className="cancel" onClick={() => setPendingForwardPR(null)}>
								<i className="fa-solid fa-xmark" /> Não
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
