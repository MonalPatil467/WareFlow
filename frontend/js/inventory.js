const API_BASE_URL = "http://localhost:8090";
const INVENTORY_API = "/inventoryservice/api/inventory";
const PRODUCT_API = "/inventoryservice/api/products";
const WAREHOUSE_API = "/inventoryservice/api/warehouses";

const token = localStorage.getItem("wareflow_token");

let inventoryRecords = [];
let products = [];
let warehouses = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let stockFilter = "all";
let editingInventory = false;

const tableBody = document.getElementById("inventoryTableBody");
const inventoryModal = document.getElementById("inventoryModal");
const inventoryForm = document.getElementById("inventoryForm");
const searchInput = document.getElementById("searchInput");
const stockFilterInput = document.getElementById("stockFilter");
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

    if (response.status === 401) {
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

async function loadReferenceData() {
    const [productResult, warehouseResult] = await Promise.allSettled([
        apiRequest(PRODUCT_API),
        apiRequest(WAREHOUSE_API)
    ]);

    if (productResult.status === "fulfilled") {
        products = getResponseData(productResult.value);
        populateProducts();
    } else {
        showToast(
            `Could not load products: ${productResult.reason.message}`,
            "error"
        );
    }

    if (warehouseResult.status === "fulfilled") {
        warehouses = getResponseData(warehouseResult.value);
        populateWarehouses();
    } else {
        showToast(
            `Could not load warehouses: ${warehouseResult.reason.message}`,
            "error"
        );
    }
}

function populateProducts() {
    const select = document.getElementById("productId");

    select.innerHTML = '<option value="">Select product</option>';

    products
        .filter(product => product.active !== false)
        .forEach(product => {
            const option = document.createElement("option");

            option.value = product.id;
            option.textContent =
                `${product.productName} (${product.sku || "No SKU"})`;

            select.appendChild(option);
        });
}

function populateWarehouses() {
    const select = document.getElementById("warehouseId");

    select.innerHTML = '<option value="">Select warehouse</option>';

    warehouses
        .filter(warehouse => warehouse.active !== false)
        .forEach(warehouse => {
            const option = document.createElement("option");

            option.value = warehouse.id;
            option.textContent =
                `${warehouse.warehouseName} - ${warehouse.city || ""}`;

            select.appendChild(option);
        });
}

async function loadInventory() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">Loading inventory...</td>
        </tr>
    `;

    try {
        const response = await apiRequest(INVENTORY_API);

        inventoryRecords = getResponseData(response);

        updateStats();
        renderInventory();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        showToast(error.message, "error");
    }
}

function isOutOfStock(record) {
    return Number(record.quantity) <= 0;
}

function isLowStock(record) {
    return !isOutOfStock(record) &&
        Number(record.quantity) <= Number(record.reorderLevel);
}

function getStockStatus(record) {
    if (record.active === false) {
        return {
            label: "Inactive",
            className: "inactive"
        };
    }

    if (isOutOfStock(record)) {
        return {
            label: "Out of Stock",
            className: "out"
        };
    }

    if (isLowStock(record)) {
        return {
            label: "Low Stock",
            className: "low"
        };
    }

    return {
        label: "Healthy",
        className: "healthy"
    };
}

function updateStats() {
    const activeRecords = inventoryRecords.filter(
        record => record.active !== false
    );

    const lowStock = activeRecords.filter(isLowStock).length;
    const outOfStock = activeRecords.filter(isOutOfStock).length;

    document.getElementById("totalInventory").textContent =
        inventoryRecords.length;

    document.getElementById("lowStockCount").textContent = lowStock;

    document.getElementById("outOfStockCount").textContent = outOfStock;
}

function getFilteredInventory() {
    return inventoryRecords.filter(record => {
        const searchable = [
            record.productName,
            record.sku,
            record.warehouseName
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(searchTerm.toLowerCase());

        let matchesStock = true;

        if (stockFilter === "out") {
            matchesStock = isOutOfStock(record);
        } else if (stockFilter === "low") {
            matchesStock = isLowStock(record);
        } else if (stockFilter === "healthy") {
            matchesStock =
                record.active !== false &&
                !isOutOfStock(record) &&
                !isLowStock(record);
        }

        return matchesSearch && matchesStock;
    });
}

function renderInventory() {
    const filtered = getFilteredInventory();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageRecords = filtered.slice(
        startIndex,
        startIndex + pageSize
    );

    if (pageRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">No inventory records found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageRecords.map(record => {
            const name = escapeHTML(record.productName || "Unnamed product");
            const sku = escapeHTML(record.sku || "No SKU");
            const warehouse = escapeHTML(record.warehouseName || "—");
            const status = getStockStatus(record);
            const id = escapeHTML(record.id);

            return `
                <tr>
                    <td>
                        <div class="product-cell">
                            <div class="product-initial">
                                ${escapeHTML(name.charAt(0).toUpperCase())}
                            </div>
                            <div>
                                <div class="product-name">${name}</div>
                                <span class="product-sku">${sku}</span>
                            </div>
                        </div>
                    </td>
                    <td>${warehouse}</td>
                    <td class="quantity">${escapeHTML(record.quantity)}</td>
                    <td>${escapeHTML(record.reorderLevel)}</td>
                    <td>${escapeHTML(record.maximumStock)}</td>
                    <td>
                        <span class="stock-status ${status.className}">
                            ${status.label}
                        </span>
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
        `Showing ${firstItem}-${lastItem} of ${filtered.length} records`;

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
    editingInventory = false;
    inventoryForm.reset();

    document.getElementById("inventoryId").value = "";
    document.getElementById("modalTitle").textContent = "Add Inventory";
    document.getElementById("saveButton").textContent = "Save Inventory";
    document.getElementById("productGroup").hidden = false;
    document.getElementById("warehouseGroup").hidden = false;
    document.getElementById("activeGroup").hidden = true;

    inventoryModal.classList.add("show");
}

function openEditModal(id) {
    const record = inventoryRecords.find(
        item => String(item.id) === String(id)
    );

    if (!record) {
        showToast("Inventory record not found.", "error");
        return;
    }

    editingInventory = true;
    inventoryForm.reset();

    document.getElementById("inventoryId").value = record.id;
    document.getElementById("quantity").value = record.quantity;
    document.getElementById("reorderLevel").value = record.reorderLevel;
    document.getElementById("maximumStock").value = record.maximumStock;
    document.getElementById("inventoryActive").value =
        record.active === true ? "true" : "false";

    document.getElementById("modalTitle").textContent = "Edit Inventory";
    document.getElementById("saveButton").textContent = "Update Inventory";
    document.getElementById("productGroup").hidden = true;
    document.getElementById("warehouseGroup").hidden = true;
    document.getElementById("activeGroup").hidden = false;

    inventoryModal.classList.add("show");
}

function closeModal() {
    inventoryModal.classList.remove("show");
    inventoryForm.reset();
}

function readNonNegativeInteger(id, label) {
    const value = document.getElementById(id).value.trim();
    const number = Number(value);

    if (value === "" || !Number.isSafeInteger(number) || number < 0) {
        throw new Error(`${label} must be a non-negative whole number.`);
    }

    return number;
}

async function saveInventory(event) {
    event.preventDefault();

    const id = document.getElementById("inventoryId").value;
    const saveButtonText = editingInventory
        ? "Update Inventory"
        : "Save Inventory";

    try {
        const quantity = readNonNegativeInteger("quantity", "Quantity");
        const reorderLevel = readNonNegativeInteger(
            "reorderLevel",
            "Reorder level"
        );
        const maximumStock = readNonNegativeInteger(
            "maximumStock",
            "Maximum stock"
        );

        if (maximumStock < reorderLevel) {
            throw new Error(
                "Maximum stock must be greater than or equal to the reorder level."
            );
        }

        const payload = {
            quantity,
            reorderLevel,
            maximumStock
        };

        if (editingInventory) {
            payload.active =
                document.getElementById("inventoryActive").value === "true";
        } else {
            const productId = document.getElementById("productId").value;
            const warehouseId = document.getElementById("warehouseId").value;

            if (!productId || !warehouseId) {
                throw new Error("Select a product and warehouse.");
            }

            payload.productId = Number(productId);
            payload.warehouseId = Number(warehouseId);
        }

        saveButton.disabled = true;
        saveButton.textContent = editingInventory ? "Updating..." : "Saving...";

        if (editingInventory) {
            await apiRequest(`${INVENTORY_API}/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showToast("Inventory updated successfully.");
        } else {
            await apiRequest(INVENTORY_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showToast("Inventory created successfully.");
        }

        closeModal();
        currentPage = 1;
        await loadInventory();
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = saveButtonText;
    }
}

async function deleteInventory(id) {
    const record = inventoryRecords.find(
        item => String(item.id) === String(id)
    );

    if (!record) {
        showToast("Inventory record not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Delete inventory for "${record.productName}" at "${record.warehouseName}"?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`${INVENTORY_API}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        showToast("Inventory deleted successfully.");

        const remaining = getFilteredInventory().length - 1;

        if (
            currentPage > 1 &&
            (currentPage - 1) * pageSize >= remaining
        ) {
            currentPage--;
        }

        await loadInventory();
    } catch (error) {
        showToast(error.message, "error");
    }
}

document.getElementById("addInventoryButton")
    .addEventListener("click", openAddModal);

document.getElementById("closeModalButton")
    .addEventListener("click", closeModal);

document.getElementById("cancelButton")
    .addEventListener("click", closeModal);

document.getElementById("refreshButton").addEventListener("click", async () => {
    await loadReferenceData();
    await loadInventory();
});

inventoryForm.addEventListener("submit", saveInventory);

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    currentPage = 1;
    renderInventory();
});

stockFilterInput.addEventListener("change", event => {
    stockFilter = event.target.value;
    currentPage = 1;
    renderInventory();
});

pageSizeInput.addEventListener("change", event => {
    pageSize = Number(event.target.value);
    currentPage = 1;
    renderInventory();
});

pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) return;

    currentPage = Number(button.dataset.page);
    renderInventory();
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    if (button.dataset.action === "edit") {
        openEditModal(button.dataset.id);
    }

    if (button.dataset.action === "delete") {
        deleteInventory(button.dataset.id);
    }
});

inventoryModal.addEventListener("click", event => {
    if (event.target === inventoryModal) {
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

async function initializeInventoryPage() {
    updateUserInfo();

    try {
        await loadReferenceData();
        await loadInventory();
    } catch (error) {
        showToast(error.message, "error");
    }
}

if (token) {
    initializeInventoryPage();
}