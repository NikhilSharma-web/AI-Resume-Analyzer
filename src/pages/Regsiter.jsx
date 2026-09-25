import { useEffect, useState } from "react";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL;

function Register({ onLogin, onGoogleSignup }) {

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Google Signup
    const handleGoogleSignup = async (response) => {
        try {
            setLoading(true);

            const result = await fetch(
                `${API_URL}/api/auth/google/signup`,
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
                alert(data.message || "Google signup failed.");
                return;
            }

            // Save our application's JWT
            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("user", JSON.stringify(data.user));

            // Login user in App.jsx
            onGoogleSignup(data.user);

        } catch (error) {
            console.error("Google Signup Error:", error);
            alert("Google signup failed.");
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

            console.log(
                "GOOGLE CLIENT ID:",
                import.meta.env.VITE_GOOGLE_CLIENT_ID
            );

            if (
                window.google &&
                document.getElementById("google-signup-button")
            ) {

                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleSignup,
                });

                window.google.accounts.id.renderButton(
                    document.getElementById("google-signup-button"),
                    {
                        theme: "outline",
                        size: "large",
                        width: 350,
                        text: "signup_with",
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

    // Normal Email/Password Registration
    const handleRegister = async (e) => {
        e.preventDefault();

        if (!name || !email || !password) {
            alert("Please fill all fields.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/api/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
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

            alert("Registration successful! Please Login.");

            // Go to Login page
            onLogin();

        } catch (error) {
            console.error("Registration error:", error);
            alert("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">

            <div className="auth-card">

                <h1>AI Resume Analyzer</h1>

                <p>Create Your Account</p>

                {/* Normal Registration */}
                <form onSubmit={handleRegister}>

                    <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

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

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating Account..."
                            : "Register"
                        }
                    </button>

                </form>

                {/* Google Divider */}
                <div className="google-divider">
                    <span>OR</span>
                </div>

                {/* Google Signup */}
                <div
                    id="google-signup-button"
                    className="google-login-button"
                ></div>

                {/* Login Link */}
                <p className="auth-register">

                    Already have an account?

                    <button
                        type="button"
                        onClick={onLogin}
                    >
                        Login
                    </button>

                </p>

            </div>

        </div>
    );
}

export default Register;