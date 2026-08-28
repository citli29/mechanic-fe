import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const AppliedProducts = ({
	id
}) =>{

	const [appliedProducts,setAppliedProducts] = useState([]);
	const [products,setProducts] = useState([]);
	const [productTypes,setProductTypes] = useState([]);

	useEffect(()=>{console.log(appliedProducts)},[appliedProducts]);
	useEffect(()=>{
		loadAPs();
		loadProducts();
		loadProductTypes();
	},[]); 
	useEffect(()=>{console.log("APs:",appliedProducts) },[appliedProducts]);
	useEffect(()=>{console.log("Products:",products) },[products]);
	useEffect(()=>{console.log("ProductTypes:",productTypes) },[productTypes]);

	const loadAPs = async () => {
		try{
			const response = await api.get(`/services/${id}/applied_products`);
			setAppliedProducts(response.data.sap_list);
			
		}catch(error){
			console.error(error);
		}
	}

	//Add searchName
	const loadProducts = async () => {
		try{
			const response = await api.get(`/products`);
			setProducts(response.data.product_list);
			
		}catch(error){
			console.error(error);
		}
	}
	
	//Add searchName
	const loadProductTypes = async () => {
		try{
			const response = await api.get(`/product_types`);
			setProductTypes(response.data.product_type_list);
			
		}catch(error){
			console.error(error);
		}
	}

	const [newProduct, setNewProduct] = useState({
		name: "",
		reference: "",
		product_type_id: ""

	});
	const [newAP, setNewAP] = useState({
		product_id:"",
		quantity: 1,
		is_applied: 0,
		product_type_id: "" 
	});
	const [isAddingProduct, setIsAddingProduct] = useState(false);
	const [isAddingAP, setIsAddingAP] = useState(false);

	const refSearch = useRef(null);

	const [isSearchSelected, setIsSearchSelected] = useState(false);
	const [searchProduct, setSearchProduct] = useState("");

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
{isAddingProduct && (
			<div className="add-product-card">
				<div className="header">
					<div className="card-title">
						<i className="fa-solid fa-cart-flatbed"/>
						<h1>Adicionar Produto</h1>
					</div>

					<div className="card-buttons">
						<button className="confirm"><i className="fa-solid fa-check"/></button>
						<button className="cancel"><i className="fa-solid fa-x"/></button>
					</div>
				</div>
				<div className="item-info add-product">
					<div className="item-field">
						<label htmlFor="product-name">Nome: </label>
						<input type="text" placeholder="S/Nome"/>
					</div>
					<div className="item-field ">
						<label htmlFor="product-reference">Referencia: </label>
						<input className="uppercase" type="text" placeholder="S/Referencia"/>
					</div>
					<div className="item-field">
						<label htmlFor="product-type">Tipo de Produto: </label>
						<select  name="productType" id="productType" onChange={(e)=>(setNewAP(prev => ({...prev, product_type_id: e.target.value})))}>
							{productTypes.map(pt =>(
								<option value={pt.id}>{pt.name}</option>
							))}
						</select>
					</div>
				</div>
			</div>)}

			<table>
				<tr>
					<th>Nome</th>
					<th>Referencia</th>
					<th>Tipo de Produto</th>
					<th>Quantidade</th>
					<th>Aplicado</th>
					<th></th>
				</tr>
				{appliedProducts.map((ap,index) =>(
					<tr key={ap.sap_id}>
						<td className="p-name">
							<label htmlFor="product-name" className="magic-label">Nome:</label>
							<input disabled type="text" value={ap?.product_name??""} />{/*onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, product_name: e.target.value }
											: product
									)
								) 
							}/>*/}
						</td>
						<td className="p-reference">
							<label htmlFor="product-reference" className="magic-label">Referencia:</label>
							<input disabled type="text" placeholder="S/Referencia" value={ap?.reference??""} />{/*onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, reference: e.target.value }
											: product
									)
								) */}
						</td>
						<td className="p-p-type"> 
							<label htmlFor="product-product-type" className="magic-label">T. Produto:</label>
							<input disabled type="text" placeholder="S/Referencia" value={ap?.product_type_name??""} />{/*onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, reference: e.target.value }
											: product
									)
								) */}
							{/*
							<select disabled name="productType" id="productType" onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, product_type_id: e.target.value }
											: product
									)
								) 
							}>
								{productTypes.map(pt =>(
									<option value={pt.id}>{pt.name}</option>
								))}
							</select>*/}
						</td>
						<td className="p-quantity">
							<label htmlFor="product-quantity" className="magic-label">Quantidade:</label>
							<input type="number" value={ap?.quantity} onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, quantity: e.target.value }
											: product
									)
								)
							}/>
						</td>
						<td className="td-label-label p-applied">
							<label htmlFor="product-applied" className="magic-label">Aplicado:</label>
							<label >
								<input type="checkbox" checked={Boolean(ap?.is_applied)} onChange={(e)=>
									setAppliedProducts(prev =>
										prev.map((product, i) =>
											i === index
												? { ...product, is_applied: Boolean(e.target.value)?"1":"0"}
												: product
										)
									)
								}/>
							</label>
						</td>
						<td className="p-cancel">
							<button className="cancel"><i className="fa-solid fa-x"/></button>
						</td>
					</tr>

				))}
			</table>
		</>
	);

}
