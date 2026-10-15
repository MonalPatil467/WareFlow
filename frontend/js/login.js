const API_BASE_URL = "http://localhost:8090/authservice";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const buttonText = document.getElementById("buttonText");
const loader = document.getElementById("loader");
const togglePassword = document.getElementById("togglePassword");

function showError(element, message) {
    if (element) {
        element.textContent = message;
    }
}

function clearErrors() {
    showError(emailError, "");
    showError(passwordError, "");
    showError(loginError, "");

    if (loginError) {
        loginError.style.display = "none";
    }
}

function validateForm() {
    clearErrors();

    let valid = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
        showError(emailError, "Email address is required.");
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(emailError, "Please enter a valid email address.");
        valid = false;
    }

    if (!password) {
        showError(passwordError, "Password is required.");
        valid = false;
    }

    return valid;
}

function setLoading(loading) {
    loginButton.disabled = loading;

    if (buttonText) {
        buttonText.style.display = loading ? "none" : "inline";
    }

    if (loader) {
        loader.style.display = loading ? "inline-block" : "none";
    }
}

function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");

        if (parts.length !== 3) {
            return {};
        }

        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const decoded = atob(base64);
        const bytes = Uint8Array.from(
            decoded,
            character => character.charCodeAt(0)
        );

        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return {};
    }
}

if (togglePassword) {
    togglePassword.addEventListener("click", function () {
        const showPassword = passwordInput.type === "password";

        passwordInput.type = showPassword ? "text" : "password";
        togglePassword.textContent = showPassword ? "🙈" : "👁";
        togglePassword.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );
    });
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            }
        );

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = { message: responseText };
            }
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `Login failed. HTTP status: ${response.status}`
            );
        }

        if (!data.token) {
            throw new Error(
                "The server did not return a token. Check the login API response."
            );
        }

        const claims = decodeJwtPayload(data.token);

        const user = data.user || {
            email: claims.sub || emailInput.value.trim(),
            name: claims.name || claims.fullName || emailInput.value.trim(),
            role: claims.role || claims.roles?.[0] || "USER",
            userId: claims.userId || claims.id || null,
            companyId: claims.companyId || null
        };

        localStorage.setItem("wareflow_token", data.token);
        localStorage.setItem("wareflow_user", JSON.stringify(user));

        if (data.message) {
            localStorage.setItem("wareflow_message", data.message);
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login error:", error);

        showError(
            loginError,
            error.message || "Unable to connect to the server."
        );

        if (loginError) {
            loginError.style.display = "block";
        }
    } finally {
        setLoading(false);
    }
});

if (loader) {
    loader.style.display = "none";
}