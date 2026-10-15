
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
    if (Array.isArray(data?.items)) return data.items;
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
    let container = document.getElementById("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

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
        const name = user.name || user.username || user.email || "Administrator";
        const nameElement = document.getElementById("userName");
        const avatarElement = document.getElementById("userAvatar");

        if (nameElement) nameElement.textContent = name;
        if (avatarElement) avatarElement.textContent = name.charAt(0).toUpperCase();
    } catch {
        const nameElement = document.getElementById("userName");
        if (nameElement) nameElement.textContent = "Administrator";
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
        showToast(`Could not load products: ${productResult.reason.message}`, "error");
    }

    if (warehouseResult.status === "fulfilled") {
        warehouses = getResponseData(warehouseResult.value);
        populateWarehouses();
    } else {
        showToast(`Could not load warehouses: ${warehouseResult.reason.message}`, "error");
    }
}

function populateProducts() {
    const select = document.getElementById("productId");
    if (!select) return;

    select.innerHTML = '<option value="">Select product</option>';

    products
        .filter(product => product.active !== false)
        .forEach(product => {
            const option = document.createElement("option");
            option.value = product.id;
            option.textContent = `${product.productName || product.name || "Product"} (${product.sku || "No SKU"})`;
            select.appendChild(option);
        });
}

function populateWarehouses() {
    const select = document.getElementById("warehouseId");
    if (!select) return;

    select.innerHTML = '<option value="">Select warehouse</option>';

    warehouses
        .filter(warehouse => warehouse.active !== false)
        .forEach(warehouse => {
            const option = document.createElement("option");
            option.value = warehouse.id;
            option.textContent = `${warehouse.warehouseName || warehouse.name || "Warehouse"} - ${warehouse.city || ""}`;
            select.appendChild(option);
        });
}

async function loadInventory() {
    if (!tableBody) return;

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
                <td colspan="7" class="empty-state">${escapeHTML(error.message)}</td>
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
        Number(record.quantity) <= Number(record.reorderLevel ?? 0);
}

function getStockStatus(record) {
    if (record.active === false) {
        return { label: "Inactive", className: "inactive" };
    }

    if (isOutOfStock(record)) {
        return { label: "Out of Stock", className: "out" };
    }

    if (isLowStock(record)) {
        return { label: "Low Stock", className: "low" };
    }

    return { label: "Healthy", className: "healthy" };
}

function updateStats() {
    const activeRecords = inventoryRecords.filter(
        record => record.active !== false
    );

    const lowStock = activeRecords.filter(isLowStock).length;
    const outOfStock = activeRecords.filter(isOutOfStock).length;

    const totalElement = document.getElementById("totalInventory");
    const lowElement = document.getElementById("lowStockCount");
    const outElement = document.getElementById("outOfStockCount");

    if (totalElement) totalElement.textContent = inventoryRecords.length;
    if (lowElement) lowElement.textContent = lowStock;
    if (outElement) outElement.textContent = outOfStock;
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
    if (!tableBody) return;

    const filtered = getFilteredInventory();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const pageRecords = filtered.slice(startIndex, startIndex + pageSize);

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
    const paginationInfo = document.getElementById("paginationInfo");

    if (paginationInfo) {
        paginationInfo.textContent =
            `Showing ${firstItem}-${lastItem} of ${filtered.length} records`;
    }

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    if (!pagination) return;

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
    saveButton.textContent = "Save Inventory";

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
    document.getElementById("quantity").value = record.quantity ?? 0;
    document.getElementById("reorderLevel").value = record.reorderLevel ?? 0;
    document.getElementById("maximumStock").value = record.maximumStock ?? 0;
    document.getElementById("inventoryActive").value =
        record.active === false ? "false" : "true";

    document.getElementById("modalTitle").textContent = "Edit Inventory";
    saveButton.textContent = "Update Inventory";

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
    const originalButtonText = editingInventory
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

        if (quantity > maximumStock) {
            throw new Error(
                "Quantity cannot be greater than maximum stock."
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
            await apiRequest(
                `${INVENTORY_API}/${encodeURIComponent(id)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

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
        showToast(error.message || "Unable to save inventory.", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
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
        await apiRequest(
            `${INVENTORY_API}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        showToast("Inventory deleted successfully.");

        const remaining = getFilteredInventory().length - 1;

        if (currentPage > 1 && (currentPage - 1) * pageSize >= remaining) {
            currentPage--;
        }

        await loadInventory();
    } catch (error) {
        showToast(error.message || "Unable to delete inventory.", "error");
    }
}

document.getElementById("addInventoryButton")
    .addEventListener("click", openAddModal);

document.getElementById("closeModalButton")
    .addEventListener("click", closeModal);

document.getElementById("cancelButton")
    .addEventListener("click", closeModal);

document.getElementById("refreshButton")
    .addEventListener("click", async () => {
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
    const selectedSize = Number(event.target.value);

    if (Number.isInteger(selectedSize) && selectedSize > 0) {
        pageSize = selectedSize;
    }

    currentPage = 1;
    renderInventory();
});

pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) return;

    const page = Number(button.dataset.page);

    if (Number.isInteger(page) && page >= 1) {
        currentPage = page;
        renderInventory();
    }
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
    if (event.key === "Escape" && inventoryModal.classList.contains("show")) {
        closeModal();
    }
});

async function initializeInventoryPage() {
    updateUserInfo();

    await loadReferenceData();
    await loadInventory();
}

if (token) {
    initializeInventoryPage().catch(error => {
        showToast(error.message || "Unable to initialize inventory page.", "error");
    });
}
