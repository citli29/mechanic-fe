import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const UserTimePunches = ({
	id
}) =>{

	const emptyUTP = {
		user_id:"",
		date: "" 
	}

	const [users,setUsers] = useState([]);
	const [userTimePunches,setUserTimePunches] = useState([]);
	const [newUserTimePunch, setNewUserTimePunche] = useState(emptyUTP);
	const [isEditing, setIsEditing] = useState(null);
	const [isAddingUTP, setIsAddingUTP] = useState(false);

	useEffect(()=>{console.log("Users : ", users)},[users]);
	useEffect(()=>{console.log("User Time Punches:" ,userTimePunches)},[userTimePunches]);
	useEffect(()=>{
		loadUsers();
		loadUserTimePunches();
	},[]); 

	const loadUserTimePunches = async () => {
		try{
			const response = await api.get(`/services/${id}/user_time_punches`);
			if(typeof response.data.sutp_list === "undefined") {
				setUserTimePunches([]);
			}else{
				setUserTimePunches(response.data.sutp_list);
			}
		}catch(error){
			console.error(error);
		}
	}
	
	const loadUsers = async () => {
		try{
			const response = await api.get(`/users`);
			if(typeof response.data.user_list === "undefined") {
				setUsers([]);
			}else{
				setUsers(response.data.user_list);
			}
		}catch(error){
			console.error(error);
		}
	}

	const postUserTimePunches = async (user_id,  date) =>{
		try{
			const response = await api.post(`/services/${id}/user_time_punches`,{
				 user_id: user_id ,
				 date: date ,
			})
			if(typeof response.data.sutp !== "undefined"){
				return response.data.sutp;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const deleteUserTimePunches = async (sutp_id) =>{
		try{
			const response = await api.delete(`/services/${id}/user_time_punches/${sutp_id}`);
			if(typeof response.data.sutp !== "undefined"){
				return response.data.sutp;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const putUserTimePunches = async (sutp_id, user_id,  date) =>{
		try{
			const response = await api.put(`/services/${id}/user_time_punches/${sutp_id}`,{
				 user_id: user_id ,
				 date: date ,
			})
			if(typeof response.data.sutp !== "undefined"){
				return response.data.sutp;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const handleClickStartAddUTP = () => {
		setNewUserTime(emptyUTP);
		setIsAddingUTP(true);
	}

	const handleClickStartAddUTPCancel = () => {
		setIsAddingUTP(false);
	}

	const handleActionAddUTP = async () =>{
		const utp = await postUserTimePunches(newUserTimePunch.user_id, newUserTimePunch.date);
		if(utp){
			loadUserTimePunches();
			setIsAddingUTP(false);

		}
	}

	const handleActionDeleteUTP = async (id) => {
		const utp = await deleteUserTimePunches(id);
		if(utp)
			loadUserTimePunches();
	}

	const formatDate = (date) => {
		if (!date) return "";

		const d = new Date(date);

		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");

		return `${year}-${month}-${day}`;
	};

	const handleClickStartEditing = async (sut_id) => {
		setIsEditing(sut_id);
		await loadUserTimePunches();
	}

	const handleClickStartEditingCancel = async () => {
		setIsEditing(null);
		await loadUserTimePunches();
	}

	const handleActionEditUTP = async (ut) =>{
		const u = await putUserTimePunches(ut.sut_id, ut.user_id, ut.date);
		if(u){
			setIsEditing(null);
			await loadUserTimePunches();
		}
	}

	const goToday = (sut_id) => {
		setUserTimePunches(prev => prev.map((_ut) => sut_id === _ut.sut_id? 
			{ ..._ut, date:formatDate(new Date())}
			: _ut
		));
	}


	return(
		<>
			<table className="utp">
				<thead>
					<tr>
						<th>Funcionário</th>
						<th>Data</th>
						<th>Início</th>
						<th>Fim</th>
						<th>Minutos</th>
						<th/>
						<th/>
					</tr>
				</thead>
				<tbody>
					{userTimePunches.map((utp) =>(
						<tr key={utp.sut_id}>
							<td className="ut-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									disabled={isEditing!==utp.sut_id}
									value={utp.user_id}
									onChange={
										async (e) => {
											const u = e.target.value;
											setUserTimePunches(prev => prev.map((_utp) => utp.sut_id === _utp.sut_id ? 
												{ ..._utp, user_id:u}
												: _utp
											));
										}

									}
								>
									{users?.map( user => (
										<option value={user.id}>{user.name}</option>
									))}
								</select>
							</td>
							<td className={`ut-date ${isEditing===utp.sut_id?"is-editing":""}`}> 
								<input 
									type="date"
									value={utp?.date??""} 
									disabled={isEditing!==utp.sut_id}
									onChange={async (e) => {
										const date = formatDate(e.target.value);
										setUserTimePunches(prev => prev.map((_utp) => utp.sut_id === _utp.sut_id? 
											{ ..._utp, date:date }
											: _utp
										));
									}}/>
								<button className="go-today" onClick={() => goToday(ut.sut_id)}><i className="fa-solid fa-circle-h"/></button>
							</td>
							<td><button><i className="fa-solid fa-hourglass-start"/></button></td>
							<td><button><i className="fa-solid fa-hourglass-end"/></button></td>
							<td className="just-text"><span>{utp?.minutes ??"Time till now"}</span></td>
							{isEditing!==utp.sut_id &&(
								<>
									<td className="p-edit">
										<button className="options" onClick={()=>handleClickStartEditing(ut.sut_id)}><i className="fa-solid fa-pencil"/></button>
									</td>
									<td className="p-cancel">
										<button className="cancel" onClick={()=>handleActionDeleteUT(ut.sut_id)}><i className="fa-solid fa-trash"/></button>
									</td>
								</>
							)}
							{isEditing===utp.sut_id &&(
								<>
									<td className="p-edit-confirm">
										<button className="confirm" onClick={()=>handleActionEditUT(ut)}><i className="fa-solid fa-check"/></button>
									</td>
									<td className="p-cancel">
										<button className="cancel" onClick={()=>handleClickStartEditingCancel()}><i className="fa-solid fa-x"/></button>
									</td>
								</>
							)}
						</tr>
					))}
					{!isAddingUTP &&(
						<tr className="add-row">
							<td><button onClick={(e) => handleClickStartAddUT()}><i className="fa-solid fa-plus"/></button></td>	
						</tr>
					)}
					{isAddingUTP &&(
						<tr>
							<td className="ut-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									value={newUserTime?.user_id}
									onChange={
										(e) => {
											const u = e.target.value;
											setNewUserTime((ut) => ({ ...ut, user_id:u}));
											}
										}
								>
									<option value="" disabled>
										Funcionario
									</option>
									{users?.map( user => (
										<option key={user.id} value={user.id}>{user.name}</option>
									))}
								</select>
							</td>
							<td className="ut-date is-editing"> 
								<input 
									type="date"
									value={newUserTimePunch?.date??""} 
									onChange={(e) => {
										const date = formatDate(e.target.value);
										setNewUserTimePunche(utp => ({ ...utp, date:date }));
									}}/>
								<button className="go-today"><i className="fa-solid fa-circle-h"/></button>
								<button className="go-today" onClick={() => {
	setNewUserTime(prev => ({...prev, date: formatDate(new Date())}))
								}}><i className="fa-solid fa-circle-h"/></button>
							</td>
							<td className="p-confirm">
								<button className="confirm" onClick={()=>handleActionAddUT()}><i className="fa-solid fa-check"/></button>
							</td>
							<td className="p-cancel">
								<button className="cancel" onClick={()=>handleClickStartAddUTCancel()}><i className="fa-solid fa-x"/></button>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</>
	);
}
