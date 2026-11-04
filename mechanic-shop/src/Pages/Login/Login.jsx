import { useState } from "react";
import api from "../../api/axios";
import { setAuthToken } from "../../api/auth";
import { setViewLock } from "../../utils/notificationView";
import { setIsAdmin } from "../../api/account";
import "./Style/Login.css";

export default function Login() {

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		if (loading) return;

		setError("");
		setLoading(true);

		try {
			const res = await api.post("/auth/login", { username, password });
			setViewLock(res.data.notification_type_id);
			setIsAdmin(res.data.is_admin);
			setAuthToken(res.data.token);
		} catch (err) {
			setError(
				err?.response?.data?.error
				|| (err?.response ? "Não foi possível iniciar sessão." : "Sem ligação ao servidor.")
			);
			setLoading(false);
		}
	}

	return (

		<div className="login-page">

			<form className="login-card" onSubmit={handleSubmit}>

				<div className="login-brand">
					<span className="login-brand-icon">OL</span>
					<span className="login-brand-text">Oficina Lima</span>
				</div>

				<h1 className="login-title">Iniciar sessão</h1>

				<label className="login-field">
					<span>Utilizador</span>
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						autoComplete="username"
						autoCapitalize="none"
						autoFocus
						required
					/>
				</label>

				<label className="login-field">
					<span>Password</span>
					<div className="login-password">
						<input
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							required
						/>
						<button
							type="button"
							className="login-password-toggle"
							onClick={() => setShowPassword((v) => !v)}
							aria-label={showPassword ? "Esconder password" : "Mostrar password"}
							title={showPassword ? "Esconder password" : "Mostrar password"}
						>
							<i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
						</button>
					</div>
				</label>

				{error && <div className="login-error" role="alert">{error}</div>}

				<button type="submit" className="login-submit" disabled={loading}>
					{loading ? "A entrar…" : "Entrar"}
				</button>

				<p className="login-hint">A sessão fica guardada neste dispositivo.</p>

			</form>

		</div>

	);

}
