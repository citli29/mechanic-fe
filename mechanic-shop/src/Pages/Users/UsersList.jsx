import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

import "../Style/Page.css";
import "../Style/Card.css";
import "./Style/UsersList.css";

const PER_PAGE = 10;

export default function UsersList() {

	const requestIdRef = useRef(0);

	const [users, setUsers] = useState([]);

	const [filters, setFilters] = useState({
		name: "",
		email: "",
		user_type: "",
	});

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);


	useEffect(() => { loadUsers(); }, [page]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (page !== 1) {
				setPage(1);
			} else {
				loadUsers();
			}
		}, 400);

		return () => clearTimeout(timer);
	}, [filters]);


	async function loadUsers() {
		const requestId = ++requestIdRef.current;

		try {
			const params = Object.fromEntries(
				Object.entries(filters).filter(([_, value]) => value !== "")
			);

			params.p = page;
			params.u = PER_PAGE;

			const res = await api.get("/users", { params });

			if (requestId !== requestIdRef.current) return;

			setUsers(res.data.user_list || []);
			setTotalPages(res.data.pagination?.total_pages || 1);
			setTotal(res.data.pagination?.total ?? (res.data.user_list || []).length);
		} catch (err) {
			if (requestId !== requestIdRef.current) return;

			console.error(err);
			setUsers([]);
		}
	}


	function updateFilter(e) {
		setFilters({ ...filters, [e.target.name]: e.target.value });
	}


	function clearFilters() {
		setFilters({ name: "", email: "", user_type: "" });
	}

	return (
		<div className="page users-page">
			<div className="content">

				<div className="card">
					<div className="header">
						<i className="fa-solid fa-users" />
						<h1>Utilizadores</h1>
					</div>

					<div className="body">

						<div className="filters">
							<input
								name="name"
								placeholder="Nome"
								value={filters.name}
								onChange={updateFilter}
							/>

							<input
								name="email"
								placeholder="Email"
								value={filters.email}
								onChange={updateFilter}
							/>

							<input
								name="user_type"
								placeholder="Tipo de Utilizador"
								value={filters.user_type}
								onChange={updateFilter}
							/>

							<button className="options" onClick={clearFilters}>
								<i className="fa-solid fa-broom" /> Limpar
							</button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Nome</th>
									<th>Email</th>
									<th>Tipo de Utilizador</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{users.map((user) => (
									<tr key={user.id}>
										<td data-label="Nome"><span className="cell-truncate" title={user.name}>{user.name}</span></td>
										<td data-label="Email"><span className="cell-truncate" title={user.email}>{user.email}</span></td>
										<td data-label="Tipo de Utilizador"><span className="cell-truncate" title={user.user_type_name}>{user.user_type_name || "-"}</span></td>

										<td className="actions">
											<Link className="options" to={`/users/${user.id}`}>
												<i className="fa-solid fa-arrow-up-right-from-square" />
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className="pagination">
							<button
								className="options"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<i className="fa-solid fa-chevron-left" />
							</button>

							<span>Página {page} de {totalPages} ({total} utilizadores)</span>

							<button
								className="options"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<i className="fa-solid fa-chevron-right" />
							</button>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
