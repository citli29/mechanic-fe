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
		date: "",
	};

	const [userTimes, setUserTimes] = useState([]);
	const [users, setUsers] = useState([]);

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const [newUserTime, setNewUserTime] = useState(
		emptyUserTime
	);

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {

		loadData();

	}, [serviceId]);

	async function loadData() {

		setLoading(true);

		try {

			await Promise.all([
				loadUserTimes(),
				loadUsers(),
			]);

		}
		finally {

			setLoading(false);

		}

	}

	async function loadUserTimes() {

		try {

			const res = await api.get(
				`/services/${serviceId}/user_times`
			);

			setUserTimes(
				res.data.user_time_list ||
				res.data.user_times ||
				res.data.service_user_time_list ||
				res.data.items ||
				(Array.isArray(res.data)
					? res.data
					: [])
			);

		}
		catch (err) {

			setUserTimes([]);
			handleError(err);

		}

	}

	async function loadUsers() {

		try {

			const res = await api.get("/users");

			setUsers(
				res.data.user_list ||
				res.data.users ||
				res.data.items ||
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

	function getUserTimeId(userTime) {

		return (
			userTime.service_user_time_id ||
			userTime.user_time_id ||
			userTime.sut_id ||
			userTime.id
		);

	}

	function getUser(userId) {

		return users.find(
			user =>
				Number(user.id) ===
				Number(userId)
		);

	}

	function getUserName(userTime) {

		const user = getUser(
			userTime.user_id
		);

		return (
			userTime.user_name ||
			userTime.name ||
			user?.name ||
			user?.username ||
			user?.email ||
			"-"
		);

	}

	function formatDateInput(value) {

		if (!value) {
			return "";
		}

		const stringValue = String(value);

		if (stringValue.includes("T")) {

			return stringValue.split("T")[0];

		}

		if (stringValue.includes(" ")) {

			return stringValue.split(" ")[0];

		}

		return stringValue.slice(0, 10);

	}

	function formatDateDisplay(value) {

		const formattedDate =
			formatDateInput(value);

		if (!formattedDate) {
			return "-";
		}

		const [year, month, day] =
			formattedDate.split("-");

		if (!year || !month || !day) {
			return formattedDate;
		}

		return `${day}/${month}/${year}`;

	}

	function updateNewUserTime(e) {

		const { name, value } = e.target;

		setNewUserTime({
			...newUserTime,
			[name]: value,
		});

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});

	}

	function beginCreating() {

		setEditing(null);
		setCreating(true);

		setNewUserTime({
			...emptyUserTime,
			date: formatDateInput(
				new Date().toISOString()
			),
		});

	}

	function cancelCreating() {

		setCreating(false);
		setNewUserTime(emptyUserTime);

	}

	function editUserTime(userTime) {

		setCreating(false);

		setEditing({
			...userTime,

			id:
				getUserTimeId(userTime),

			user_id:
				userTime.user_id || "",

			minutes:
				userTime.minutes ?? "",

			date:
				formatDateInput(
					userTime.date
				),
		});

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

	async function createUserTime() {

		if (!validateUserTime(newUserTime)) {
			return;
		}

		setSaving(true);

		try {

			await api.post(
				`/services/${serviceId}/user_times`,
				{
					service_id:
						Number(serviceId),

					user_id:
						Number(
							newUserTime.user_id
						),

					minutes:
						Number(
							newUserTime.minutes
						),

					date:
						newUserTime.date,
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
				`/services/${serviceId}/user_times/${editing.id}`,
				{
					service_id:
						Number(serviceId),

					user_id:
						Number(editing.user_id),

					minutes:
						Number(editing.minutes),

					date:
						editing.date,
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

	async function deleteUserTime(
		id,
		userName
	) {

		const confirmed = window.confirm(
			`Delete the time entry for "${userName}"?`
		);

		if (!confirmed) {
			return;
		}

		try {

			await api.delete(
				`/services/${serviceId}/user_times/${id}`
			);

			showMessage?.(
				"success",
				"User time deleted successfully."
			);

			if (editing?.id === id) {

				setEditing(null);

			}

			await loadUserTimes();

		}
		catch (err) {

			handleError(err);

		}

	}

	return (

		<div>

			<div className="table-title">

				<h2>User Times</h2>

				{!creating && (

					<button
						type="button"
						onClick={beginCreating}
					>
						Add User Time
					</button>

				)}

			</div>

			<table className="table">

				<thead>

					<tr>

						<th>User</th>
						<th>Minutes</th>
						<th>Date</th>
						<th></th>

					</tr>

				</thead>

				<tbody>

					{loading && (

						<tr>

							<td colSpan={4}>
								Loading...
							</td>

						</tr>

					)}

					{!loading &&
						userTimes.length === 0 &&
						!creating && (

							<tr>

								<td colSpan={4}>
									No user times found.
								</td>

							</tr>

						)}

					{!loading &&
						userTimes.map(userTime => {

							const userTimeId =
								getUserTimeId(
									userTime
								);

							if (
								editing?.id ===
								userTimeId
							) {

								return (

									<tr
										key={userTimeId}
										className="editing"
									>

										<td>

											<select
												name="user_id"
												value={
													editing.user_id
												}
												onChange={
													updateEdit
												}
											>

												<option value="">
													Select User
												</option>

												{users.map(user => (

													<option
														key={user.id}
														value={user.id}
													>
														{user.name ||
															user.username ||
															user.email}
													</option>

												))}

											</select>

										</td>

										<td>

											<input
												type="number"
												name="minutes"
												min="1"
												value={
													editing.minutes
												}
												onChange={
													updateEdit
												}
											/>

										</td>

										<td>

											<input
												type="date"
												name="date"
												value={
													editing.date
												}
												onChange={
													updateEdit
												}
											/>

										</td>

										<td>

											<div className="container-buttons">

												<button
													type="button"
													onClick={
														saveUserTime
													}
													disabled={saving}
												>
													{saving
														? "Saving..."
														: "Save"}
												</button>

												<button
													type="button"
													onClick={() =>
														setEditing(null)
													}
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

								<tr key={userTimeId}>

									<td>
										{getUserName(
											userTime
										)}
									</td>

									<td>
										{userTime.minutes ?? "-"}
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
													editUserTime(
														userTime
													)
												}
											>
												Edit
											</button>

											<button
												type="button"
												className="delete-btn"
												onClick={() =>
													deleteUserTime(
														userTimeId,
														getUserName(
															userTime
														)
													)
												}
											>
												Delete
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
									value={
										newUserTime.user_id
									}
									onChange={
										updateNewUserTime
									}
								>

									<option value="">
										Select User
									</option>

									{users.map(user => (

										<option
											key={user.id}
											value={user.id}
										>
											{user.name ||
												user.username ||
												user.email}
										</option>

									))}

								</select>

							</td>

							<td>

								<input
									type="number"
									name="minutes"
									min="1"
									placeholder="Minutes"
									value={
										newUserTime.minutes
									}
									onChange={
										updateNewUserTime
									}
								/>

							</td>

							<td>

								<input
									type="date"
									name="date"
									value={
										newUserTime.date
									}
									onChange={
										updateNewUserTime
									}
								/>

							</td>

							<td>

								<div className="container-buttons">

									<button
										type="button"
										onClick={
											createUserTime
										}
										disabled={saving}
									>
										{saving
											? "Adding..."
											: "Add"}
									</button>

									<button
										type="button"
										onClick={
											cancelCreating
										}
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

	);

}
