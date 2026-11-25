
const API_BASE_URL = "http://localhost:8090";
const COMPANY_API = "/companyservice/api/companies";

const token = localStorage.getItem("wareflow_token");

if (!token) {
    window.location.href = "../index.html";
}

let companies = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let editing = false;

const tableBody = document.getElementById("companyTableBody");
const companyModal = document.getElementById("companyModal");
const companyForm = document.getElementById("companyForm");
const searchInput = document.getElementById("searchInput");
const pageSizeInput = document.getElementById("pageSize");
const pagination = document.getElementById("pagination");
const saveButton = document.getElementById("saveButton");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    // Only an invalid / expired token logs the user out
    if (response.status === 401) {
        localStorage.removeItem("wareflow_token");
        localStorage.removeItem("wareflow_user");
        window.location.href = "../index.html";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 204) {
        return null;
    }

    let data = null;

    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }

    if (!response.ok) {
        const fieldErrors = data && data.errors
            ? Object.values(data.errors).join(", ")
            : "";

        throw new Error(
            fieldErrors ||
            (data && data.message) ||
            (response.status === 403
                ? "You do not have permission to do this."
                : "Request failed.")
        );
    }

    return data;
}

function updateUserInfo() {
    const user = window.WF_USER;

    if (!user) return;

    const name = user.name || user.email || "Super Admin";

    document.getElementById("userName").textContent = name;
    document.getElementById("userAvatar").textContent =
        name.trim().charAt(0).toUpperCase();
}

async function loadCompanies() {

    tableBody.innerHTML =
        `<tr><td colspan="7" class="empty-state">Loading companies...</td></tr>`;

    try {
        const data = await apiRequest(COMPANY_API);
        companies = Array.isArray(data) ? data : [];
        currentPage = 1;
        render();
    } catch (error) {
        tableBody.innerHTML =
            `<tr><td colspan="7" class="empty-state">${escapeHtml(error.message)}</td></tr>`;
    }
}

function filtered() {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return companies;

    return companies.filter(c =>
        [c.companyName, c.email, c.gstNumber, c.city, c.id]
            .some(v => String(v ?? "").toLowerCase().includes(term))
    );
}

function render() {

    document.getElementById("totalCompanies").textContent = companies.length;
    document.getElementById("activeCompanies").textContent =
        companies.filter(c => c.active).length;
    document.getElementById("inactiveCompanies").textContent =
        companies.filter(c => !c.active).length;

    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const rows = list.slice(start, start + pageSize);

    if (rows.length === 0) {
        tableBody.innerHTML =
            `<tr><td colspan="7" class="empty-state">No companies found.</td></tr>`;
    } else {
        tableBody.innerHTML = rows.map(c => `
            <tr>
                <td class="id-cell">#${escapeHtml(c.id)}</td>
                <td>
                    <strong>${escapeHtml(c.companyName)}</strong><br>
                    <small>GST: ${escapeHtml(c.gstNumber)}</small>
                </td>
                <td>${escapeHtml(c.email)}<br><small>${escapeHtml(c.phone)}</small></td>
                <td>${escapeHtml([c.city, c.state, c.country].filter(Boolean).join(", "))}</td>
                <td><span class="plan-badge">${escapeHtml(c.subscriptionPlan)}</span></td>
                <td>
                    <span class="status ${c.active ? "active" : "inactive"}">
                        ${c.active ? "Active" : "Inactive"}
                    </span>
                </td>
                <td>
                    <div class="actions">
                        <a class="link-button"
                           href="../register.html?companyId=${encodeURIComponent(c.id)}&role=COMPANY_ADMIN">
                           + Admin
                        </a>
                        <button class="link-button" data-action="edit" data-id="${escapeHtml(c.id)}">Edit</button>
                        <button class="link-button" data-action="delete" data-id="${escapeHtml(c.id)}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("paginationInfo").textContent =
        `Showing ${rows.length} of ${list.length} companies`;

    let buttons = "";

    for (let page = 1; page <= totalPages; page++) {
        buttons += `<button class="page-button ${page === currentPage ? "active" : ""}"
                            data-page="${page}">${page}</button>`;
    }

    pagination.innerHTML = buttons;
}

function openModal(company) {

    editing = Boolean(company);

    companyForm.reset();

    document.getElementById("modalTitle").textContent =
        editing ? "Edit Company" : "Add Company";

    // The plan can only be chosen when creating (the update API has no plan field)
    document.getElementById("planGroup").hidden = editing;

    if (editing) {
        document.getElementById("companyId").value = company.id;
        document.getElementById("companyName").value = company.companyName || "";
        document.getElementById("email").value = company.email || "";
        document.getElementById("phone").value = company.phone || "";
        document.getElementById("gstNumber").value = company.gstNumber || "";
        document.getElementById("address").value = company.address || "";
        document.getElementById("city").value = company.city || "";
        document.getElementById("state").value = company.state || "";
        document.getElementById("country").value = company.country || "";
        document.getElementById("postalCode").value = company.postalCode || "";
    } else {
        document.getElementById("companyId").value = "";
    }

    companyModal.classList.add("show");
}

function closeModal() {
    companyModal.classList.remove("show");
}

function formBody() {

    const body = {
        companyName: document.getElementById("companyName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        gstNumber: document.getElementById("gstNumber").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        country: document.getElementById("country").value.trim(),
        postalCode: document.getElementById("postalCode").value.trim()
    };

    if (!editing) {
        body.subscriptionPlan = document.getElementById("subscriptionPlan").value;
    }

    return body;
}

companyForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    saveButton.disabled = true;

    try {

        const id = document.getElementById("companyId").value;

        if (editing) {
            await apiRequest(`${COMPANY_API}/${id}`, {
                method: "PUT",
                body: JSON.stringify(formBody())
            });
            showToast("Company updated.");
        } else {
            const created = await apiRequest(COMPANY_API, {
                method: "POST",
                body: JSON.stringify(formBody())
            });
            showToast(`Company created. Its ID is ${created && created.id}.`);
        }

        closeModal();
        await loadCompanies();

    } catch (error) {
        showToast(error.message, "error");
    } finally {
        saveButton.disabled = false;
    }
});

tableBody.addEventListener("click", async (event) => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const company = companies.find(c => c.id === id);

    if (button.dataset.action === "edit" && company) {
        openModal(company);
    }

    if (button.dataset.action === "delete" && company) {

        if (!confirm(`Delete company "${company.companyName}"?`)) return;

        try {
            await apiRequest(`${COMPANY_API}/${id}`, { method: "DELETE" });
            showToast("Company deleted.");
            await loadCompanies();
        } catch (error) {
            showToast(error.message, "error");
        }
    }
});

pagination.addEventListener("click", (event) => {

    const button = event.target.closest("button[data-page]");

    if (!button) return;

    currentPage = Number(button.dataset.page);
    render();
});

searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    currentPage = 1;
    render();
});

pageSizeInput.addEventListener("change", () => {
    pageSize = Number(pageSizeInput.value);
    currentPage = 1;
    render();
});

document.getElementById("addCompanyButton")
    .addEventListener("click", () => openModal(null));
document.getElementById("closeModalButton").addEventListener("click", closeModal);
document.getElementById("cancelButton").addEventListener("click", closeModal);
document.getElementById("refreshButton").addEventListener("click", loadCompanies);

companyModal.addEventListener("click", (event) => {
    if (event.target === companyModal) closeModal();
});

document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});

updateUserInfo();
loadCompanies();