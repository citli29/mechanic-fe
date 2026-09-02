import { useEffect, useState , useRef} from "react";
import api from "./../api/axios";

export const UserTimePunches = ({
	id
}) =>{

	const emptyUT = {
		user_id:"",
		minutes: "0",
		date: "" 
	}
	const emptyUTP = {
		user_id:"",
		minutes: "0",
		date: "" 
	}

	const [users,setUsers] = useState([]);

	const [userTimes,setUserTimes] = useState([]);
	const [userTimePunches,setUserTimePunches] = useState([]);

	const [newUserTimePunch, setNewUserTimePunche] = useState(emptyUTP);
	const [newUserTime, setNewUserTime] = useState(emptyUT);

	const [isAddingUT, setIsAddingUT] = useState(false);
	const [isAddingUTP, setIsAddingUTP] = useState(false);

	useEffect(()=>{console.log("Users : ", users)},[users]);
	useEffect(()=>{console.log("User Times: ", userTimes)},[userTimes]);
	useEffect(()=>{console.log("User Time Punches:" ,userTimePunches)},[userTimePunches]);
	useEffect(()=>{
		loadUsers();
		loadUserTimes();
		loadUserTimePunches();
	},[]); 

	const loadUserTimes = async () => {
		try{
			const response = await api.get(`/services/${id}/user_times`);
			if(typeof response.data.sut_list === "undefined") {
				setUserTimes([]);
			}else{
				setUserTimes(response.data.sut_list);
			}
		}catch(error){
			console.error(error);
		}
	}

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

	const postUserTimes = async (user_id, minutes, date) =>{
		try{
			const response = await api.post(`/services/${id}/user_times`,{
				 user_id: user_id,
				 minutes: minutes,
				 date: date ,
			})
			if(typeof response.data.sut !== "undefined"){
				return response.data.sut;
			}else{
				return null;
			}
		}catch(error){console.error(error, error.response.data.error)}
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

	const deleteUserTimes = async (sut_id) =>{
		try{
			const response = await api.delete(`/services/${id}/user_times/${sut_id}`);
			if(typeof response.data.sut !== "undefined"){
				return response.data.sut;
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

	const putUserTimes = async (sut_id,user_id, minutes, date) =>{
		try{
			const response = await api.put(`/services/${id}/user_times/${sut_id}`,{
				 user_id: user_id,
				 minutes: minutes,
				 date: date ,
			})
			if(typeof response.data.sut !== "undefined"){
				return response.data.sut;
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
	const handleClickStartAddUT = () => {
		setNewUserTime(emptyUT);
		setIsAddingUT(true);
	}
	const handleClickStartAddUTP = () => {
		setNewUserTime(emptyUTP);
		setIsAddingUTP(true);
	}
	const handleClickStartAddUTCancel = () => {
		setIsAddingUT(false);
	}
	const handleClickStartAddUTPCancel = () => {
		setIsAddingUTP(false);
	}
	const handleActionAddUT = async () =>{
		const ut = await postUserTimes(newUserTime.user_id, newUserTime.minutes, newUserTime.date);
		if(ut){
			loadUserTimes();
			setIsAddingUT(false);

		}
	}
	const handleActionAddUTP = async () =>{
		const utp = await postUserTimePunches(newUserTimePunch.user_id, newUserTimePunch.date);
		if(utp)
			loadUserTimePunches();
	}
	const handleActionDeleteUT = async (id) => {
		const ut = await deleteUserTimes(id);
		if(ut)
			loadUserTimes();
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
		await loadUserTimes();
	}
	const handleClickStartEditingCancel = async () => {
		setIsEditing(null);
		await loadUserTimes();
	}
	const handleActionEditUT = async (ut) =>{
		const u = await putUserTimes(ut.sut_id, ut.user_id, ut.minutes, ut.date);
		if(u){
			setIsEditing(null);
			await loadUserTimes();
		}
	}
	const goToday = (sut_id) => {

		setUserTimes(prev => prev.map((_ut) => sut_id === _ut.sut_id? 
			{ ..._ut, date:formatDate(new Date())}
			: _ut
		));

	}

	const [isEditing, setIsEditing] = useState(null);
	const [isAdding, setIsAdding] = useState(false);

	return(
		<>
			<table>
				<thead>
					<tr>
						<th>Funcionário</th>
						<th>Tempo (min)</th>
						<th>Data</th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{userTimes.map((ut) =>(
						<tr key={ut.sut_id}>
							<td className="ut-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									disabled={isEditing!==ut.sut_id}
									value={ut.user_id}
									onChange={
										async (e) => {
											const u = e.target.value;
											setUserTimes(prev => prev.map((_ut) => ut.sut_id === _ut.sut_id ? 
												{ ..._ut, user_id:u}
												: _ut
											));
										}

									}
								>
									{users?.map( user => (
										<option value={user.id}>{user.name}</option>
									))}
								</select>
							</td>
							<td className="ut-minutes">
									<span>Tempo</span>
									<input 
										type="number" 
										value={ut?.minutes??""} 
										disabled={isEditing!==ut.sut_id}
										onChange={async (e) => {
											const mins = e.target.value.trim()!==""?Number(e.target.value):"";
											setUserTimes(prev => prev.map((_ut) => ut.sut_id === _ut.sut_id ? 
												{ ..._ut, minutes:mins }
												: _ut
											));
										}}
									/>
							</td>
							<td className={`ut-date ${isEditing===ut.sut_id?"is-editing":""}`}> 
								<input 
									type="date"
									value={ut?.date??""} 
									disabled={isEditing!==ut.sut_id}
									onChange={async (e) => {
										const date = formatDate(e.target.value);
										setUserTimes(prev => prev.map((_ut) => ut.sut_id === _ut.sut_id? 
											{ ..._ut, date:date }
											: _ut
										));
									}}/>
								<button className="go-today" onClick={() => goToday(ut.sut_id)}><i className="fa-solid fa-circle-h"/></button>
							</td>
							{isEditing!==ut.sut_id &&(
								<>
									<td className="p-edit">
										<button className="options" onClick={()=>handleClickStartEditing(ut.sut_id)}><i className="fa-solid fa-pencil"/></button>
									</td>
									<td className="p-cancel">
										<button className="cancel" onClick={()=>handleActionDeleteUT(ut.sut_id)}><i className="fa-solid fa-trash"/></button>
									</td>
								</>
							)}
							{isEditing===ut.sut_id &&(
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
					{!isAddingUT &&(
						<tr className="add-row">
							<td><button onClick={(e) => handleClickStartAddUT()}><i className="fa-solid fa-plus"/></button></td>	
						</tr>
					)}
					{isAddingUT &&(
						<tr>
							<td className="ut-name">
								<select 
									name="ut-user" 
									id="ut-user" 
									value={newUserTime?.user_id}
									onChange={
										async (e) => {
											const u = e.target.value;
											setNewUserTime((ut) => ({ ...ut, user_id:u}));
											if(u!==""){
												//await putUserTimes(ut.sut_id, u, ut.minutes, ut.date);
											}
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
							<td className="ut-minutes">
								<span>Tempo</span>
								<input 
									type="number" 
									value={newUserTime?.minutes??""} 
									onChange={async (e) => {
										const mins = e.target.value.trim()!==""?Number(e.target.value):"";
										setNewUserTime((ut) =>({ ...ut, minutes:mins }));
									}}
								/>
							</td>
							<td className="ut-date is-editing"> 
								<input 
									type="date"
									value={newUserTime?.date??""} 
									onChange={async (e) => {
										const date = formatDate(e.target.value);
										setNewUserTime(ut => ({ ...ut, date:date }));
										if(date!==""){
											//await putUserTimes(ut.sut_id, ut.user_id, ut.minutes, date);
										}
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
