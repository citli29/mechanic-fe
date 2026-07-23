import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function UserTimesTable({
	serviceId,
	showMessage,
	handleApiError
}) {

	const emptyUserTime = {
		user_id: "",
		minutes: "",
		date: ""
	};

	const emptyUserTimePunch = {
		user_id: "",
		date: ""
	};

	const [userTimes, setUserTimes] = useState([]);
	const [userTimePunches, setUserTimePunches] = useState([]);
	const [users, setUsers] = useState([]);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [editingPunch, setEditingPunch] = useState(null);
	const [creatingPunch, setCreatingPunch] = useState(false);

	const [newUserTime, setNewUserTime] = useState(
		emptyUserTime
	);

	const [newUserTimePunch, setNewUserTimePunch] = useState(
		emptyUserTimePunch
	);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const [punchesLoading, setPunchesLoading] = useState(false);
	const [punchSaving, setPunchSaving] = useState(false);
	const [punchAction, setPunchAction] = useState(null);

	useEffect(() => {

		loadData();

	}, [serviceId]);

	async function loadData() {

		setLoading(true);
		setPunchesLoading(true);

		try {

			await Promise.all([
				loadUserTimes(),
				loadUserTimePunches(),
				loadUsers()
			]);

		}
		finally {

			setLoading(false);
			setPunchesLoading(false);

		}

	}

	async function loadUserTimes() {

		try {

			const res = await api.get(
				`/services/${serviceId}/user_times`
			);

			setUserTimes(
				res.data.sut_list || []
			);

		}
		catch (err) {

			setUserTimes([]);
			handleError(err);

		}

	}

	async function loadUserTimePunches() {

		try {

			const res = await api.get(
				`/services/${serviceId}/user_time_punches`
			);

			setUserTimePunches(
				res.data.sutp_list || []
			);

		}
		catch (err) {

			setUserTimePunches([]);
			handleError(err);

		}

	}

	async function loadUsers() {

		try {

			const res = await api.get("/users");

			setUsers(
				res.data.user_list ||
				res.data.users ||
				(Array.isArray(res.data)
					? res.data
					: [])
			);

		}
		catch (err) {

			setUsers([]);
			handleError(err);

		}

	}

	function handleError(err) {

		if (handleApiError) {

			handleApiError(err);

		}
		else {

			console.error(err);

		}

	}

	function updateNewUserTime(e) {

		const { name, value } = e.target;

		setNewUserTime(prev => ({
			...prev,
			[name]: value
		}));

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing(prev => ({
			...prev,
			[name]: value
		}));

	}

	function updateNewUserTimePunch(e) {

		const { name, value } = e.target;

		setNewUserTimePunch(prev => ({
			...prev,
			[name]: value
		}));

	}

	function updatePunchEdit(e) {

		const { name, value } = e.target;

		setEditingPunch(prev => ({
			...prev,
			[name]: value
		}));

	}

	function beginCreating() {

		setEditing(null);
		setCreating(true);

		setNewUserTime({
			user_id: "",
			minutes: "",
			date: new Date()
				.toISOString()
				.split("T")[0]
		});

	}

	function cancelCreating() {

		setCreating(false);
		setNewUserTime(emptyUserTime);

	}

	function beginEditing(userTime) {

		setCreating(false);

		setEditing({
			sut_id: userTime.sut_id,
			user_id: userTime.user_id || "",
			minutes: userTime.minutes ?? "",
			date: formatDateInput(userTime.date)
		});

	}

	function cancelEditing() {

		setEditing(null);

	}

	function beginCreatingPunch() {

		setEditingPunch(null);
		setCreatingPunch(true);

		setNewUserTimePunch({
			user_id: "",
			date: new Date()
				.toISOString()
				.split("T")[0]
		});

	}

	function cancelCreatingPunch() {

		setCreatingPunch(false);
		setNewUserTimePunch(emptyUserTimePunch);

	}

	function beginEditingPunch(userTimePunch) {

		setCreatingPunch(false);

		setEditingPunch({
			sutp_id: userTimePunch.sutp_id,
			user_id: userTimePunch.user_id || "",
			date: formatDateInput(userTimePunch.date)
		});

	}

	function cancelEditingPunch() {

		setEditingPunch(null);

	}

	function validateUserTime(userTime) {

		if (!userTime.user_id) {

			showMessage?.(
				"error",
				"Please select a user."
			);

			return false;

		}

		if (
			userTime.minutes === "" ||
			Number(userTime.minutes) <= 0
		) {

			showMessage?.(
				"error",
				"Minutes must be greater than 0."
			);

			return false;

		}

		if (!userTime.date) {

			showMessage?.(
				"error",
				"Date is required."
			);

			return false;

		}

		return true;

	}

	function validateUserTimePunch(userTimePunch) {

		if (!userTimePunch.user_id) {

			showMessage?.(
				"error",
				"Please select a user."
			);

			return false;

		}

		if (!userTimePunch.date) {

			showMessage?.(
				"error",
				"Date is required."
			);

			return false;

		}

		return true;

	}

	async function createUserTime() {

		if (!validateUserTime(newUserTime)) {
			return;
		}

		setSaving(true);

		try {

			await api.post(
				`/services/${serviceId}/user_times`,
				{
					user_id: Number(
						newUserTime.user_id
					),
					minutes: Number(
						newUserTime.minutes
					),
					date: newUserTime.date
				}
			);

			showMessage?.(
				"success",
				"User time created successfully."
			);

			setCreating(false);
			setNewUserTime(emptyUserTime);

			await loadUserTimes();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function saveUserTime() {

		if (!validateUserTime(editing)) {
			return;
		}

		setSaving(true);

		try {

			await api.put(
				`/services/${serviceId}/user_times/${editing.sut_id}`,
				{
					user_id: Number(
						editing.user_id
					),
					minutes: Number(
						editing.minutes
					),
					date: editing.date
				}
			);

			showMessage?.(
				"success",
				"User time updated successfully."
			);

			setEditing(null);

			await loadUserTimes();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setSaving(false);

		}

	}

	async function deleteUserTime(userTime) {

		const confirmed = window.confirm(
			`Delete the time entry for "${userTime.user_name}"?`
		);

		if (!confirmed) {
			return;
		}

		try {

			await api.delete(
				`/services/${serviceId}/user_times/${userTime.sut_id}`
			);

			showMessage?.(
				"success",
				"User time deleted successfully."
			);

			if (
				editing?.sut_id ===
				userTime.sut_id
			) {

				setEditing(null);

			}

			await loadUserTimes();

		}
		catch (err) {

			handleError(err);

		}

	}

	async function createUserTimePunch() {

		if (!validateUserTimePunch(newUserTimePunch)) {
			return;
		}

		setPunchSaving(true);

		try {

			await api.post(
				`/services/${serviceId}/user_time_punches`,
				{
					user_id: Number(
						newUserTimePunch.user_id
					),
					date: newUserTimePunch.date
				}
			);

			showMessage?.(
				"success",
				"Registo de ponto criado com sucesso."
			);

			setCreatingPunch(false);
			setNewUserTimePunch(emptyUserTimePunch);

			await loadUserTimePunches();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setPunchSaving(false);

		}

	}

	async function saveUserTimePunch() {

		if (!validateUserTimePunch(editingPunch)) {
			return;
		}

		setPunchSaving(true);

		try {

			await api.put(
				`/services/${serviceId}/user_time_punches/${editingPunch.sutp_id}`,
				{
					user_id: Number(
						editingPunch.user_id
					),
					date: editingPunch.date
				}
			);

			showMessage?.(
				"success",
				"Registo de ponto atualizado com sucesso."
			);

			setEditingPunch(null);

			await loadUserTimePunches();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setPunchSaving(false);

		}

	}

	async function deleteUserTimePunch(userTimePunch) {

		const confirmed = window.confirm(
			`Apagar o registo de ponto de "${userTimePunch.user_name}"?`
		);

		if (!confirmed) {
			return;
		}

		setPunchAction({
			id: userTimePunch.sutp_id,
			type: "delete"
		});

		try {

			await api.delete(
				`/services/${serviceId}/user_time_punches/${userTimePunch.sutp_id}`
			);

			showMessage?.(
				"success",
				"Registo de ponto apagado com sucesso."
			);

			if (
				editingPunch?.sutp_id ===
				userTimePunch.sutp_id
			) {

				setEditingPunch(null);

			}

			await loadUserTimePunches();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setPunchAction(null);

		}

	}

	async function startUserTimePunch(userTimePunch) {

		setPunchAction({
			id: userTimePunch.sutp_id,
			type: "start"
		});

		try {

			await api.post(
				`/services/${serviceId}/user_time_punches/${userTimePunch.sutp_id}/start`
			);

			showMessage?.(
				"success",
				"Ponto iniciado com sucesso."
			);

			await loadUserTimePunches();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setPunchAction(null);

		}

	}

	async function stopUserTimePunch(userTimePunch) {

		setPunchAction({
			id: userTimePunch.sutp_id,
			type: "stop"
		});

		try {

			await api.post(
				`/services/${serviceId}/user_time_punches/${userTimePunch.sutp_id}/stop`
			);

			showMessage?.(
				"success",
				"Ponto terminado com sucesso."
			);

			await loadUserTimePunches();

		}
		catch (err) {

			handleError(err);

		}
		finally {

			setPunchAction(null);

		}

	}

	function formatDateInput(value) {

		if (!value) {
			return "";
		}

		return String(value)
			.split("T")[0]
			.split(" ")[0];

	}

	function formatDateDisplay(value) {

		const date = formatDateInput(value);

		if (!date) {
			return "-";
		}

		const [year, month, day] =
			date.split("-");

		if (!year || !month || !day) {
			return date;
		}

		return `${day}/${month}/${year}`;

	}

	function formatPunchTime(hours, minutes) {

		if (
			hours === null ||
			hours === undefined ||
			minutes === null ||
			minutes === undefined
		) {
			return "-";
		}

		return `${String(hours).padStart(
			2,
			"0"
		)}:${String(minutes).padStart(
			2,
			"0"
		)}`;

	}

	function getUserName(user) {

		return (
			user.name ||
			user.username ||
			user.email ||
			`User ${user.id}`
		);

	}

	return (

		<div>

			<div className="table-title">

				<h2>Tempos de Serviço</h2>

				{!creating && (

					<button
						type="button"
						onClick={beginCreating}
					>
						Adicionar Tempo de Serviço
					</button>

				)}

			</div>

			<div className="table-wrapper">

				<table className="table">

					<thead>

						<tr>

							<th>Funcinario</th>
							<th>Minutos</th>
							<th>Data</th>
							<th></th>

						</tr>

					</thead>

					<tbody>

						{loading && (

							<tr>

								<td colSpan={4}>
									A Carregar...
								</td>

							</tr>

						)}

						{!loading &&
							userTimes.length === 0 &&
							!creating && (

								<tr>

									<td colSpan={4}>
										Sem Tempos de Serviço.
									</td>

								</tr>

							)}

						{!loading &&
							userTimes.map(userTime => {

								const isCurrentEditing =
									editing?.sut_id ===
									userTime.sut_id;

								if (isCurrentEditing) {

									return (

										<tr
											key={userTime.sut_id}
											className="editing"
										>

											<td>

												<select
													name="user_id"
													value={editing.user_id}
													onChange={updateEdit}
												>

													<option value="">
														Selecionar Funcionario
													</option>

													{users.map(user => (

														<option
															key={user.id}
															value={user.id}
														>
															{getUserName(user)}
														</option>

													))}

												</select>

											</td>

											<td>

												<input
													type="number"
													name="minutes"
													min="1"
													value={editing.minutes}
													onChange={updateEdit}
												/>

											</td>

											<td>

												<input
													type="date"
													name="date"
													value={editing.date}
													onChange={updateEdit}
												/>

											</td>

											<td>

												<div className="container-buttons">

													<button
														type="button"
														onClick={saveUserTime}
														disabled={saving}
													>
														{saving
															? "A Guardar..."
															: "Guardar"}
													</button>

													<button
														type="button"
														onClick={cancelEditing}
														disabled={saving}
													>
														X
													</button>

												</div>

											</td>

										</tr>

									);

								}

								return (

									<tr key={userTime.sut_id}>

										<td>
											{userTime.user_name || "-"}
										</td>

										<td>
											{userTime.minutes}
										</td>

										<td>
											{formatDateDisplay(
												userTime.date
											)}
										</td>

										<td>

											<div className="container-buttons">

												<button
													type="button"
													onClick={() =>
														beginEditing(
															userTime
														)
													}
												>
													Editar
												</button>

												<button
													type="button"
													className="delete-btn"
													onClick={() =>
														deleteUserTime(
															userTime
														)
													}
												>
													Apagar
												</button>

											</div>

										</td>

									</tr>

								);

							})}

						{creating && (

							<tr className="editing">

								<td>

									<select
										name="user_id"
										value={newUserTime.user_id}
										onChange={updateNewUserTime}
									>

										<option value="">
											Selecionar Funcionario
										</option>

										{users.map(user => (

											<option
												key={user.id}
												value={user.id}
											>
												{getUserName(user)}
											</option>

										))}

									</select>

								</td>

								<td>

									<input
										type="number"
										name="minutes"
										min="1"
										placeholder="Minutos"
										value={newUserTime.minutes}
										onChange={updateNewUserTime}
									/>

								</td>

								<td>

									<input
										type="date"
										name="date"
										value={newUserTime.date}
										onChange={updateNewUserTime}
									/>

								</td>

								<td>

									<div className="container-buttons">

										<button
											type="button"
											onClick={createUserTime}
											disabled={saving}
										>
											{saving
												? "A Adicionar..."
												: "Adicionar"}
										</button>

										<button
											type="button"
											onClick={cancelCreating}
											disabled={saving}
										>
											X
										</button>

									</div>

								</td>

							</tr>

						)}

					</tbody>

				</table>

			</div>

			<div className="table-title">

				<h2>Registos de Ponto</h2>

				{!creatingPunch && (

					<button
						type="button"
						onClick={beginCreatingPunch}
					>
						Adicionar Registo de Ponto
					</button>

				)}

			</div>

			<div className="table-wrapper">

				<table className="table">

					<thead>

						<tr>

							<th>Funcionario</th>
							<th>Início</th>
							<th>Fim</th>
							<th>Minutos</th>
							<th>Data</th>
							<th></th>

						</tr>

					</thead>

					<tbody>

						{punchesLoading && (

							<tr>

								<td colSpan={6}>
									A Carregar...
								</td>

							</tr>

						)}

						{!punchesLoading &&
							userTimePunches.length === 0 &&
							!creatingPunch && (

								<tr>

									<td colSpan={6}>
										Sem Registos de Ponto.
									</td>

								</tr>

							)}

						{!punchesLoading &&
							userTimePunches.map(userTimePunch => {

								const isCurrentEditing =
									editingPunch?.sutp_id ===
									userTimePunch.sutp_id;

								const isStarting =
									punchAction?.id ===
										userTimePunch.sutp_id &&
									punchAction?.type === "start";

								const isStopping =
									punchAction?.id ===
										userTimePunch.sutp_id &&
									punchAction?.type === "stop";

								const isDeleting =
									punchAction?.id ===
										userTimePunch.sutp_id &&
									punchAction?.type === "delete";

								const isActionRunning =
									punchAction?.id ===
									userTimePunch.sutp_id;

								const hasStarted =
									userTimePunch.hours_s !== null &&
									userTimePunch.hours_s !== undefined &&
									userTimePunch.minutes_s !== null &&
									userTimePunch.minutes_s !== undefined;

								const hasFinished =
									userTimePunch.hours_f !== null &&
									userTimePunch.hours_f !== undefined &&
									userTimePunch.minutes_f !== null &&
									userTimePunch.minutes_f !== undefined;

								if (isCurrentEditing) {

									return (

										<tr
											key={userTimePunch.sutp_id}
											className="editing"
										>

											<td>

												<select
													name="user_id"
													value={editingPunch.user_id}
													onChange={updatePunchEdit}
												>

													<option value="">
														Selecionar Funcionario
													</option>

													{users.map(user => (

														<option
															key={user.id}
															value={user.id}
														>
															{getUserName(user)}
														</option>

													))}

												</select>

											</td>

											<td>

												{hasStarted
													? formatPunchTime(
														userTimePunch.hours_s,
														userTimePunch.minutes_s
													)
													: "-"}

											</td>

											<td>

												{hasFinished
													? formatPunchTime(
														userTimePunch.hours_f,
														userTimePunch.minutes_f
													)
													: "-"}

											</td>

											<td>
												{userTimePunch.minutes ?? "-"}
											</td>

											<td>

												<input
													type="date"
													name="date"
													value={editingPunch.date}
													onChange={updatePunchEdit}
												/>

											</td>

											<td>

												<div className="container-buttons">

													<button
														type="button"
														onClick={saveUserTimePunch}
														disabled={punchSaving}
													>
														{punchSaving
															? "A Guardar..."
															: "Guardar"}
													</button>

													<button
														type="button"
														onClick={cancelEditingPunch}
														disabled={punchSaving}
													>
														X
													</button>

												</div>

											</td>

										</tr>

									);

								}

								return (

									<tr key={userTimePunch.sutp_id}>

										<td>
											{userTimePunch.user_name || "-"}
										</td>

										<td>

											{hasStarted ? (

												formatPunchTime(
													userTimePunch.hours_s,
													userTimePunch.minutes_s
												)

											) : (

												<button
													type="button"
													onClick={() =>
														startUserTimePunch(
															userTimePunch
														)
													}
													disabled={isActionRunning}
												>
													{isStarting
														? "A Iniciar..."
														: "Iniciar"}
												</button>

											)}

										</td>

										<td>

											{hasFinished ? (

												formatPunchTime(
													userTimePunch.hours_f,
													userTimePunch.minutes_f
												)

											) : (

												<button
													type="button"
													onClick={() =>
														stopUserTimePunch(
															userTimePunch
														)
													}
													disabled={
														!hasStarted ||
														isActionRunning
													}
												>
													{isStopping
														? "A Terminar..."
														: "Terminar"}
												</button>

											)}

										</td>

										<td>
											{userTimePunch.minutes ?? "-"}
										</td>

										<td>
											{formatDateDisplay(
												userTimePunch.date
											)}
										</td>

										<td>

											<div className="container-buttons">

												<button
													type="button"
													onClick={() =>
														beginEditingPunch(
															userTimePunch
														)
													}
													disabled={isActionRunning}
												>
													Editar
												</button>

												<button
													type="button"
													className="delete-btn"
													onClick={() =>
														deleteUserTimePunch(
															userTimePunch
														)
													}
													disabled={isActionRunning}
												>
													{isDeleting
														? "A Apagar..."
														: "Apagar"}
												</button>

											</div>

										</td>

									</tr>

								);

							})}

						{creatingPunch && (

							<tr className="editing">

								<td>

									<select
										name="user_id"
										value={newUserTimePunch.user_id}
										onChange={updateNewUserTimePunch}
									>

										<option value="">
											Selecionar Funcionario
										</option>

										{users.map(user => (

											<option
												key={user.id}
												value={user.id}
											>
												{getUserName(user)}
											</option>

										))}

									</select>

								</td>

								<td>-</td>

								<td>-</td>

								<td>-</td>

								<td>

									<input
										type="date"
										name="date"
										value={newUserTimePunch.date}
										onChange={updateNewUserTimePunch}
									/>

								</td>

								<td>

									<div className="container-buttons">

										<button
											type="button"
											onClick={createUserTimePunch}
											disabled={punchSaving}
										>
											{punchSaving
												? "A Adicionar..."
												: "Adicionar"}
										</button>

										<button
											type="button"
											onClick={cancelCreatingPunch}
											disabled={punchSaving}
										>
											X
										</button>

									</div>

								</td>

							</tr>

						)}

					</tbody>

				</table>

			</div>

		</div>

	);

}
