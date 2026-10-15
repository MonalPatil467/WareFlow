
const API_BASE_URL = "http://localhost:8090";
const PAYMENT_API = "/paymentservice/api/payments";

const token = localStorage.getItem("wareflow_token");

const tableBody = document.getElementById("paymentsTableBody");
const messageBox = document.getElementById("message");
const paymentModal = document.getElementById("paymentModal");
const detailsModal = document.getElementById("detailsModal");
const statusModal = document.getElementById("statusModal");

let payments = [];
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
    document.getElementById("totalPayments").textContent = payments.length;

    document.getElementById("successfulPayments").textContent =
        payments.filter(payment => payment.paymentStatus === "SUCCESS").length;

    document.getElementById("pendingPayments").textContent =
        payments.filter(payment => payment.paymentStatus === "PENDING").length;

    const successfulAmount = payments
        .filter(payment => payment.paymentStatus === "SUCCESS")
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    document.getElementById("totalAmount").textContent =
        formatCurrency(successfulAmount);
}

function getFilteredPayments() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const status = document.getElementById("statusFilter").value;

    return payments.filter(payment => {
        const searchText = [
            payment.id,
            payment.orderId,
            payment.userId,
            payment.companyId
        ].join(" ").toLowerCase();

        return searchText.includes(search) &&
            (status === "all" || payment.paymentStatus === status);
    });
}

function renderPayments() {
    const filteredPayments = getFilteredPayments();
    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * pageSize;
    const pagePayments = filteredPayments.slice(start, start + pageSize);

    if (!pagePayments.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">No payments found.</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = pagePayments.map(payment => `
            <tr>
                <td class="payment-id">#${escapeHtml(payment.id)}</td>
                <td>#${escapeHtml(payment.orderId)}</td>
                <td>${escapeHtml(payment.userId)}</td>
                <td class="amount">${escapeHtml(formatCurrency(payment.amount))}</td>
                <td>${escapeHtml(payment.paymentMethod || "—")}</td>
                <td>
                    <span class="status ${statusClass(payment.paymentStatus)}">
                        ${escapeHtml(payment.paymentStatus)}
                    </span>
                </td>
                <td>${escapeHtml(formatDate(payment.createdAt))}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-btn" data-action="view" data-id="${escapeHtml(payment.id)}">View</button>
                        <button class="action-btn edit-btn" data-action="status" data-id="${escapeHtml(payment.id)}">Status</button>
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

async function loadPayments() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">Loading payments...</td>
        </tr>
    `;

    try {
        const result = await apiRequest(PAYMENT_API);
        payments = Array.isArray(result) ? result : [];
        currentPage = 1;
        renderPayments();
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">Unable to load payments.</td>
            </tr>
        `;
        showMessage(error.message || "Unable to load payments.", "error");
    }
}

function openPaymentModal() {
    document.getElementById("paymentForm").reset();
    paymentModal.classList.add("show");
}

function closePaymentModal() {
    paymentModal.classList.remove("show");
    document.getElementById("paymentForm").reset();
}

async function createPayment(event) {
    event.preventDefault();

    const orderId = Number(document.getElementById("orderId").value);

    if (!Number.isInteger(orderId) || orderId <= 0) {
        showMessage("Enter a valid order ID.", "error");
        return;
    }

    const button = document.getElementById("savePaymentBtn");
    button.disabled = true;
    button.textContent = "Creating...";

    try {
        await apiRequest(PAYMENT_API, {
            method: "POST",
            body: JSON.stringify({ orderId })
        });

        closePaymentModal();
        showMessage("Payment record created successfully.");
        await loadPayments();
    } catch (error) {
        showMessage(error.message || "Unable to create payment.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "Create Payment";
    }
}

async function showPaymentDetails(id) {
    try {
        const payment = await apiRequest(`${PAYMENT_API}/${id}`);

        document.getElementById("detailsSubtitle").textContent =
            `Payment #${payment.id}`;

        document.getElementById("paymentDetails").innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span>Payment ID</span>
                    <strong>#${escapeHtml(payment.id)}</strong>
                </div>
                <div class="detail-item">
                    <span>Order ID</span>
                    <strong>#${escapeHtml(payment.orderId)}</strong>
                </div>
                <div class="detail-item">
                    <span>Customer ID</span>
                    <strong>${escapeHtml(payment.userId)}</strong>
                </div>
                <div class="detail-item">
                    <span>Company ID</span>
                    <strong>${escapeHtml(payment.companyId)}</strong>
                </div>
                <div class="detail-item">
                    <span>Amount</span>
                    <strong>${escapeHtml(formatCurrency(payment.amount))}</strong>
                </div>
                <div class="detail-item">
                    <span>Payment Method</span>
                    <strong>${escapeHtml(payment.paymentMethod || "Not specified")}</strong>
                </div>
                <div class="detail-item">
                    <span>Payment Status</span>
                    <strong>${escapeHtml(payment.paymentStatus)}</strong>
                </div>
                <div class="detail-item">
                    <span>Created At</span>
                    <strong>${escapeHtml(formatDate(payment.createdAt))}</strong>
                </div>
                <div class="detail-item">
                    <span>Updated At</span>
                    <strong>${escapeHtml(formatDate(payment.updatedAt))}</strong>
                </div>
            </div>
        `;

        detailsModal.classList.add("show");
    } catch (error) {
        showMessage(error.message || "Unable to load payment details.", "error");
    }
}

function openStatusModal(id) {
    const payment = payments.find(item => String(item.id) === String(id));

    if (!payment) {
        return;
    }

    document.getElementById("statusPaymentId").value = payment.id;
    document.getElementById("statusSubtitle").textContent =
        `Payment #${payment.id} · Order #${payment.orderId}`;
    document.getElementById("paymentStatus").value = payment.paymentStatus;

    statusModal.classList.add("show");
}

function closeStatusModal() {
    statusModal.classList.remove("show");
}

async function updatePaymentStatus(event) {
    event.preventDefault();

    const id = document.getElementById("statusPaymentId").value;
    const paymentStatus = document.getElementById("paymentStatus").value;
    const button = document.getElementById("saveStatusBtn");

    button.disabled = true;
    button.textContent = "Updating...";

    try {
        await apiRequest(`${PAYMENT_API}/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ paymentStatus })
        });

        closeStatusModal();
        showMessage("Payment status updated successfully.");
        await loadPayments();
    } catch (error) {
        showMessage(error.message || "Unable to update payment status.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "Update Status";
    }
}

document.getElementById("createPaymentBtn").addEventListener("click", openPaymentModal);
document.getElementById("closePaymentModal").addEventListener("click", closePaymentModal);
document.getElementById("cancelPaymentBtn").addEventListener("click", closePaymentModal);
document.getElementById("paymentForm").addEventListener("submit", createPayment);

document.getElementById("closeDetailsModal").addEventListener("click", () => {
    detailsModal.classList.remove("show");
});

document.getElementById("closeStatusModal").addEventListener("click", closeStatusModal);
document.getElementById("cancelStatusBtn").addEventListener("click", closeStatusModal);
document.getElementById("statusForm").addEventListener("submit", updatePaymentStatus);

document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderPayments();
});

document.getElementById("statusFilter").addEventListener("change", () => {
    currentPage = 1;
    renderPayments();
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderPayments();
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredPayments().length / pageSize));

    if (currentPage < totalPages) {
        currentPage++;
        renderPayments();
    }
});

tableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const { action, id } = button.dataset;

    if (action === "view") {
        showPaymentDetails(id);
    }

    if (action === "status") {
        openStatusModal(id);
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    window.location.href = "../index.html";
});

[paymentModal, detailsModal, statusModal].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });
});

loadPayments();