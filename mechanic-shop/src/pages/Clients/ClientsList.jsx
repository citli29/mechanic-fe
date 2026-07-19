import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ClientsList() {

	const [clients, setClients] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		phone: "",
		email: "",
	});

	const [editing, setEditing] = useState(null);
	const [creating, setCreating] = useState(false);

	const emptyClient = {
		name: "",
		phone: "",
		address: "",
		email: "",
		zip_code: "",
		tax_nr: "",
	};

	const [newClient, setNewClient] = useState(emptyClient);

	const [message, setMessage] = useState({
		type: "",
		text: "",
	});

	function showMessage(type, text) {

		setMessage({
			type,
			text,
		});

		setTimeout(() => {

			setMessage({
				type: "",
				text: "",
			});

		}, 4000);

	}

	function handleApiError(err) {

		if (err.response?.data?.error) {

			showMessage(
				"error",
				err.response.data.error
			);

		}
		else {

			showMessage(
				"error",
				"Something went wrong."
			);

		}

		console.error(err);

	}

	useEffect(() => {

		loadClients();

	}, []);

	useEffect(() => {

		const timer = setTimeout(() => {

			loadClients();

		}, 400);

		return () => clearTimeout(timer);

	}, [filters]);

	async function loadClients() {

		try {

			const params = Object.fromEntries(
				Object.entries(filters)
					.filter(([_, value]) => value !== "")
			);

			const res = await api.get("/clients", {
				params,
			});

			setClients(res.data.client_list || []);

		}
		catch (err) {

			console.error(err);
			setClients([]);

		}

	}

	async function createClient() {

		if (!newClient.name.trim()) {

			showMessage(
				"error",
				"Client name is required."
			);

			return;

		}

		if (!newClient.phone.trim()) {

			showMessage(
				"error",
				"Phone is required."
			);

			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(newClient)
					.filter(([_, value]) => value !== "")
			);

			await api.post("/clients", data);

			showMessage(
				"success",
				"Client created successfully."
			);

			setCreating(false);

			setNewClient(emptyClient);

			loadClients();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	function editClient(client) {

		setEditing({
			...client,
		});

	}

	function updateEdit(e) {

		const { name, value } = e.target;

		setEditing({
			...editing,
			[name]: value,
		});

	}

	async function saveClient() {

		if (!editing.name.trim()) {

			showMessage(
				"error",
				"Client name is required."
			);

			return;

		}

		if (!editing.phone.trim()) {

			showMessage(
				"error",
				"Phone is required."
			);

			return;

		}

		try {

			const data = Object.fromEntries(
				Object.entries(editing)
					.filter(([_, value]) => value !== "")
			);

			await api.put(
				`/clients/${editing.id}`,
				data
			);

			showMessage(
				"success",
				"Client updated successfully."
			);

			setEditing(null);

			loadClients();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	async function deleteClient(id, name) {

		const confirmed = window.confirm(
			`Delete "${name}"?`
		);

		if (!confirmed)
			return;

		try {

			await api.delete(`/clients/${id}`);

			showMessage(
				"success",
				"Client deleted successfully."
			);

			loadClients();

		}
		catch (err) {

			handleApiError(err);

		}

	}

	function updateFilter(e) {

		setFilters({
			...filters,
			[e.target.name]: e.target.value,
		});

	}

	function updateNewClient(e) {

		const { name, value } = e.target;

		setNewClient({
			...newClient,
			[name]: value,
		});

	}

	function clearFilters() {

		setFilters({
			name: "",
			phone: "",
			email: "",
		});

	}

	return (
		<div className="container">

			<h1>Clients</h1>

			{message.text && (
				<div className={`api-message ${message.type}`}>
					{message.text}
				</div>
			)}

			<div className="filters">

				<input
					name="name"
					placeholder="Name"
					value={filters.name}
					onChange={updateFilter}
				/>

				<input
					name="phone"
					placeholder="Phone"
					value={filters.phone}
					onChange={updateFilter}
				/>

				<input
					name="email"
					placeholder="Email"
					value={filters.email}
					onChange={updateFilter}
				/>

				<button onClick={clearFilters}>
					Clear
				</button>

				{!creating && (
					<button onClick={() => setCreating(true)}>
						Add Client
					</button>
				)}

			</div>

			<div className="table-wrapper">

			<table className="table">

				<thead>
					<tr>
						<th>Name</th>
						<th>Phone</th>
						<th>Email</th>
						<th>Address</th>
						<th>ZIP Code</th>
						<th>Tax Nº</th>
						<th></th>
					</tr>
				</thead>

				<tbody>
				{creating && (

					<tr className="editing">

						<td>

							<input
								name="name"
								placeholder="Client name"
								value={newClient.name}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<input
								name="phone"
								placeholder="Phone"
								value={newClient.phone}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<input
								name="email"
								placeholder="Email"
								value={newClient.email}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<input
								name="address"
								placeholder="Address"
								value={newClient.address}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<input
								name="zip_code"
								placeholder="ZIP Code"
								value={newClient.zip_code}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<input
								name="tax_nr"
								placeholder="Tax Number"
								value={newClient.tax_nr}
								onChange={updateNewClient}
							/>

						</td>

						<td>

							<div className="container-buttons">

								<button onClick={createClient}>
									Add
								</button>

								<button
									onClick={() => {

										setCreating(false);

										setNewClient(emptyClient);

									}}
								>
									X
								</button>

							</div>

						</td>

					</tr>

				)}

				{clients.map(client => (

					editing?.id === client.id ? (

						<tr
							key={client.id}
							className="editing"
						>

							<td>

								<input
									name="name"
									value={editing.name || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<input
									name="phone"
									value={editing.phone || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<input
									name="email"
									value={editing.email || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<input
									name="address"
									value={editing.address || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<input
									name="zip_code"
									value={editing.zip_code || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<input
									name="tax_nr"
									value={editing.tax_nr || ""}
									onChange={updateEdit}
								/>

							</td>

							<td>

								<div className="container-buttons">
																<button onClick={saveClient}>
									Save
								</button>

								<button
									onClick={() => setEditing(null)}
								>
									X
								</button>

							</div>

						</td>

					</tr>

				) : (

					<tr key={client.id}>

						<td>{client.name}</td>

						<td>{client.phone}</td>

						<td>{client.email || "-"}</td>

						<td>{client.address || "-"}</td>

						<td>{client.zip_code || "-"}</td>

						<td>{client.tax_nr || "-"}</td>

						<td>

							<div className="container-buttons">

								<button
									onClick={() => editClient(client)}
								>
									Edit
								</button>

								<button
									className="delete-btn"
									onClick={() =>
										deleteClient(
											client.id,
											client.name
										)
									}
								>
									Delete
								</button>

							</div>

						</td>

					</tr>

				)

			))}

				</tbody>

			</table>
			</div>

		</div>

	);

}
