import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const ProductsRequested = ({
	id
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

	useEffect(()=>{
		loadPRs();
		loadProducts();
		loadProductTypes();
	},[]); 

	useEffect(()=>{console.log("PRs:",productsRequested) },[productsRequested]);
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

	const postPR = async (p_id) =>{
		try{
			const response = await api.post(`services/${id}/products_requested`,{
				 product_id: p_id ,
				 
			})
			if(typeof response.data.spr !== "undefined"){
				return response.data.spr;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const deletePR = async (spr_id) =>{
		try{
			const response = await api.delete(`services/${id}/products_requested/${spr_id}`);
			if(typeof response.data.spr !== "undefined"){
				return response.data.spr;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}
	const updatePR = async (pr) => {
		try {
			const response = await api.put(
				`services/${id}/products_requested/${pr.spr_id}`,
				{
					product_id: pr.product_id,
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
		setNewProduct(({...newProduct, name:capitalize(searchProduct)}));
		setIsAddingProduct(true);
		setIsSearchSelected(false);
	}

	const handleClickStartAddCancel = () => {
		setIsAddingProduct(false);
	}

	const handleClickSelect  = async (p) =>{
		setIsSearchSelected(false);
		const pr = await postPR(p.id);
		loadPRs();
	}

	const handleActionAddProduct = async () =>{
		const p = await postProduct(newProduct.name, newProduct.reference, newProduct.product_type_id);
		if(p){
			const ap = await postPR(p.id);
			loadPRs();
			setIsAddingProduct(false);
			setSearchProduct("");
		}
	}

	const handleActionDeletePR = async (id) => {
		const pr = await deletePR(id);
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
						<th>Pedido</th>
						<th>Entregue</th>
						<th/>
						<th/>
					</tr>
				</thead>
				<tbody>
					{productsRequested.map((pr) =>(
						<tr key={pr.spr_id}>
							<td>{pr.product_name}</td>
							<td>{pr.product_reference}</td>
							<td>{pr.product_type_name}</td>
							<td><label htmlFor="is-ordered"><input type="checkbox" checked={pr.is_ordered==1}/></label></td>
							<td><label htmlFor="is-delivered"><input id="is-delivered"type="checkbox" checked={pr.is_delivered==1}/></label></td>
							<td><button className="confirm"><i className="fa-solid fa-forward"/></button></td>
							<td><button className="cancel"><i className="fa-solid fa-trash"/></button></td>
						</tr>
					))}
				</tbody>
			</table>
		</>
	);
}
