import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const AppliedProducts = ({
	id
}) =>{

	const emptyAP = {
		product_id:"",
		quantity: 1,
		is_applied: "0",
		product_type_id: "" 
	}

	const [appliedProducts,setAppliedProducts] = useState([]);
	const [products,setProducts] = useState([]);
	const [productTypes,setProductTypes] = useState([]);

	const [newAP, setNewAP] = useState(emptyAP);
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

	useEffect(()=>{console.log(appliedProducts)},[appliedProducts]);
	useEffect(()=>{
		loadAPs();
		loadProducts();
		loadProductTypes();
	},[]); 

	useEffect(()=>{console.log("APs:",appliedProducts) },[appliedProducts]);
	useEffect(()=>{console.log("Products:",products) },[products]);
	useEffect(()=>{console.log("ProductTypes:",productTypes) },[productTypes]);

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
	
	const loadAPs = async () => {
		try{
			const response = await api.get(`/services/${id}/applied_products`);
			setAppliedProducts(response.data.sap_list);
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
		}catch(error){console.error(error, error.response.data.error)}
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
		}catch(error){console.error(error, error.response.data.error)}
	}

	const postAP = async (p_id) =>{
		try{
			const response = await api.post(`services/${id}/applied_products`,{
				...emptyAP,
				 product_id: p_id ,
				 
			})
			if(typeof response.data.sap !== "undefined"){
				return response.data.make;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const deleteAP = async (ap_id) =>{
		try{
			const response = await api.delete(`services/${id}/applied_products/${ap_id}`);
			if(typeof response.data.sap !== "undefined"){
				return response.data.make;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}
	const updateAP = async (ap) => {
		try {
			const response = await api.put(
				`services/${id}/applied_products/${ap.sap_id}`,
				{
					product_id: ap.product_id,
					quantity: ap.quantity,
					is_applied: ap.is_applied
				}
			);

			return response.data.sap;
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
		setNewProduct(({...emptyAP, name:capitalize(searchProduct)}));
		setIsAddingProduct(true);
		setIsSearchSelected(false);
	}

	const handleClickStartAddCancel = () => {
		setIsAddingProduct(false);
	}

	const handleClickSelect  = async (p) =>{
		setIsSearchSelected(false);
		const ap = await postAP(p.id);
		loadAPs();
	}

	const handleActionAddProduct = async () =>{
		const p = await postProduct(newProduct.name, newProduct.reference, newProduct.product_type_id);
		if(p){
			const ap = await postAP(p.id);
			loadAPs();
			setIsAddingProduct(false);
			setSearchProduct("");
		}
	}

	const handleActionDeleteAP = async (id) => {
		const ap = await deleteAP(id);
		loadAPs();
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
				/>
				{isSearchSelected && (<ul className="dropdown">
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

			{isAddingProduct && (<div className="add-product-card">
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
						<th>Aplicado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{appliedProducts.map((ap,index) =>(
						<tr key={ap.sap_id}>
							<td className="p-name">
								<label htmlFor="product-name" className="magic-label">Nome:</label>
								<input disabled type="text" value={ap?.product_name??""}/>
							</td>
							<td className="p-reference">
								<label htmlFor="product-reference" className="magic-label">Referencia:</label>
								<input disabled type="text" placeholder="-" value={ap?.product_reference??""}/>
							</td>
							<td className="p-p-type"> 
								<label htmlFor="product-product-type" className="magic-label">T. Produto:</label>
								<input disabled type="text" placeholder="-" value={ap?.product_type_name??""}/>
							</td>
							<td className="p-quantity">
								<label htmlFor="product-quantity" className="magic-label">Quantidade:</label>
								<input type="number" value={ap?.quantity??""} onChange={async (e) => {
									const quantity = Number(e.target.value);

									setAppliedProducts(prev =>
										prev.map((product, i) =>
											i === index
												? { ...product, quantity }
												: product
										)
									);

									await updateAP({
										...ap,
										quantity
									});
								}}/>
							</td>
							<td className="td-label-label p-applied">
								<label htmlFor="product-applied" className="magic-label">Aplicado:</label>
								<label>
									<input
										type="checkbox"
										checked={ap?.is_applied === "1"}
										onChange={async (e) => {
											const is_applied = e.target.checked ? "1" : "0";

											setAppliedProducts(prev =>
												prev.map((product, i) =>
													i === index
														? { ...product, is_applied }
														: product
												)
											);

											await updateAP({
												...ap,
												is_applied
											});
										}}
									/>
								</label>
							</td>
							<td className="p-cancel">
								<button className="cancel" onClick={()=>handleActionDeleteAP(ap.sap_id)}><i className="fa-solid fa-x"/></button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</>
	);
}
