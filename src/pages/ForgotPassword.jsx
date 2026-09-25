import { useState } from "react";
import "./ForgotPassword.css";

function ForgotPassword({ onLogin, email: initialEmail }) {
    const [email, setEmail] = useState(initialEmail || "");
    const [otp, setOtp] = useState("");

    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);

    const [resetToken, setResetToken] = useState("");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // =========================
    // SEND OTP
    // =========================
    const handleSendOtp = async () => {
        if (!email) {
            alert("Please enter your email.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/send-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to send OTP.");
                return;
            }

            alert("OTP sent successfully.");
            setOtpSent(true);

        } catch (error) {
            console.error("Send OTP Error:", error);
            alert("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // VERIFY OTP
    // =========================
    const handleVerifyOtp = async () => {
        if (!otp) {
            alert("Please enter the OTP.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/verify-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        otp,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Invalid OTP.");
                return;
            }

            setResetToken(data.resetToken);
            setOtpVerified(true);

            alert("OTP verified successfully.");

        } catch (error) {
            console.error("Verify OTP Error:", error);
            alert("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // RESET PASSWORD
    // =========================
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            alert("Please enter both passwords.");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/reset-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        resetToken,
                        newPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Password reset failed.");
                return;
            }

            alert("Password reset successfully. Please login.");

            onLogin();

        } catch (error) {
            console.error("Reset Password Error:", error);
            alert("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container forgot-password-page">
            <div className="auth-card">

                {!otpVerified ? (
                    <>
                        <h1>Forgot Password</h1>

                        <p>
                            Enter your email to receive an OTP.
                        </p>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        {!otpSent ? (
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                            >
                                {loading ? "Sending OTP..." : "Send OTP"}
                            </button>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Verifying..."
                                        : "Verify OTP"}
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <h1>Reset Password</h1>

                        <p>
                            Enter your new password below.
                        </p>

                        <div className="password-input-wrapper">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                            />
                            <button
                                type="button"
                                className="password-eye"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? (
                                    // OPEN EYE
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
                                    // SLASHED EYE
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

                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="password-eye"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
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
                    </>
                )}

                {/* RESET PASSWORD BUTTON */}
                {otpVerified && (
                    <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={loading}
                    >
                        {loading
                            ? "Resetting Password..."
                            : "Reset Password"}
                    </button>
                )}

                {/* BACK TO LOGIN */}
                <button
                    type="button"
                    className="back-to-login"
                    onClick={onLogin}
                >
                    Back to Login
                </button>

            </div>
        </div>
    );
}

export default ForgotPassword;  