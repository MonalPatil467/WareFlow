
const GATEWAY = "http://localhost:8090";

const API = {
    products: `${GATEWAY}/inventoryservice/api/products`,
    inventory: `${GATEWAY}/inventoryservice/api/inventory`,
    orders: `${GATEWAY}/orderservice/api/orders`,
    payments: `${GATEWAY}/paymentservice/api/payments`,
    suppliers: `${GATEWAY}/inventoryservice/api/suppliers`,
    warehouses: `${GATEWAY}/inventoryservice/api/warehouses`
};

let inventoryItems = [];

const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4"
];

function getToken() {
    return localStorage.getItem("wareflow_token");
}

function showMessage(message) {
    document.getElementById("message").textContent = message;
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

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

async function apiRequest(url) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: "application/json"
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("wareflow_token");
        localStorage.removeItem("wareflow_user");
        window.location.href = "../index.html";
        throw new Error("Your session has expired.");
    }

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
}

async function loadResource(url, name) {
    try {
        return getArray(await apiRequest(url));
    } catch (error) {
        console.error(`Unable to load ${name}:`, error);
        return null;
    }
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function statusOf(item) {
    return String(
        item.orderStatus ??
        item.status ??
        item.paymentStatus ??
        "UNKNOWN"
    ).toUpperCase();
}

function renderChart(chartId, legendId, counts) {
    const chart = document.getElementById(chartId);
    const legend = document.getElementById(legendId);
    const entries = Object.entries(counts);
    const max = Math.max(1, ...entries.map(([, value]) => value));

    if (!entries.length) {
        chart.innerHTML = '<p class="empty">No data available</p>';
        legend.innerHTML = "";
        return;
    }

    chart.innerHTML = entries.map(([label, value], index) => {
        const height = Math.max(4, (value / max) * 125);
        const color = colors[index % colors.length];

        return `
            <div class="chart-column">
                <div class="chart-value">${value}</div>
                <div class="chart-bar" style="height:${height}px;background:${color}"></div>
                <div class="chart-label">${escapeHtml(label.replaceAll("_", " "))}</div>
            </div>
        `;
    }).join("");

    legend.innerHTML = entries.map(([label, value], index) => `
        <div class="legend-item">
            <span class="legend-dot" style="background:${colors[index % colors.length]}"></span>
            <span>${escapeHtml(label.replaceAll("_", " "))}: ${value}</span>
        </div>
    `).join("");
}

function renderInventory(items) {
    const search = document.getElementById("inventorySearch").value
        .trim()
        .toLowerCase();

    const filtered = items.filter(item => {
        const name = String(item.productName ?? "").toLowerCase();
        const sku = String(item.sku ?? "").toLowerCase();
        return name.includes(search) || sku.includes(search);
    });

    const table = document.getElementById("inventoryTable");

    if (!filtered.length) {
        table.innerHTML = '<tr><td colspan="6" class="empty">No inventory records found.</td></tr>';
        return;
    }

    table.innerHTML = filtered.map(item => {
        const quantity = Number(item.quantity) || 0;
        const reorderLevel = Number(item.reorderLevel) || 0;
        const active = item.active !== false;

        let status = "In Stock";
        let badge = "stock-ok";

        if (!active) {
            status = "Inactive";
            badge = "stock-inactive";
        } else if (quantity <= reorderLevel) {
            status = "Low Stock";
            badge = "stock-low";
        }

        return `
            <tr>
                <td>${escapeHtml(item.productName || `Product #${item.productId ?? "—"}`)}</td>
                <td>${escapeHtml(item.sku || "—")}</td>
                <td>${escapeHtml(item.warehouseName || `Warehouse #${item.warehouseId ?? "—"}`)}</td>
                <td>${quantity}</td>
                <td>${reorderLevel}</td>
                <td><span class="stock-badge ${badge}">${status}</span></td>
            </tr>
        `;
    }).join("");
}

function renderRevenueBreakdown(payments) {
    const statuses = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"];

    const totals = Object.fromEntries(statuses.map(status => [
        status,
        payments
            .filter(payment => String(payment.paymentStatus ?? "").toUpperCase() === status)
            .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
    ]));

    const max = Math.max(1, ...Object.values(totals));

    document.getElementById("revenueBreakdown").innerHTML = statuses.map((status, index) => `
        <div>
            <div class="revenue-item">
                <span>${status.replaceAll("_", " ")}</span>
                <strong>${formatCurrency(totals[status])}</strong>
            </div>
            <div class="revenue-track">
                <div class="revenue-fill" style="width:${totals[status] / max * 100}%;background:${colors[index]}"></div>
            </div>
        </div>
    `).join("");
}

async function loadReports() {
    if (!getToken()) {
        window.location.href = "../index.html";
        return;
    }

    showMessage("Loading report data...");

    const results = await Promise.all([
        loadResource(API.products, "products"),
        loadResource(API.inventory, "inventory"),
        loadResource(API.orders, "orders"),
        loadResource(API.payments, "payments"),
        loadResource(API.suppliers, "suppliers"),
        loadResource(API.warehouses, "warehouses"),
        loadResource(`${API.inventory}/low-stock`, "low stock")
    ]);

    const [
        products,
        inventory,
        orders,
        payments,
        suppliers,
        warehouses,
        lowStock
    ] = results;

    const failures = results.filter(result => result === null).length;

    const safeProducts = products ?? [];
    const safeInventory = inventory ?? [];
    const safeOrders = orders ?? [];
    const safePayments = payments ?? [];
    const safeSuppliers = suppliers ?? [];
    const safeWarehouses = warehouses ?? [];

    inventoryItems = safeInventory;

    setText("totalProducts", products === null ? "N/A" : safeProducts.length);
    setText(
        "totalUnits",
        inventory === null
            ? "N/A"
            : safeInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toLocaleString("en-IN")
    );
    setText("totalOrders", orders === null ? "N/A" : safeOrders.length);

    const successful = safePayments.filter(
        payment => String(payment.paymentStatus ?? "").toUpperCase() === "SUCCESS"
    );

    const revenue = successful.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
    );

    setText("successfulPayments", payments === null ? "N/A" : successful.length);
    setText("paymentRevenue", payments === null ? "N/A" : formatCurrency(revenue));
    setText("lowStock", lowStock === null ? "N/A" : lowStock.length);

    const activeProducts = safeProducts.filter(product => product.active !== false);
    setText("activeProducts", products === null ? "N/A" : activeProducts.length);
    setText("totalSuppliers", suppliers === null ? "N/A" : safeSuppliers.length);
    setText("totalWarehouses", warehouses === null ? "N/A" : safeWarehouses.length);

    setText(
        "pendingPayments",
        payments === null
            ? "N/A"
            : safePayments.filter(payment => String(payment.paymentStatus ?? "").toUpperCase() === "PENDING").length
    );

    setText(
        "failedPayments",
        payments === null
            ? "N/A"
            : safePayments.filter(payment => String(payment.paymentStatus ?? "").toUpperCase() === "FAILED").length
    );

    const orderCounts = {};
    safeOrders.forEach(order => {
        const status = statusOf(order);
        orderCounts[status] = (orderCounts[status] || 0) + 1;
    });

    const paymentCounts = {};
    safePayments.forEach(payment => {
        const status = String(payment.paymentStatus ?? "UNKNOWN").toUpperCase();
        paymentCounts[status] = (paymentCounts[status] || 0) + 1;
    });

    renderChart("orderChart", "orderLegend", orderCounts);
    renderChart("paymentChart", "paymentLegend", paymentCounts);
    renderInventory(safeInventory);
    renderRevenueBreakdown(safePayments);

    showMessage(
        failures
            ? `${failures} data source(s) could not be loaded. Check that the services are running and the gateway routes are correct.`
            : "Reports updated successfully."
    );
}

document.getElementById("refreshBtn").addEventListener("click", loadReports);
document.getElementById("inventorySearch").addEventListener("input", () => renderInventory(inventoryItems));

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

loadReports();