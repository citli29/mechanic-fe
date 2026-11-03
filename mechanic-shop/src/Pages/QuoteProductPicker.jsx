import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

// Product search for an orçamento — same search/dropdown as
// AppliedProducts. Picking hands the product back; "Adicionar Produto"
// opens the "Novo produto" pop-up, creates the product (POST /products,
// like AppliedProducts) and then hands it back.
export const QuoteProductPicker = ({
	onSelect,
	placeholder = "Pesquisar Produto...",
	icon = "fa-magnifying-glass",
	disabled = false, // Orçamentado: no new products (the DB refuses them too)
}) =>{

	const [products,setProducts] = useState([]);
	const [productTypes,setProductTypes] = useState([]);
	const [isAddingProduct, setIsAddingProduct] = useState(false);
	const emptyNewProduct = { name: "", reference: "", product_type_id: "" };
	const [newProduct, setNewProduct] = useState(emptyNewProduct);
	const [isSearchSelected, setIsSearchSelected] = useState(false);
	const [searchProduct, setSearchProduct] = useState("");
	const refSearch = useRef(null);
	const [debouncedValue, setDebouncedValue] = useState("");

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

	const loadProductTypes = async () => {
		try{
			const response = await api.get(`/product_types`);
			setProductTypes(response.data.product_type_list);
		}catch(error){
			console.error(error);
		}
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

	useEffect(()=>{
		loadProductTypes();
	},[]);

	// Locked while open: close the dropdown and drop what was typed.
	useEffect(()=>{
		if(!disabled) return;
		setIsSearchSelected(false);
		setSearchProduct("");
	},[disabled]);

	useEffect(() => {
		function handleClickOutside(e) {
			if ( refSearch.current && !refSearch.current.contains(e.target)) {
				setIsSearchSelected(false);
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

	const handleClickSelect = (p, quantity = 1) => {
		setIsSearchSelected(false);
		setSearchProduct("");
		onSelect({
			product_id: p.id,
			name: p.name ?? "",
			reference: p.reference ?? "",
			type: p.product_type_name ?? "",
			quantity,
		});
	}

	const handleClickStartAdd = () => {
		setNewProduct(({...newProduct, name:capitalize(searchProduct)}));
		setIsAddingProduct(true);
		setIsSearchSelected(false);
	}

	const handleClickStartAddCancel = () => {
		setIsAddingProduct(false);
		setNewProduct(emptyNewProduct);
	}

	const handleActionAddProduct = async () =>{
		const p = await postProduct(newProduct.name, newProduct.reference, newProduct.product_type_id);
		if(p){
			// The POST answer may not carry the type name, so take it from
			// the loaded list.
			const typeName = productTypes.find(pt => String(pt.id) === String(p.product_type_id ?? newProduct.product_type_id))?.name;
			handleClickSelect({ ...p, product_type_name: p.product_type_name ?? typeName });
			setIsAddingProduct(false);
			setNewProduct(emptyNewProduct);
		}
	}

	// The modal closes on Esc, like the delete-orçamento one.
	useEffect(() => {
		if(!isAddingProduct) return;
		const onKey = (e) => { if(e.key === "Escape") handleClickStartAddCancel(); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isAddingProduct]);

	const typeSelect = (
		<select
			value={newProduct.product_type_id}
			onChange={(e)=>(setNewProduct(prev => ({...prev, product_type_id: e.target.value})))}>
			<option value="" disabled>
				Tipo de produto
			</option>
			{productTypes.map(pt =>(
				<option key={pt.id} value={pt.id}>{pt.name}</option>
			))}
		</select>
	);

	return(
		<div className="quote-product-picker">
			<div ref={refSearch} className={`search-bar search-products ${disabled ? "is-disabled" : ""}`}>
				<span><i className={`fa-solid ${icon}`}/></span>
				<input
					type="text"
					onFocus={()=>{ if(!disabled) setIsSearchSelected(true); }}
					disabled={disabled}
					placeholder={disabled ? "Orçamentado — desmarque para adicionar produtos" : placeholder}
					value={searchProduct}
					onChange={(e)=>{setSearchProduct(e.target.value)}}
				/>
				{isSearchSelected && !disabled && (<ul className="dropdown">
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
				<div className="quote-modal-backdrop" onClick={()=>handleClickStartAddCancel()}>
					<div className="quote-modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
						<div className="quote-modal-header">
							<i className="fa-solid fa-box"/>
							<h2>Novo produto</h2>
						</div>
						<div className="quote-add-modal-fields">
							<label>Nome</label>
							<input type="text" autoFocus placeholder="Nome do produto" value={newProduct.name} onChange={(e)=>setNewProduct(prev=>({...prev, name:e.target.value}))}/>
							<label>Referência</label>
							<input className="uppercase" type="text" placeholder="S/Referência" value={newProduct.reference} onChange={(e)=>setNewProduct(prev=>({...prev, reference:e.target.value}))}/>
							<label>Tipo</label>
							{typeSelect}
									</div>
						<div className="quote-modal-buttons">
							<button type="button" onClick={()=>handleClickStartAddCancel()}>Cancelar</button>
							<button type="button" className="primary" onClick={()=>handleActionAddProduct()}>
								<i className="fa-solid fa-plus"/> Adicionar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
