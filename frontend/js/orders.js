
const API_BASE_URL = "http://localhost:8090";
const ORDER_API = "/orderservice/api/orders";
const PRODUCT_API = "/inventoryservice/api/products";

const token = localStorage.getItem("wareflow_token");

const tableBody = document.getElementById("ordersTableBody");
const orderModal = document.getElementById("orderModal");
const detailsModal = document.getElementById("detailsModal");
const statusModal = document.getElementById("statusModal");
const messageBox = document.getElementById("message");

let orders = [];
let products = [];
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
        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
        const text = await response.text();
        let message = text || `Request failed with status ${response.status}`;

        try {
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || message;
        } catch {
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
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

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function showMessage(message, type = "success") {
    messageBox.textContent = message;
    messageBox.className = `message ${type}`;

    window.setTimeout(() => {
        messageBox.className = "message";
        messageBox.textContent = "";
    }, 5000);
}

function statusClass(status) {
    return String(status || "PENDING").toLowerCase();
}

function updateStats() {
    document.getElementById("totalOrders").textContent = orders.length;
    document.getElementById("pendingOrders").textContent =
        orders.filter(order => order.orderStatus === "PENDING").length;
    document.getElementById("processingOrders").textContent =
        orders.filter(order => order.orderStatus === "PROCESSING").length;
    document.getElementById("deliveredOrders").textContent =
        orders.filter(order => order.orderStatus === "DELIVERED").length;
}

function getFilteredOrders() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const status = document.getElementById("statusFilter").value;

    return orders.filter(order => {
        const searchText = [
            order.id,
            order.userId,
            order.companyId,
            order.city,
            order.country,
            order.shippingAddress
        ].join(" ").toLowerCase();

        return searchText.includes(search) &&
            (status === "all" || order.orderStatus === status);
    });
}

function renderOrders() {
    const filteredOrders = getFilteredOrders();
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * pageSize;
    const pageOrders = filteredOrders.slice(start, start + pageSize);

    if (!pageOrders.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">No orders found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pageOrders.map(order => {
            const itemsCount = (order.items || []).reduce(
                (sum, item) => sum + (Number(item.quantity) || 0),
                0
            );

            return `
                <tr>
                    <td class="order-number">#${escapeHtml(order.id)}</td>
                    <td>${escapeHtml(order.userId ?? "—")}</td>
                    <td>${escapeHtml(formatDate(order.createdAt))}</td>
                    <td>${itemsCount}</td>
                    <td class="amount">${escapeHtml(formatCurrency(order.totalAmount))}</td>
                    <td>
                        <span class="payment-status ${statusClass(order.paymentStatus)}">
                            ${escapeHtml(order.paymentStatus || "PENDING")}
                        </span>
                    </td>
                    <td>
                        <span class="status ${statusClass(order.orderStatus)}">
                            ${escapeHtml(order.orderStatus || "PENDING")}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-action="view" data-id="${escapeHtml(order.id)}">View</button>
                            <button class="action-btn edit-btn" data-action="status" data-id="${escapeHtml(order.id)}">Status</button>
                            <button class="action-btn delete-btn" data-action="cancel" data-id="${escapeHtml(order.id)}">Cancel</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages;

    updateStats();
}

async function loadOrders() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">Loading orders...</td>
        </tr>
    `;

    try {
        const result = await apiRequest(ORDER_API);
        orders = Array.isArray(result) ? result : [];
        currentPage = 1;
        renderOrders();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">Unable to load orders.</td>
            </tr>
        `;
        showMessage(error.message || "Unable to load orders.", "error");
    }
}

async function loadProducts() {
    try {
        const result = await apiRequest(PRODUCT_API);
        products = Array.isArray(result) ? result : [];
        addOrderItem();
    } catch (error) {
        products = [];
        document.getElementById("orderItems").innerHTML = `
            <p class="empty-state">Unable to load products. Check the product API.</p>
        `;
        showMessage(error.message || "Unable to load products.", "error");
    }
}

function getProductOptions(selectedId = "") {
    const availableProducts = products.filter(product => product.active !== false);

    return `
        <option value="">Select product</option>
        ${availableProducts.map(product => `
            <option value="${escapeHtml(product.id)}"
                data-price="${escapeHtml(product.price ?? 0)}"
                ${String(product.id) === String(selectedId) ? "selected" : ""}>
                ${escapeHtml(product.productName)} (${escapeHtml(product.sku || "No SKU")})
            </option>
        `).join("")}
    `;
}

function addOrderItem() {
    const container = document.getElementById("orderItems");

    if (!products.length) {
        container.innerHTML = `
            <p class="empty-state">Create an active product before placing an order.</p>
        `;
        return;
    }

    const row = document.createElement("div");
    row.className = "item-row";

    row.innerHTML = `
        <select class="item-product" required>
            ${getProductOptions()}
        </select>
        <input class="item-quantity" type="number" min="1" value="1" required>
        <span class="item-subtotal">${formatCurrency(0)}</span>
        <button type="button" class="remove-item-btn" aria-label="Remove product">&times;</button>
    `;

    container.appendChild(row);

    row.querySelector(".item-product").addEventListener("change", updateEstimatedTotal);
    row.querySelector(".item-quantity").addEventListener("input", updateEstimatedTotal);

    row.querySelector(".remove-item-btn").addEventListener("click", () => {
        if (container.querySelectorAll(".item-row").length > 1) {
            row.remove();
            updateEstimatedTotal();
        } else {
            row.querySelector(".item-product").value = "";
            row.querySelector(".item-quantity").value = "1";
            updateEstimatedTotal();
        }
    });

    updateEstimatedTotal();
}

function updateEstimatedTotal() {
    let total = 0;

    document.querySelectorAll(".item-row").forEach(row => {
        const select = row.querySelector(".item-product");
        const quantity = Number(row.querySelector(".item-quantity").value) || 0;
        const selectedOption = select.options[select.selectedIndex];
        const price = Number(selectedOption?.dataset.price) || 0;
        const subtotal = price * quantity;

        row.querySelector(".item-subtotal").textContent = formatCurrency(subtotal);
        total += subtotal;
    });

    document.getElementById("estimatedTotal").textContent = formatCurrency(total);
}

function openOrderModal() {
    document.getElementById("orderForm").reset();
    document.getElementById("orderItems").innerHTML = "";
    document.getElementById("estimatedTotal").textContent = formatCurrency(0);
    orderModal.classList.add("show");

    if (products.length) {
        addOrderItem();
    } else {
        loadProducts();
    }
}

function closeOrderModal() {
    orderModal.classList.remove("show");
    document.getElementById("orderForm").reset();
    document.getElementById("orderItems").innerHTML = "";
}

async function createOrder(event) {
    event.preventDefault();

    const rows = [...document.querySelectorAll(".item-row")];
    const items = rows.map(row => ({
        productId: Number(row.querySelector(".item-product").value),
        quantity: Number(row.querySelector(".item-quantity").value)
    }));

    if (!items.length || items.some(item =>
        !Number.isInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
    )) {
        showMessage("Select a product and enter a valid quantity for every item.", "error");
        return;
    }

    const productIds = items.map(item => item.productId);

    if (new Set(productIds).size !== productIds.length) {
        showMessage("Each product should appear only once. Update its quantity instead.", "error");
        return;
    }

    const payload = {
        items,
        shippingAddress: document.getElementById("shippingAddress").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        country: document.getElementById("country").value.trim(),
        postalCode: document.getElementById("postalCode").value.trim()
    };

    const submitButton = document.getElementById("submitOrderBtn");
    submitButton.disabled = true;
    submitButton.textContent = "Placing Order...";

    try {
        await apiRequest(ORDER_API, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        closeOrderModal();
        showMessage("Order created successfully.");
        await loadOrders();
    } catch (error) {
        showMessage(error.message || "Unable to create order.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Place Order";
    }
}

async function showOrderDetails(id) {
    try {
        const order = await apiRequest(`${ORDER_API}/${id}`);

        document.getElementById("detailsTitle").textContent = `Order #${order.id}`;
        document.getElementById("detailsSubtitle").textContent =
            `Created ${formatDate(order.createdAt)}`;

        const items = Array.isArray(order.items) ? order.items : [];

        document.getElementById("orderDetails").innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span>Customer ID</span>
                    <strong>${escapeHtml(order.userId ?? "—")}</strong>
                </div>
                <div class="detail-item">
                    <span>Company ID</span>
                    <strong>${escapeHtml(order.companyId ?? "—")}</strong>
                </div>
                <div class="detail-item">
                    <span>Order Status</span>
                    <strong>${escapeHtml(order.orderStatus ?? "—")}</strong>
                </div>
                <div class="detail-item">
                    <span>Payment Status</span>
                    <strong>${escapeHtml(order.paymentStatus ?? "—")}</strong>
                </div>
                <div class="detail-item">
                    <span>Total Amount</span>
                    <strong>${escapeHtml(formatCurrency(order.totalAmount))}</strong>
                </div>
                <div class="detail-item">
                    <span>Last Updated</span>
                    <strong>${escapeHtml(formatDate(order.updatedAt))}</strong>
                </div>
                <div class="detail-item">
                    <span>Shipping Address</span>
                    <strong>${escapeHtml(order.shippingAddress)}</strong>
                </div>
                <div class="detail-item">
                    <span>City / State</span>
                    <strong>${escapeHtml(order.city)}, ${escapeHtml(order.state)}</strong>
                </div>
                <div class="detail-item">
                    <span>Country</span>
                    <strong>${escapeHtml(order.country)}</strong>
                </div>
                <div class="detail-item">
                    <span>Postal Code</span>
                    <strong>${escapeHtml(order.postalCode)}</strong>
                </div>
            </div>

            <h3 class="detail-section-title">Order Items</h3>

            <div class="detail-table">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${escapeHtml(item.productName)}</td>
                                <td>${escapeHtml(item.sku)}</td>
                                <td>${escapeHtml(item.quantity)}</td>
                                <td>${escapeHtml(formatCurrency(item.unitPrice))}</td>
                                <td>${escapeHtml(formatCurrency(item.subtotal))}</td>
                            </tr>
                        `).join("") || `
                            <tr><td colspan="5" class="empty-state">No items found.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;

        detailsModal.classList.add("show");
    } catch (error) {
        showMessage(error.message || "Unable to load order details.", "error");
    }
}

function openStatusModal(id) {
    const order = orders.find(item => String(item.id) === String(id));

    if (!order) {
        return;
    }

    document.getElementById("statusOrderId").value = order.id;
    document.getElementById("statusOrderLabel").textContent = `Order #${order.id}`;
    document.getElementById("newOrderStatus").value = order.orderStatus || "PENDING";

    const statusSelect = document.getElementById("newOrderStatus");
    [...statusSelect.options].forEach(option => {
        option.disabled = option.value === "CANCELLED";
    });

    statusModal.classList.add("show");
}

function closeStatusModal() {
    statusModal.classList.remove("show");
}

async function updateOrderStatus(event) {
    event.preventDefault();

    const id = document.getElementById("statusOrderId").value;
    const orderStatus = document.getElementById("newOrderStatus").value;
    const saveButton = document.getElementById("saveStatusBtn");

    saveButton.disabled = true;
    saveButton.textContent = "Updating...";

    try {
        await apiRequest(`${ORDER_API}/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ orderStatus })
        });

        closeStatusModal();
        showMessage("Order status updated successfully.");
        await loadOrders();
    } catch (error) {
        showMessage(error.message || "Unable to update order status.", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Update Status";
    }
}

async function cancelOrder(id) {
    const order = orders.find(item => String(item.id) === String(id));

    if (!order) {
        return;
    }

    if (order.orderStatus === "CANCELLED") {
        showMessage("This order is already cancelled.", "error");
        return;
    }

    if (order.orderStatus === "DELIVERED") {
        showMessage("Delivered orders cannot be cancelled from this page.", "error");
        return;
    }

    if (!window.confirm(`Are you sure you want to cancel order #${id}?`)) {
        return;
    }

    try {
        await apiRequest(`${ORDER_API}/${id}`, {
            method: "DELETE"
        });

        showMessage("Order cancelled successfully.");
        await loadOrders();
    } catch (error) {
        showMessage(error.message || "Unable to cancel order.", "error");
    }
}

document.getElementById("createOrderBtn").addEventListener("click", openOrderModal);
document.getElementById("closeOrderModal").addEventListener("click", closeOrderModal);
document.getElementById("cancelOrderBtn").addEventListener("click", closeOrderModal);
document.getElementById("addItemBtn").addEventListener("click", addOrderItem);
document.getElementById("orderForm").addEventListener("submit", createOrder);

document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderOrders();
});

document.getElementById("statusFilter").addEventListener("change", () => {
    currentPage = 1;
    renderOrders();
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderOrders();
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredOrders().length / pageSize));

    if (currentPage < totalPages) {
        currentPage++;
        renderOrders();
    }
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const { action, id } = button.dataset;

    if (action === "view") {
        showOrderDetails(id);
    }

    if (action === "status") {
        openStatusModal(id);
    }

    if (action === "cancel") {
        cancelOrder(id);
    }
});

document.getElementById("closeDetailsModal").addEventListener("click", () => {
    detailsModal.classList.remove("show");
});

document.getElementById("closeStatusModal").addEventListener("click", closeStatusModal);
document.getElementById("cancelStatusBtn").addEventListener("click", closeStatusModal);
document.getElementById("statusForm").addEventListener("submit", updateOrderStatus);

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

[orderModal, detailsModal, statusModal].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});

loadOrders();