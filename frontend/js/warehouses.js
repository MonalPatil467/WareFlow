
const API_BASE_URL = "http://localhost:8090";
const WAREHOUSE_API = "/inventoryservice/api/warehouses";

const token = localStorage.getItem("wareflow_token");

const tableBody = document.getElementById("warehouseTableBody");
const modal = document.getElementById("warehouseModal");
const form = document.getElementById("warehouseForm");
const messageBox = document.getElementById("message");

let warehouses = [];
let currentPage = 1;
const pageSize = 8;

if (!token) {
    window.location.href = "../index.html";
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("wareflow_token");
        localStorage.removeItem("wareflow_user");
        window.location.href = "../index.html";
        throw new Error("Your session has expired.");
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function showMessage(message, type = "success") {
    messageBox.textContent = message;
    messageBox.className = `message ${type}`;

    window.setTimeout(() => {
        messageBox.className = "message";
        messageBox.textContent = "";
    }, 4000);
}

function updateStats() {
    document.getElementById("totalWarehouses").textContent = warehouses.length;
    document.getElementById("activeWarehouses").textContent =
        warehouses.filter(warehouse => warehouse.active).length;
    document.getElementById("inactiveWarehouses").textContent =
        warehouses.filter(warehouse => !warehouse.active).length;
}

function getFilteredWarehouses() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const status = document.getElementById("statusFilter").value;

    return warehouses.filter(warehouse => {
        const searchableText = [
            warehouse.warehouseName,
            warehouse.city,
            warehouse.state,
            warehouse.country,
            warehouse.postalCode,
            warehouse.address
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(search);
        const matchesStatus =
            status === "all" ||
            (status === "active" && warehouse.active) ||
            (status === "inactive" && !warehouse.active);

        return matchesSearch && matchesStatus;
    });
}

function renderWarehouses() {
    const filteredWarehouses = getFilteredWarehouses();
    const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / pageSize));

    currentPage = Math.min(currentPage, totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const pageWarehouses = filteredWarehouses.slice(startIndex, startIndex + pageSize);

    if (pageWarehouses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">No warehouses found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageWarehouses.map(warehouse => `
            <tr>
                <td>${warehouse.id}</td>
                <td class="warehouse-name">${escapeHtml(warehouse.warehouseName)}</td>
                <td class="location-text">${escapeHtml(warehouse.city)}, ${escapeHtml(warehouse.state)}</td>
                <td>${escapeHtml(warehouse.address)}</td>
                <td>${escapeHtml(warehouse.postalCode)}</td>
                <td>
                    <span class="status ${warehouse.active ? "active" : "inactive"}">
                        ${warehouse.active ? "Active" : "Inactive"}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-action="edit" data-id="${warehouse.id}">Edit</button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${warehouse.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages;

    updateStats();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function loadWarehouses() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">Loading warehouses...</td>
        </tr>
    `;

    try {
        const result = await apiRequest(WAREHOUSE_API);
        warehouses = Array.isArray(result) ? result : [];
        currentPage = 1;
        renderWarehouses();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">Unable to load warehouses.</td>
            </tr>
        `;
        showMessage(error.message || "Unable to load warehouses.", "error");
    }
}

function openModal(warehouse = null) {
    form.reset();
    document.getElementById("warehouseId").value = warehouse?.id ?? "";
    document.getElementById("modalTitle").textContent =
        warehouse ? "Edit Warehouse" : "Add Warehouse";
    document.getElementById("saveBtn").textContent =
        warehouse ? "Update Warehouse" : "Save Warehouse";
    document.getElementById("statusGroup").hidden = !warehouse;

    if (warehouse) {
        document.getElementById("warehouseName").value = warehouse.warehouseName ?? "";
        document.getElementById("address").value = warehouse.address ?? "";
        document.getElementById("city").value = warehouse.city ?? "";
        document.getElementById("state").value = warehouse.state ?? "";
        document.getElementById("country").value = warehouse.country ?? "";
        document.getElementById("postalCode").value = warehouse.postalCode ?? "";
        document.getElementById("active").value = String(warehouse.active);
    }

    modal.classList.add("show");
}

function closeModal() {
    modal.classList.remove("show");
    form.reset();
}

function getFormData() {
    return {
        warehouseName: document.getElementById("warehouseName").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        country: document.getElementById("country").value.trim(),
        postalCode: document.getElementById("postalCode").value.trim()
    };
}

async function saveWarehouse(event) {
    event.preventDefault();

    const id = document.getElementById("warehouseId").value;
    const payload = getFormData();
    const saveButton = document.getElementById("saveBtn");

    if (id) {
        payload.active = document.getElementById("active").value === "true";
    }

    saveButton.disabled = true;
    saveButton.textContent = id ? "Updating..." : "Saving...";

    try {
        if (id) {
            await apiRequest(`${WAREHOUSE_API}/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            showMessage("Warehouse updated successfully.");
        } else {
            await apiRequest(WAREHOUSE_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            showMessage("Warehouse created successfully.");
        }

        closeModal();
        await loadWarehouses();
    } catch (error) {
        showMessage(error.message || "Unable to save warehouse.", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = id ? "Update Warehouse" : "Save Warehouse";
    }
}

async function deleteWarehouse(id) {
    const warehouse = warehouses.find(item => String(item.id) === String(id));

    if (!warehouse) {
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${warehouse.warehouseName}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`${WAREHOUSE_API}/${id}`, {
            method: "DELETE"
        });

        showMessage("Warehouse deleted successfully.");
        await loadWarehouses();
    } catch (error) {
        showMessage(error.message || "Unable to delete warehouse.", "error");
    }
}

document.getElementById("addWarehouseBtn").addEventListener("click", () => {
    openModal();
});

document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
form.addEventListener("submit", saveWarehouse);

document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderWarehouses();
});

document.getElementById("statusFilter").addEventListener("change", () => {
    currentPage = 1;
    renderWarehouses();
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderWarehouses();
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredWarehouses().length / pageSize));

    if (currentPage < totalPages) {
        currentPage++;
        renderWarehouses();
    }
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const { action, id } = button.dataset;

    if (action === "edit") {
        const warehouse = warehouses.find(item => String(item.id) === String(id));

        if (warehouse) {
            openModal(warehouse);
        }
    }

    if (action === "delete") {
        deleteWarehouse(id);
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeModal();
    }
});

loadWarehouses();