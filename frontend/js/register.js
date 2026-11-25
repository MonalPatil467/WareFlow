
const API_URL = "http://localhost:8090/authservice/api/auth/register";

const token = localStorage.getItem("wareflow_token");

let me = null;

try {
    me = JSON.parse(localStorage.getItem("wareflow_user") || "null");
} catch (e) {
    me = null;
}

const myRole = String((me && me.role) || "").replace(/^ROLE_/, "").toUpperCase();

if (!token || !me) {
    window.location.href = "index.html";
}

if (myRole !== "SUPER_ADMIN" && myRole !== "COMPANY_ADMIN") {
    window.location.href = "dashboard.html";
}

const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const message = document.getElementById("message");
const roleSelect = document.getElementById("role");
const companyInput = document.getElementById("companyId");
const companyGroup = document.getElementById("companyGroup");

const ROLE_LABELS = {
    COMPANY_ADMIN: "Company Admin",
    MANAGER: "Manager",
    WORKER: "Worker"
};

const allowedRoles = myRole === "SUPER_ADMIN"
    ? ["COMPANY_ADMIN", "MANAGER", "WORKER"]
    : ["MANAGER", "WORKER"];

allowedRoles.forEach(role => {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = ROLE_LABELS[role];
    roleSelect.appendChild(option);
});

const params = new URLSearchParams(window.location.search);

if (myRole === "COMPANY_ADMIN") {
    // A company admin always adds users to their own company
    companyInput.value = me.companyId;
    companyGroup.hidden = true;
    document.getElementById("subtitle").textContent =
        "Add a manager or worker to your company";
} else {
    companyInput.required = true;

    if (params.get("companyId")) {
        companyInput.value = params.get("companyId");
    }

    document.getElementById("subtitle").textContent =
        "Create an account for any company";
}

if (params.get("role") && allowedRoles.includes(params.get("role"))) {
    roleSelect.value = params.get("role");
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = roleSelect.value;
    const companyId = Number(companyInput.value);

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    if (password.length < 8) {
        showMessage("Password must contain at least 8 characters.", "error");
        return;
    }

    if (!role) {
        showMessage("Select a role.", "error");
        return;
    }

    if (myRole === "SUPER_ADMIN" &&
        (!Number.isSafeInteger(companyId) || companyId <= 0)) {
        showMessage("Enter a valid Company ID.", "error");
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                role,
                companyId: myRole === "SUPER_ADMIN" ? companyId : undefined
            })
        });

        if (response.status === 401) {
            localStorage.removeItem("wareflow_token");
            localStorage.removeItem("wareflow_user");
            window.location.href = "index.html";
            return;
        }

        let data = {};

        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.message || "Could not create the user.");
        }

        showMessage(`${firstName} ${lastName} was created as ${ROLE_LABELS[role]}.`, "success");

        registerForm.reset();

        if (myRole === "COMPANY_ADMIN") {
            companyInput.value = me.companyId;
        }

    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create User";
    }
});