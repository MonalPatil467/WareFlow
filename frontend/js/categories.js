
const API_BASE_URL = "http://localhost:8090";
const INVENTORY_API = "/inventoryservice";
const CATEGORY_API = `${INVENTORY_API}/api/categories`;

const token = localStorage.getItem("wareflow_token");

let categories = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let statusFilter = "all";
let editingCategory = false;

const tableBody = document.getElementById("categoryTableBody");
const categoryModal = document.getElementById("categoryModal");
const categoryForm = document.getElementById("categoryForm");
const searchInput = document.getElementById("searchInput");
const statusFilterInput = document.getElementById("statusFilter");
const pageSizeInput = document.getElementById("pageSize");
const pagination = document.getElementById("pagination");

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

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
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

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
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

async function loadCategories() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">Loading categories...</td>
        </tr>
    `;

    try {
        const response = await apiRequest(CATEGORY_API);

        categories = getResponseData(response);

        updateStats();
        renderCategories();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        showToast(error.message, "error");
    }
}

function updateStats() {
    const active = categories.filter(
        category => category.active === true
    ).length;

    const inactive = categories.length - active;

    document.getElementById("totalCategories").textContent =
        categories.length;

    document.getElementById("activeCategories").textContent = active;

    document.getElementById("inactiveCategories").textContent = inactive;
}

function getFilteredCategories() {
    return categories.filter(category => {
        const name = String(category.categoryName || "").toLowerCase();
        const description = String(category.description || "").toLowerCase();
        const term = searchTerm.toLowerCase();

        const matchesSearch =
            name.includes(term) || description.includes(term);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && category.active === true) ||
            (statusFilter === "inactive" && category.active === false);

        return matchesSearch && matchesStatus;
    });
}

function renderCategories() {
    const filtered = getFilteredCategories();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageCategories = filtered.slice(
        startIndex,
        startIndex + pageSize
    );

    if (pageCategories.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">No categories found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageCategories.map(category => {
            const name = escapeHTML(
                category.categoryName || "Unnamed category"
            );

            const description = escapeHTML(
                category.description || "No description"
            );

            const status = category.active === true ? "Active" : "Inactive";
            const statusClass = category.active === true ? "active" : "inactive";
            const id = escapeHTML(category.id);

            return `
                <tr>
                    <td>
                        <div class="category-cell">
                            <div class="category-initial">
                                ${escapeHTML(name.charAt(0).toUpperCase())}
                            </div>
                            <div class="category-name">${name}</div>
                        </div>
                    </td>
                    <td class="description-cell">${description}</td>
                    <td>${formatDate(category.createdAt)}</td>
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
        `Showing ${firstItem}-${lastItem} of ${filtered.length} categories`;

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
    editingCategory = false;
    categoryForm.reset();

    document.getElementById("categoryId").value = "";
    document.getElementById("modalTitle").textContent = "Add Category";
    document.getElementById("modalSubtitle").textContent =
        "Enter the category details below.";
    document.getElementById("saveButton").textContent = "Save Category";
    document.getElementById("activeGroup").hidden = true;

    categoryModal.classList.add("show");
    document.getElementById("categoryName").focus();
}

function openEditModal(id) {
    const category = categories.find(
        item => String(item.id) === String(id)
    );

    if (!category) {
        showToast("Category not found.", "error");
        return;
    }

    editingCategory = true;
    categoryForm.reset();

    document.getElementById("categoryId").value = category.id;
    document.getElementById("categoryName").value =
        category.categoryName || "";
    document.getElementById("categoryDescription").value =
        category.description || "";
    document.getElementById("categoryActive").value =
        category.active === true ? "true" : "false";

    document.getElementById("modalTitle").textContent = "Edit Category";
    document.getElementById("modalSubtitle").textContent =
        "Update the category information.";
    document.getElementById("saveButton").textContent = "Update Category";
    document.getElementById("activeGroup").hidden = false;

    categoryModal.classList.add("show");
}

function closeModal() {
    categoryModal.classList.remove("show");
    categoryForm.reset();
}

async function saveCategory(event) {
    event.preventDefault();

    const id = document.getElementById("categoryId").value;
    const categoryName =
        document.getElementById("categoryName").value.trim();
    const description =
        document.getElementById("categoryDescription").value.trim();
    const saveButton = document.getElementById("saveButton");

    if (!categoryName) {
        showToast("Category name is required.", "error");
        return;
    }

    const payload = {
        categoryName,
        description
    };

    if (editingCategory) {
        payload.active =
            document.getElementById("categoryActive").value === "true";
    }

    saveButton.disabled = true;

    try {
        if (editingCategory) {
            await apiRequest(
                `${CATEGORY_API}/${encodeURIComponent(id)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

            showToast("Category updated successfully.");
        } else {
            await apiRequest(CATEGORY_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showToast("Category created successfully.");
        }

        closeModal();
        currentPage = 1;
        await loadCategories();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingCategory
            ? "Update Category"
            : "Save Category";
    }
}

async function deleteCategory(id) {
    const category = categories.find(
        item => String(item.id) === String(id)
    );

    if (!category) {
        showToast("Category not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${category.categoryName}"?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(
            `${CATEGORY_API}/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        showToast("Category deleted successfully.");

        const filteredCount = getFilteredCategories().length - 1;

        if (
            currentPage > 1 &&
            (currentPage - 1) * pageSize >= filteredCount
        ) {
            currentPage--;
        }

        await loadCategories();
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.getElementById("addCategoryButton")
    .addEventListener("click", openAddModal);

document.getElementById("closeModalButton")
    .addEventListener("click", closeModal);

document.getElementById("cancelButton")
    .addEventListener("click", closeModal);

document.getElementById("refreshButton")
    .addEventListener("click", loadCategories);

categoryForm.addEventListener("submit", saveCategory);

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    currentPage = 1;
    renderCategories();
});

statusFilterInput.addEventListener("change", event => {
    statusFilter = event.target.value;
    currentPage = 1;
    renderCategories();
});

pageSizeInput.addEventListener("change", event => {
    pageSize = Number(event.target.value);
    currentPage = 1;
    renderCategories();
});

pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) return;

    currentPage = Number(button.dataset.page);
    renderCategories();
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    if (button.dataset.action === "edit") {
        openEditModal(button.dataset.id);
    }

    if (button.dataset.action === "delete") {
        deleteCategory(button.dataset.id);
    }
});

categoryModal.addEventListener("click", event => {
    if (event.target === categoryModal) {
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
    loadCategories();
}