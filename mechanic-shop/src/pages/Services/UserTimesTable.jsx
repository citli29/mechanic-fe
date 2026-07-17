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
				loadUsers()
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
				res.data.sut_list || []
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
													Select User
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
														? "Saving..."
														: "Save"}
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
												Edit
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
									value={newUserTime.user_id}
									onChange={updateNewUserTime}
								>

									<option value="">
										Select User
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
									placeholder="Minutes"
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
											? "Adding..."
											: "Add"}
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

	);

}
