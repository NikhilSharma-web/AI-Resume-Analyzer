import { useEffect, useState } from "react";
import "./Login.css";

function Login({ onLogin, onRegister, onForgotPassword }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);


    // Google Login
    const handleGoogleLogin = async (response) => {
        try {
            setLoading(true);

            const result = await fetch(
                "http://localhost:5000/api/auth/google/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                }
            );

            const data = await result.json();

            if (!result.ok) {
                alert(data.message || "Google login failed.");
                return;
            }

            // Save our application's JWT
            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("user", JSON.stringify(data.user));

            // Login user in App.jsx
            onLogin(data.user);

        } catch (error) {
            console.error("Google Login Error:", error);
            alert("Google login failed.");
        } finally {
            setLoading(false);
        }
    };

    // Load Google Identity Services
    useEffect(() => {

        const script = document.createElement("script");

        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (
                window.google &&
                document.getElementById("google-login-button")
            ) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleLogin,
                });

                window.google.accounts.id.renderButton(
                    document.getElementById("google-login-button"),
                    {
                        theme: "outline",
                        size: "large",
                        width: 350,
                        text: "signin_with",
                        shape: "rectangular",
                    }
                );
            }
        };

        document.body.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    // Normal Email/Password Login
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                return;
            }

            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("user", JSON.stringify(data.user));

            alert("Login successful!");

            onLogin(data.user);

        } catch (error) {
            console.error("Login error:", error);
            alert("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">

                <h1>AI Resume Analyzer</h1>

                <p>Login to analyze your resume</p>

                <form onSubmit={handleLogin}>

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <div className="password-input-wrapper">

                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                /* OPEN EYE */
                                <svg
                                    viewBox="0 0 24 24"
                                    width="21"
                                    height="21"
                                    fill="none"
                                    stroke="#777"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            ) : (
                                /* SLASHED EYE */
                                <svg
                                    viewBox="0 0 24 24"
                                    width="21"
                                    height="21"
                                    fill="none"
                                    stroke="#777"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 3l18 18" />
                                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                                    <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-3.17 4.19" />
                                    <path d="M6.61 6.61C3.85 8.43 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.39-.91" />
                                </svg>
                            )}
                        </button>

                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>
                <button
                    type="button"
                    className="forgot-password"
                    onClick={() => onForgotPassword(email)}
                >
                    Forgot Password?
                </button>

                <div className="google-divider">
                    <span>OR</span>
                </div>

                <div
                    id="google-login-button"
                    className="google-login-button"
                ></div>

                <p className="auth-register">
                    Don't have an account?
                    <button
                        type="button"
                        onClick={onRegister}
                    >
                        Register
                    </button>
                </p>

            </div>
        </div>
    );
}

export default Login;