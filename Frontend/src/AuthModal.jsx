import { useState } from "react";
import "./AuthModal.css";

function AuthModal({ onAuthSuccess }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setError("");
  };

  const switchMode = (next) => {
    setMode(next);
    resetForm();
  };

  const handleSubmit = async () => {
    setError("");

    // Basic client-side validation
    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const endpoint =
      mode === "signup"
        ? "http://localhost:8080/api/auth/signup"
        : "http://localhost:8080/api/auth/login";

    const body =
      mode === "signup"
        ? { fullName: fullName.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Save token to localStorage so session persists on refresh
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        {/* Logo */}
        <div className="modalLogo">
          Cortex<span className="modalAI">AI</span>
        </div>

        <h2 className="modalTitle">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="modalSubtitle">
          {mode === "signup"
            ? "Sign up to start chatting and save your history."
            : "Log in to access your previous chats."}
        </p>

        {/* Form */}
        <div className="modalForm">
          {mode === "signup" && (
            <div className="inputGroup">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          <div className="inputGroup">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={loading}
              autoFocus={mode === "login"}
            />
          </div>

          <div className="inputGroup">
            <label>Password</label>
            <div className="passwordWrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={
                  mode === "signup" ? "Min. 6 characters" : "Your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={loading}
              />
              <button
                type="button"
                className="eyeBtn"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i
                  className={
                    showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"
                  }
                ></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="modalError">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}

          <button
            className="modalSubmitBtn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="modalSpinner"></span>
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Log In"
            )}
          </button>
        </div>

        {/* Switch mode */}
        <p className="modalSwitch">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => switchMode("login")}>Sign in</button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button onClick={() => switchMode("signup")}>Sign up</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
