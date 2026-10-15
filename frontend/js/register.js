const API_URL = "http://localhost:8090/authservice/api/auth/register";

const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const message = document.getElementById("message");

function showMessage(text, type) {
    if (!message) return;

    message.textContent = text;
    message.className = "message " + type;
    message.style.display = "block";
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
}

function setLoading(loading) {
    if (!registerButton) return;

    registerButton.disabled = loading;
    registerButton.textContent = loading
        ? "Creating Account..."
        : "Create Account";
}

if (!registerForm || !registerButton || !message) {
    console.error(
        "Registration form elements are missing. Check register.html IDs."
    );
} else {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const firstName = getValue("firstName");
        const lastName = getValue("lastName");
        const email = getValue("email");
        const password = document.getElementById("password")?.value || "";
        const confirmPassword =
            document.getElementById("confirmPassword")?.value || "";
        const role = getValue("role");
        const companyIdValue = getValue("companyId");
        const companyId = Number(companyIdValue);

        if (!firstName || !lastName || !email || !password ||
            !confirmPassword || !role || !companyIdValue) {
            showMessage("Please fill in all required fields.", "error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage("Please enter a valid email address.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage(
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (!Number.isSafeInteger(companyId) || companyId <= 0) {
            showMessage("Enter a valid Company ID.", "error");
            return;
        }

        const requestBody = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            role: role,
            companyId: companyId
        };

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

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
                    `Registration failed (HTTP ${response.status}).`
                );
            }

            showMessage(
                data.message ||
                "Registration successful. Redirecting to login...",
                "success"
            );

            registerForm.reset();

            window.setTimeout(function () {
                window.location.href = "index.html";
            }, 1500);

        } catch (error) {
            console.error("Registration error:", error);

            showMessage(
                error.message ||
                "Unable to connect to the server. Please try again.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    });
}