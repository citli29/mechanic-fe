import { useEffect, useState } from "react";
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
	return(
		<>
			<button onClick={(e)=>setIsAddingProduct(!isAddingProduct)}>P</button>
			<button onClick={(e)=>setIsAddingAP(!isAddingAP)}>AP</button>

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
						<td>
							<input type="text" value={ap?.product_name??""} onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, product_name: e.target.value }
											: product
									)
								) 
							}/>
						</td>
						<td>
							<input type="text" placeholder="S/Referencia" value={ap?.reference??""} onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, reference: e.target.value }
											: product
									)
								) 
							}/>
						</td>
						<td> 
							<select name="productType" id="productType" onChange={(e)=>
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
							</select>
						</td>
						<td>
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
						<td>
							<input type="checkbox" checked={Boolean(ap?.is_applied)} onChange={(e)=>
								setAppliedProducts(prev =>
									prev.map((product, i) =>
										i === index
											? { ...product, is_applied: Boolean(e.target.value)?"1":"0"}
											: product
									)
								)
							}/>
						</td>
						<td>
							<button>X</button>
						</td>
					</tr>

				))}
				{!isAddingAP && 
				<tr className="button-row">
					<td colSpan={6}>
						<button onClick={(e)=>setIsAddingAP(true)}>+</button>
					</td>
				</tr>}
				{isAddingAP && 
				<tr className="add-ap">
						{isAddingProduct && (
						<>
							<td>
								<input type="text" value={newProduct?.product_name??""} onChange={(e)=>(setNewProduct(prev=>({...prev, name:e.target.value}))) }/>
							</td>
							<td>
								<input type="text" placeholder="S/Referencia" value={newProduct?.reference??""} onChange={(e)=>(setNewProduct(prev=>({...prev, reference:e.target.value})))}/>
							</td>
							<td> 
								<select name="productType" id="productType" value={newProduct?.product_type_id} onChange={(e)=>(setNewProduct(prev=>({...prev, product_type_id:e.target.value})))}>
									{productTypes.map(pt =>(
										<option value={pt.id}>{pt.name}</option>
									))}
								</select>
							</td>
						</>
						)}
						{!isAddingProduct && ( 
						<>
							<td>
								<input type="text" value={newAP?.product_name??""}/>
							</td>
							<td>
								<input type="text" placeholder="S/Referencia" value={newProduct?.reference??""}/>
							</td>
							<td> 
								<select name="productType" id="productType" value={newProduct?.product_type_id}>
									{productTypes.map(pt =>(
										<option value={pt.id}>{pt.name}</option>
									))}
								</select>
							</td>
						</>
					)}
					<td>
						<input type="number" value={newAP?.quantity} onChange={(e)=>(setNewProduct(prev=>({...prev, product_type_id:e.target.value})))}/>
					</td>
					<td>
						<input type="checkbox" checked={Boolean(newAP?.is_applied)} onChange={(e)=>(setNewProduct(prev=>({...prev, product_type_id:e.target.value})))}/>
					</td>
					<td>
						<button onClick={(e)=>setIsAddingAP(false)}>X</button>
					</td>
					<td>

					</td>
				</tr>}
				<div className="searchProducts">
					{/*ir buscar os m-pickers*/}
					{/*aparecer as opcoes para adicionar os produtos*/}
			{/*criar a entry the appliedProducts*/}
			</div>
			</table>
		</>
	);

}
