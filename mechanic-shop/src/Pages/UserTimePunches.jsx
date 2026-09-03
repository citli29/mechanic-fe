import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const UserTimePunches = ({
	id,
	copy_uts
}) =>{

	const formatDate = (date) => {
		if (!date) return "";

		const d = new Date(date);

		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");

		return `${year}-${month}-${day}`;
	};

	const emptyUTP = {
		user_id:"",
		date: formatDate(new Date),
	}

	const [users,setUsers] = useState([]);
	const [userTimePunches,setUserTimePunches] = useState([]);
	const [newUserTimePunch, setNewUserTimePunch] = useState(emptyUTP);
	const [isEditing, setIsEditing] = useState(null);
	const [isAddingUTP, setIsAddingUTP] = useState(false);

	useEffect(()=>{ copy_uts(userTimePunches); },[userTimePunches]);

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
		setNewUserTimePunch(emptyUTP);
		setIsAddingUTP(true);
	}

	const handleClickStartAddUTPCancel = () => {
		setIsAddingUTP(false);
	}

	const handleActionAddUTP = async () =>{
		const utp = await postUserTimePunches(newUserTimePunch.user_id, newUserTimePunch.date);
		if(utp){
			setIsAddingUTP(false);
			await handleActionStartTime(utp.sutp_id);
			loadUserTimePunches();
		}
	}

	const handleActionDeleteUTP = async (id) => {
		const utp = await deleteUserTimePunches(id);
		if(utp)
			loadUserTimePunches();
	}


	const handleClickStartEditing = async (sut_id) => {
		setIsEditing(sut_id);
		await loadUserTimePunches();
	}

	const handleClickStartEditingCancel = async () => {
		setIsEditing(null);
		await loadUserTimePunches();
	}

	const handleActionEditUTP = async (ut) =>{
		const u = await putUserTimePunches(ut.sutp_id, ut.user_id, ut.date);
		if(u){
			setIsEditing(null);
			await loadUserTimePunches();
		}
	}

	const handleActionStartTime = async (sutp_id) =>{
		try{
			const response = await api.post(`/services/${id}/user_time_punches/${sutp_id}/start`)

			console.log(response.data);
			if(typeof response.data.sutp === "undefined"){
				return null;
			}
			if(response.data.sutp){
				await loadUserTimePunches();
			}
		}catch(error){console.error(error, error.response.data.error)}
	}
	const handleActionStopTime = async (sutp_id) =>{
		try{
			const response = await api.post(`/services/${id}/user_time_punches/${sutp_id}/stop`)

			console.log(response.data);
			if(typeof response.data.sutp === "undefined"){
				return null;
			}
			if(response.data.sutp){
				await loadUserTimePunches();
			}
		}catch(error){console.error(error, error.response.data.error)}
	}

	const goToday = (sutp_id) => {
		setUserTimePunches(prev => prev.map((_ut) => sutp_id === _ut.sutp_id? 
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
						<tr key={utp.sutp_id}>
							<td className="utp-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									disabled={isEditing!==utp.sutp_id}
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
										<option key={user.id} value={user.id}>{user.name}</option>
									))}
								</select>
							</td>
							<td className={`utp-date ${isEditing===utp.sutp_id?"is-editing":""}`}> 
								<input 
									type="date"
									value={utp?.date??""} 
									disabled={isEditing!==utp.sutp_id}
									onChange={async (e) => {
										const date = formatDate(e.target.value);
										setUserTimePunches(prev => prev.map((_utp) => utp.sut_id === _utp.sut_id? 
											{ ..._utp, date:date }
											: _utp
										));
									}}/>
								<button className="go-today" onClick={() => goToday(utp.sutp_id)}><i className="fa-solid fa-circle-h"/></button>
							</td>
							{(utp.hours_s!==null && utp.minutes_s!==null)?(
								<td className="utp-time-start just-text"><span>{`${("0" + utp.hours_s).slice(-2)}:${("0" + utp.minutes_s).slice(-2)}`}</span></td>
							):(
								<td className="utp-time-start">
										<button
											onClick={(e)=>handleActionStartTime(utp.sutp_id)}
										><i className="fa-solid fa-hourglass-start"/></button></td>
							)}
							{(utp.hours_f!==null && utp.minutes_f!==null)?(
								<td className="utp-time-end just-text"><span>{`${("0" + utp.hours_f).slice(-2)}:${("0" + utp.minutes_f).slice(-2)}`}</span></td>
							):(
								<td className="utp-time-end">
										<button 
											disabled={utp.hours_s===null && utp.minutes_s===null}
											onClick={(e)=>handleActionStopTime(utp.sutp_id)}
									><i className="fa-solid fa-hourglass-end"/></button></td>
							)}
							<td className="utp-minutes just-text"><span>{utp?.minutes!==null ?utp?.minutes + "m" :"-"}</span></td>
							{isEditing!==utp.sutp_id &&(
								<>
									<td className="utp-edit">
										<button className="options" onClick={()=>handleClickStartEditing(utp.sutp_id)}><i className="fa-solid fa-pencil"/></button>
									</td>
									<td className="utp-cancel">
										<button className="cancel" onClick={(e)=>handleActionDeleteUTP(utp.sutp_id)}><i className="fa-solid fa-trash"/></button>
									</td>
								</>
							)}
							{isEditing===utp.sutp_id &&(
								<>
									<td className="utp-edit-confirm">
										<button className="confirm" onClick={()=>handleActionEditUTP(utp)}><i className="fa-solid fa-check"/></button>
									</td>
									<td className="utp-cancel">
										<button className="cancel" onClick={()=>handleClickStartEditingCancel()}><i className="fa-solid fa-x"/></button>
									</td>
								</>
							)}
						</tr>
					))}
					{!isAddingUTP &&(
						<tr className="add-row">
							<td><button onClick={(e) => handleClickStartAddUTP()}><i className="fa-solid fa-plus"/></button></td>	
						</tr>
					)}
					{isAddingUTP &&(
						<tr className="add-camps-row">
							<td className="utp-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									value={newUserTimePunch?.user_id}
									onChange={
										(e) => {
											const u = e.target.value;
											setNewUserTimePunch((ut) => ({ ...ut, user_id:u}));
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
							<td className="utp-date is-editing"> 
								<input 
									type="date"
									value={newUserTimePunch?.date??""} 
									onChange={(e) => {
										const date = formatDate(e.target.value);
										setNewUserTimePunch(utp => ({ ...utp, date:date }));
									}}/>
								<button className="go-today" onClick={() => {
	setNewUserTimePunch(prev => ({...prev, date: formatDate(new Date())}))
								}}><i className="fa-solid fa-circle-h"/></button>
							</td>
							<td className="utp-time-start"/>
							<td className="utp-time-end"/>
							<td className="utp-minutes"/>
							<td className="p-confirm">
								<button className="confirm" onClick={()=>handleActionAddUTP()}><i className="fa-solid fa-check"/></button>
							</td>
							<td className="p-cancel">
								<button className="cancel" onClick={()=>handleClickStartAddUTPCancel()}><i className="fa-solid fa-x"/></button>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</>
	);
}
