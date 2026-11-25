
const DEFAULT_PREFERENCES = {
    emailNotifications: true,
    lowStockAlerts: true,
    orderUpdates: true,
    theme: "light"
};

function getToken() {
    return localStorage.getItem("wareflow_token");
}

function getPreferences() {
    try {
        return {
            ...DEFAULT_PREFERENCES,
            ...JSON.parse(localStorage.getItem("wareflow_preferences") || "{}")
        };
    } catch {
        return { ...DEFAULT_PREFERENCES };
    }
}

function decodeToken() {
    const token = getToken();

    if (!token) return {};

    try {
        const payload = token.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = decodeURIComponent(
            atob(base64)
                .split("")
                .map(character => "%" + character.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
        );

        return JSON.parse(decoded);
    } catch {
        return {};
    }
}

function getUserDetails() {
    let storedUser = {};

    try {
        storedUser = JSON.parse(localStorage.getItem("wareflow_user") || "{}");
    } catch {
        storedUser = {};
    }

    const claims = decodeToken();

    return {
        ...claims,
        ...storedUser,
        firstName: storedUser.firstName ?? claims.firstName ?? claims.given_name ?? "",
        lastName: storedUser.lastName ?? claims.lastName ?? claims.family_name ?? "",
        email: storedUser.email ?? claims.email ?? claims.sub ?? "",
        role: storedUser.role ?? claims.role ?? claims.authorities?.[0] ?? "",
        companyId: storedUser.companyId ?? claims.companyId ?? claims.company_id ?? ""
    };
}

function setValue(id, value) {
    document.getElementById(id).value = value ?? "";
}

function displayUser() {
    const user = getUserDetails();

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "WareFlow User";
    const email = user.email || "Email not available";
    const role = String(user.role || "USER").replace(/^ROLE_/, "").toUpperCase();

    document.getElementById("displayName").textContent = fullName;
    document.getElementById("displayEmail").textContent = email;
    document.getElementById("displayRole").textContent = role;

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    document.getElementById("avatar").textContent = initials.toUpperCase() || "WF";

    setValue("firstName", firstName);
    setValue("lastName", lastName);
    setValue("email", user.email || "");
    setValue("role", role);
    setValue("companyId", user.companyId || "");
}

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
}

function loadPreferences() {
    const preferences = getPreferences();

    document.getElementById("emailNotifications").checked = Boolean(preferences.emailNotifications);
    document.getElementById("lowStockAlerts").checked = Boolean(preferences.lowStockAlerts);
    document.getElementById("orderUpdates").checked = Boolean(preferences.orderUpdates);
    document.getElementById("theme").value = preferences.theme === "dark" ? "dark" : "light";

    applyTheme(preferences.theme);
}

function savePreferences(event) {
    event.preventDefault();

    const preferences = {
        emailNotifications: document.getElementById("emailNotifications").checked,
        lowStockAlerts: document.getElementById("lowStockAlerts").checked,
        orderUpdates: document.getElementById("orderUpdates").checked,
        theme: document.getElementById("theme").value
    };

    localStorage.setItem("wareflow_preferences", JSON.stringify(preferences));
    applyTheme(preferences.theme);

    const message = document.getElementById("message");
    message.textContent = "Preferences saved in this browser.";
    message.style.color = "#047857";
}

function logout() {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
}

function initializeSettings() {
    if (!getToken()) {
        window.location.href = "../index.html";
        return;
    }

    displayUser();
    loadPreferences();

    document.getElementById("preferencesForm").addEventListener("submit", savePreferences);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("securityLogout").addEventListener("click", logout);

    document.getElementById("theme").addEventListener("change", event => {
        applyTheme(event.target.value);
    });
}

initializeSettings();
