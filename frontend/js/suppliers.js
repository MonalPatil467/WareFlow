
const API_BASE_URL = "http://localhost:8090";
const SUPPLIER_API = "/inventoryservice/api/suppliers";

const token = localStorage.getItem("wareflow_token");

let suppliers = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let statusFilter = "all";
let editingSupplier = false;

const tableBody = document.getElementById("supplierTableBody");
const supplierModal = document.getElementById("supplierModal");
const supplierForm = document.getElementById("supplierForm");
const searchInput = document.getElementById("searchInput");
const statusFilterInput = document.getElementById("statusFilter");
const pageSizeInput = document.getElementById("pageSize");
const pagination = document.getElementById("pagination");
const saveButton = document.getElementById("saveButton");

if (!token) {
    window.location.href = "../index.html";
}

function getResponseData(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.content)) return data.content;
    return [];
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("wareflow_token");
        localStorage.removeItem("wareflow_user");
        window.location.href = "../index.html";
        throw new Error("Your session has expired or access was denied.");
    }

    if (!response.ok) {
        let message = `Request failed with status ${response.status}.`;

        try {
            const error = await response.json();
            message = error.message || error.error || message;
        } catch {
            message = response.statusText || message;
        }

        throw new Error(message);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return null;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

function updateUserInfo() {
    const storedUser = localStorage.getItem("wareflow_user");

    if (!storedUser) return;

    try {
        const user = JSON.parse(storedUser);
        const name = user.name || user.username || user.phone || "Administrator";

        document.getElementById("userName").textContent = name;
        document.getElementById("userAvatar").textContent =
            name.charAt(0).toUpperCase();
    } catch {
        document.getElementById("userName").textContent = "Administrator";
    }
}

async function loadSuppliers() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">Loading suppliers...</td>
        </tr>
    `;

    try {
        const response = await apiRequest(SUPPLIER_API);

        suppliers = getResponseData(response);

        updateStats();
        renderSuppliers();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        showToast(error.message, "error");
    }
}

function updateStats() {
    const active = suppliers.filter(
        supplier => supplier.active === true
    ).length;

    document.getElementById("totalSuppliers").textContent =
        suppliers.length;

    document.getElementById("activeSuppliers").textContent = active;

    document.getElementById("inactiveSuppliers").textContent =
        suppliers.length - active;
}

function getFilteredSuppliers() {
    return suppliers.filter(supplier => {
        const searchable = [
            supplier.supplierName,
            supplier.contactPerson,
            supplier.email,
            supplier.phoneNumber,
            supplier.city,
            supplier.state,
            supplier.country
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && supplier.active === true) ||
            (statusFilter === "inactive" && supplier.active === false);

        return matchesSearch && matchesStatus;
    });
}

function renderSuppliers() {
    const filtered = getFilteredSuppliers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageSuppliers = filtered.slice(
        startIndex,
        startIndex + pageSize
    );

    if (pageSuppliers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">No suppliers found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageSuppliers.map(supplier => {
            const name = escapeHTML(
                supplier.supplierName || "Unnamed supplier"
            );

            const email = escapeHTML(supplier.email || "No email");
            const contact = escapeHTML(supplier.contactPerson || "—");
            const phone = escapeHTML(supplier.phoneNumber || "—");

            const location = [
                supplier.city,
                supplier.state,
                supplier.country
            ].filter(Boolean).join(", ");

            const status = supplier.active === true ? "Active" : "Inactive";
            const statusClass = supplier.active === true ? "active" : "inactive";
            const id = escapeHTML(supplier.id);

            return `
                <tr>
                    <td>
                        <div class="supplier-cell">
                            <div class="supplier-initial">
                                ${escapeHTML(name.charAt(0).toUpperCase())}
                            </div>
                            <div>
                                <div class="supplier-name">${name}</div>
                                <span class="supplier-email">${email}</span>
                            </div>
                        </div>
                    </td>
                    <td>${contact}</td>
                    <td>${phone}</td>
                    <td class="location-cell">${escapeHTML(location || "—")}</td>
                    <td>
                        <span class="status ${statusClass}">${status}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-button"
                                data-action="edit"
                                data-id="${id}">Edit</button>
                            <button class="action-button delete"
                                data-action="delete"
                                data-id="${id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    const firstItem = filtered.length === 0 ? 0 : startIndex + 1;
    const lastItem = Math.min(startIndex + pageSize, filtered.length);

    document.getElementById("paginationInfo").textContent =
        `Showing ${firstItem}-${lastItem} of ${filtered.length} suppliers`;

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    let html = `
        <button class="page-button"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? "disabled" : ""}>‹</button>
    `;

    for (let page = 1; page <= totalPages; page++) {
        html += `
            <button class="page-button ${page === currentPage ? "active" : ""}"
                data-page="${page}">${page}</button>
        `;
    }

    html += `
        <button class="page-button"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? "disabled" : ""}>›</button>
    `;

    pagination.innerHTML = html;
}

function openAddModal() {
    editingSupplier = false;
    supplierForm.reset();

    document.getElementById("supplierId").value = "";
    document.getElementById("modalTitle").textContent = "Add Supplier";
    document.getElementById("saveButton").textContent = "Save Supplier";
    document.getElementById("activeGroup").hidden = true;

    supplierModal.classList.add("show");
    document.getElementById("supplierName").focus();
}

function openEditModal(id) {
    const supplier = suppliers.find(
        item => String(item.id) === String(id)
    );

    if (!supplier) {
        showToast("Supplier not found.", "error");
        return;
    }

    editingSupplier = true;
    supplierForm.reset();

    document.getElementById("supplierId").value = supplier.id;
    document.getElementById("supplierName").value =
        supplier.supplierName || "";
    document.getElementById("contactPerson").value =
        supplier.contactPerson || "";
    document.getElementById("email").value = supplier.email || "";
    document.getElementById("phoneNumber").value =
        supplier.phoneNumber || "";
    document.getElementById("address").value = supplier.address || "";
    document.getElementById("city").value = supplier.city || "";
    document.getElementById("state").value = supplier.state || "";
    document.getElementById("country").value = supplier.country || "";
    document.getElementById("postalCode").value = supplier.postalCode || "";
    document.getElementById("supplierActive").value =
        supplier.active === true ? "true" : "false";

    document.getElementById("modalTitle").textContent = "Edit Supplier";
    document.getElementById("saveButton").textContent = "Update Supplier";
    document.getElementById("activeGroup").hidden = false;

    supplierModal.classList.add("show");
}

function closeModal() {
    supplierModal.classList.remove("show");
    supplierForm.reset();
}

function getSupplierPayload() {
    const payload = {
        supplierName: document.getElementById("supplierName").value.trim(),
        contactPerson: document.getElementById("contactPerson").value.trim(),
        email: document.getElementById("email").value.trim(),
        phoneNumber: document.getElementById("phoneNumber").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        country: document.getElementById("country").value.trim(),
        postalCode: document.getElementById("postalCode").value.trim()
    };

    if (editingSupplier) {
        payload.active =
            document.getElementById("supplierActive").value === "true";
    }

    return payload;
}

async function saveSupplier(event) {
    event.preventDefault();

    const id = document.getElementById("supplierId").value;
    const payload = getSupplierPayload();

    if (
        !payload.supplierName ||
        !payload.contactPerson ||
        !payload.email ||
        !payload.phoneNumber
    ) {
        showToast(
            "Supplier name, contact person, email and phone are required.",
            "error"
        );
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = editingSupplier ? "Updating..." : "Saving...";

    try {
        if (editingSupplier) {
            await apiRequest(
                `${SUPPLIER_API}/${encodeURIComponent(id)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

            showToast("Supplier updated successfully.");
        } else {
            await apiRequest(SUPPLIER_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showToast("Supplier created successfully.");
        }

        closeModal();
        currentPage = 1;
        await loadSuppliers();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingSupplier
            ? "Update Supplier"
            : "Save Supplier";
    }
}

async function deleteSupplier(id) {
    const supplier = suppliers.find(
        item => String(item.id) === String(id)
    );

    if (!supplier) {
        showToast("Supplier not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${supplier.supplierName}"?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(
            `${SUPPLIER_API}/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        showToast("Supplier deleted successfully.");

        const filteredCount = getFilteredSuppliers().length - 1;

        if (
            currentPage > 1 &&
            (currentPage - 1) * pageSize >= filteredCount
        ) {
            currentPage--;
        }

        await loadSuppliers();
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.getElementById("addSupplierButton")
    .addEventListener("click", openAddModal);

document.getElementById("closeModalButton")
    .addEventListener("click", closeModal);

document.getElementById("cancelButton")
    .addEventListener("click", closeModal);

document.getElementById("refreshButton")
    .addEventListener("click", loadSuppliers);

supplierForm.addEventListener("submit", saveSupplier);

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    currentPage = 1;
    renderSuppliers();
});

statusFilterInput.addEventListener("change", event => {
    statusFilter = event.target.value;
    currentPage = 1;
    renderSuppliers();
});

pageSizeInput.addEventListener("change", event => {
    pageSize = Number(event.target.value);
    currentPage = 1;
    renderSuppliers();
});

pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) return;

    currentPage = Number(button.dataset.page);
    renderSuppliers();
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    if (button.dataset.action === "edit") {
        openEditModal(button.dataset.id);
    }

    if (button.dataset.action === "delete") {
        deleteSupplier(button.dataset.id);
    }
});

supplierModal.addEventListener("click", event => {
    if (event.target === supplierModal) {
        closeModal();
    }
});

document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
    }
});

updateUserInfo();

if (token) {
    loadSuppliers();
}