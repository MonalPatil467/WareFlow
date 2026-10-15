const API_BASE_URL = "http://localhost:8090";

const API_ROUTES = {
    products: "/api/products",
    categories: "/api/categories",
    suppliers: "/api/suppliers"
};

const token = localStorage.getItem("wareflow_token");

if (!token) {
    window.location.replace("../index.html");
}

let user = null;

try {
    user = JSON.parse(localStorage.getItem("wareflow_user") || "null");
} catch {
    user = null;
}

let products = [];
let categories = [];
let suppliers = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let statusFilter = "all";
let editingProductId = null;

const getElement = id => document.getElementById(id);

const productTableBody = getElement("productTableBody");
const emptyState = getElement("emptyState");
const searchInput = getElement("searchInput");
const statusFilterInput = getElement("statusFilter");
const pageSizeInput = getElement("pageSize");
const previousButton = getElement("previousButton");
const nextButton = getElement("nextButton");
const pageNumbers = getElement("pageNumbers");
const paginationInfo = getElement("paginationInfo");
const productModal = getElement("productModal");
const productForm = getElement("productForm");
const modalTitle = getElement("modalTitle");
const modalSubtitle = getElement("modalSubtitle");
const formError = getElement("formError");
const saveButton = getElement("saveButton");
const addProductButton = getElement("addProductButton");
const closeModal = getElement("closeModal");
const cancelButton = getElement("cancelButton");
const logoutButton = getElement("logoutButton");
const menuButton = getElement("menuButton");
const sidebar = getElement("sidebar");
const toast = getElement("toast");

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showToast(message, isError = false) {
    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    window.setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showFormError(message) {
    if (!formError) return;

    formError.textContent = message;
    formError.style.display = "block";
}

function clearFormError() {
    if (!formError) return;

    formError.textContent = "";
    formError.style.display = "none";
}

function logout() {
    localStorage.removeItem("wareflow_token");
    localStorage.removeItem("wareflow_user");
    localStorage.removeItem("wareflow_message");

    window.location.replace("../index.html");
}

async function apiRequest(endpoint, options = {}) {
    if (!token) {
        logout();
        throw new Error("Please log in to continue.");
    }

    const headers = {
        Accept: "application/json",
        ...options.headers,
        Authorization: `Bearer ${token}`
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error("You do not have permission to perform this action.");
    }

    return response;
}

async function getResponseData(response) {
    if (!response) return null;

    const text = await response.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

function getErrorMessage(data, fallback) {
    if (data && typeof data === "object") {
        return data.message || data.error || fallback;
    }

    return fallback;
}

function getUserName() {
    return user?.name ||
        user?.fullName ||
        user?.firstName ||
        user?.username ||
        user?.email ||
        "User";
}

function getUserRole() {
    const role = user?.role || user?.roles?.[0] || "USER";

    return typeof role === "string" ? role : "USER";
}

function getInitials(name) {
    const words = String(name || "User")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) return "U";

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function setupUser() {
    const name = getUserName();
    const role = getUserRole();
    const initials = getInitials(name);

    const values = {
        userName: name,
        userRole: role,
        profileName: name,
        profileRole: role,
        userAvatar: initials,
        profileAvatar: initials
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    });
}

async function loadList(endpoint) {
    const response = await apiRequest(endpoint);
    const data = await getResponseData(response);

    if (!response.ok) {
        throw new Error(
            getErrorMessage(data, `Unable to load data (${response.status}).`)
        );
    }

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

async function loadProducts() {
    try {
        products = await loadList(API_ROUTES.products);

        updateStats();
        renderProducts();
    } catch (error) {
        console.error("Products loading error:", error);
        showToast(error.message || "Unable to load products.", true);
    }
}

async function loadCategories() {
    try {
        categories = await loadList(API_ROUTES.categories);
        populateCategories();
        renderProducts();
    } catch (error) {
        console.error("Categories loading error:", error);
        showToast(error.message || "Unable to load categories.", true);
    }
}

async function loadSuppliers() {
    try {
        suppliers = await loadList(API_ROUTES.suppliers);
        populateSuppliers();
        renderProducts();
    } catch (error) {
        console.error("Suppliers loading error:", error);
        showToast(error.message || "Unable to load suppliers.", true);
    }
}

function getCategoryId(category) {
    return category.id ?? category.categoryId;
}

function getCategoryName(category) {
    return category.categoryName ||
        category.name ||
        category.category ||
        `Category ${getCategoryId(category)}`;
}

function getSupplierId(supplier) {
    return supplier.id ?? supplier.supplierId;
}

function getSupplierName(supplier) {
    return supplier.supplierName ||
        supplier.name ||
        supplier.companyName ||
        `Supplier ${getSupplierId(supplier)}`;
}

function populateSelect(selectId, items, getId, getName, placeholder) {
    const select = getElement(selectId);

    if (!select) return;

    const selectedValue = select.value;

    select.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);

    items.forEach(item => {
        const option = document.createElement("option");
        option.value = getId(item);
        option.textContent = getName(item);
        select.appendChild(option);
    });

    if (selectedValue) {
        select.value = selectedValue;
    }
}

function populateCategories() {
    populateSelect(
        "categoryId",
        categories,
        getCategoryId,
        getCategoryName,
        "Select category"
    );
}

function populateSuppliers() {
    populateSelect(
        "supplierId",
        suppliers,
        getSupplierId,
        getSupplierName,
        "Select supplier"
    );
}

function getCategoryNameById(id) {
    const category = categories.find(
        item => String(getCategoryId(item)) === String(id)
    );

    return category ? getCategoryName(category) : "-";
}

function getSupplierNameById(id) {
    const supplier = suppliers.find(
        item => String(getSupplierId(item)) === String(id)
    );

    return supplier ? getSupplierName(supplier) : "-";
}

function isActive(product) {
    return product.active !== false && product.active !== "false";
}

function updateStats() {
    const activeCount = products.filter(isActive).length;

    const values = {
        totalProducts: products.length,
        activeProducts: activeCount,
        inactiveProducts: products.length - activeCount
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    });
}

function getFilteredProducts() {
    return products.filter(product => {
        const searchable = [
            product.productName,
            product.sku,
            product.brand,
            product.categoryName,
            product.supplierName,
            getCategoryNameById(product.categoryId),
            getSupplierNameById(product.supplierId)
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchable.includes(searchTerm.toLowerCase());

        const active = isActive(product);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && active) ||
            (statusFilter === "inactive" && !active);

        return matchesSearch && matchesStatus;
    });
}

function formatPrice(price) {
    const number = Number(price ?? 0);

    if (!Number.isFinite(number)) return "0.00";

    return number.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function renderProducts() {
    if (!productTableBody) return;

    const filtered = getFilteredProducts();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * pageSize;
    const visibleProducts = filtered.slice(start, start + pageSize);

    productTableBody.replaceChildren();

    if (emptyState) {
        emptyState.style.display = visibleProducts.length ? "none" : "block";
    }

    const tableWrapper = document.querySelector(".table-wrapper");

    if (tableWrapper) {
        tableWrapper.style.display = visibleProducts.length ? "block" : "none";
    }

    visibleProducts.forEach(product => {
        const row = document.createElement("tr");
        const active = isActive(product);
        const productId = Number(product.id ?? product.productId);

        const nameCell = document.createElement("td");
        const name = document.createElement("div");
        name.className = "product-name";
        name.textContent = product.productName || "-";

        const unit = document.createElement("div");
        unit.className = "product-unit";
        unit.textContent = product.unit || "-";

        nameCell.append(name, unit);

        const values = [
            product.sku || "-",
            product.brand || "-",
            product.categoryName || getCategoryNameById(product.categoryId),
            product.supplierName || getSupplierNameById(product.supplierId),
            `₹${formatPrice(product.price)}`
        ];

        row.appendChild(nameCell);

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `status ${active ? "active" : "inactive"}`;
        status.textContent = active ? "Active" : "Inactive";
        statusCell.appendChild(status);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-button";
        editButton.textContent = "✎";
        editButton.setAttribute("aria-label", "Edit product");
        editButton.addEventListener("click", () => {
            window.editProduct(productId);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-button delete";
        deleteButton.textContent = "🗑";
        deleteButton.setAttribute("aria-label", "Delete product");
        deleteButton.addEventListener("click", () => {
            window.deleteProduct(productId);
        });

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        productTableBody.appendChild(row);
    });

    renderPagination(filtered.length, totalPages, start, visibleProducts.length);
}

function renderPagination(total, totalPages, start, visibleCount) {
    if (paginationInfo) {
        paginationInfo.textContent = total
            ? `Showing ${start + 1}-${start + visibleCount} of ${total}`
            : "Showing 0 of 0";
    }

    if (previousButton) {
        previousButton.disabled = currentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages || total === 0;
    }

    if (!pageNumbers) return;

    pageNumbers.replaceChildren();

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "page-number";
        button.textContent = page;

        if (page === currentPage) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }

        button.addEventListener("click", () => {
            currentPage = page;
            renderProducts();
        });

        pageNumbers.appendChild(button);
    }
}

function setModalVisibility(show) {
    if (!productModal) return;

    productModal.classList.toggle("show", show);
    productModal.setAttribute("aria-hidden", String(!show));
}

function openAddModal() {
    if (!productForm) return;

    editingProductId = null;
    productForm.reset();
    clearFormError();

    const productIdInput = getElement("productId");

    if (productIdInput) {
        productIdInput.value = "";
    }

    if (modalTitle) modalTitle.textContent = "Add Product";
    if (modalSubtitle) modalSubtitle.textContent = "Create a new product";
    if (saveButton) saveButton.textContent = "Save Product";

    document.querySelectorAll(".create-only").forEach(element => {
        element.style.display = "";
    });

    document.querySelectorAll(".edit-only").forEach(element => {
        element.style.display = "none";
    });

    setModalVisibility(true);
}

function openEditModal(product) {
    if (!productForm) return;

    editingProductId = product.id ?? product.productId;
    productForm.reset();
    clearFormError();

    const values = {
        productId: editingProductId,
        productName: product.productName || "",
        sku: product.sku || "",
        brand: product.brand || "",
        price: product.price ?? "",
        unit: product.unit || "",
        categoryId: product.categoryId ?? "",
        supplierId: product.supplierId ?? "",
        active: String(isActive(product))
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = getElement(id);

        if (element) {
            element.value = value;
        }
    });

    if (modalTitle) modalTitle.textContent = "Edit Product";
    if (modalSubtitle) modalSubtitle.textContent = "Update product information";
    if (saveButton) saveButton.textContent = "Update Product";

    document.querySelectorAll(".create-only").forEach(element => {
        element.style.display = "none";
    });

    document.querySelectorAll(".edit-only").forEach(element => {
        element.style.display = "";
    });

    setModalVisibility(true);
}

window.editProduct = function (id) {
    const product = products.find(
        item => String(item.id ?? item.productId) === String(id)
    );

    if (product) {
        openEditModal(product);
    }
};

window.deleteProduct = async function (id) {
    const product = products.find(
        item => String(item.id ?? item.productId) === String(id)
    );

    if (!product) {
        showToast("Product not found.", true);
        return;
    }

    if (!window.confirm(`Delete "${product.productName}"?`)) {
        return;
    }

    try {
        const response = await apiRequest(
            `${API_ROUTES.products}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        const data = await getResponseData(response);

        if (!response.ok) {
            throw new Error(
                getErrorMessage(data, "Unable to delete product.")
            );
        }

        showToast("Product deleted successfully.");

        await loadProducts();
    } catch (error) {
        console.error("Delete product error:", error);
        showToast(error.message || "Unable to delete product.", true);
    }
};

async function saveProduct() {
    clearFormError();

    const productName = getElement("productName")?.value.trim() || "";
    const sku = getElement("sku")?.value.trim() || "";
    const brand = getElement("brand")?.value.trim() || "";
    const priceValue = getElement("price")?.value ?? "";
    const unit = getElement("unit")?.value.trim() || "";
    const categoryIdValue = getElement("categoryId")?.value || "";
    const supplierIdValue = getElement("supplierId")?.value || "";

    if (
        !productName ||
        !sku ||
        !brand ||
        priceValue === "" ||
        !unit ||
        !categoryIdValue ||
        !supplierIdValue
    ) {
        showFormError("Please fill in all required product fields.");
        return;
    }

    const price = Number(priceValue);
    const categoryId = Number(categoryIdValue);
    const supplierId = Number(supplierIdValue);

    if (!Number.isFinite(price) || price < 0) {
        showFormError("Enter a valid non-negative price.");
        return;
    }

    if (
        !Number.isSafeInteger(categoryId) ||
        !Number.isSafeInteger(supplierId)
    ) {
        showFormError("Select a valid category and supplier.");
        return;
    }

    const isEditing = editingProductId !== null;

    const payload = {
        productName,
        sku,
        brand,
        price,
        unit,
        categoryId,
        supplierId
    };

    let endpoint = API_ROUTES.products;
    let method = "POST";

    if (isEditing) {
        endpoint += `/${encodeURIComponent(editingProductId)}`;
        method = "PUT";

        const activeInput = getElement("active");

        if (activeInput) {
            payload.active = activeInput.value === "true";
        }
    } else {
        const quantityValue = getElement("quantity")?.value ?? "";
        const reorderLevelValue = getElement("reorderLevel")?.value ?? "";
        const maximumStockValue = getElement("maximumStock")?.value ?? "";
        const warehouseLocation =
            getElement("warehouseLocation")?.value.trim() || "";

        if (
            quantityValue === "" ||
            reorderLevelValue === "" ||
            maximumStockValue === "" ||
            !warehouseLocation
        ) {
            showFormError(
                "Please fill in quantity, reorder level, maximum stock, and warehouse location."
            );
            return;
        }

        const quantity = Number(quantityValue);
        const reorderLevel = Number(reorderLevelValue);
        const maximumStock = Number(maximumStockValue);

        if (
            !Number.isFinite(quantity) || quantity < 0 ||
            !Number.isFinite(reorderLevel) || reorderLevel < 0 ||
            !Number.isFinite(maximumStock) || maximumStock < 0
        ) {
            showFormError("Stock values must be valid non-negative numbers.");
            return;
        }

        payload.quantity = quantity;
        payload.reorderLevel = reorderLevel;
        payload.maximumStock = maximumStock;
        payload.warehouseLocation = warehouseLocation;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = isEditing ? "Updating..." : "Saving...";
    }

    try {
        const response = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(payload)
        });

        const data = await getResponseData(response);

        if (!response.ok) {
            throw new Error(
                getErrorMessage(data, "Unable to save product.")
            );
        }

        closeProductModal();

        showToast(
            isEditing
                ? "Product updated successfully."
                : "Product created successfully."
        );

        await loadProducts();
    } catch (error) {
        console.error("Save product error:", error);
        showFormError(error.message || "Unable to save product.");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = editingProductId !== null
                ? "Update Product"
                : "Save Product";
        }
    }
}

function closeProductModal() {
    setModalVisibility(false);

    if (productForm) {
        productForm.reset();
    }

    editingProductId = null;
    clearFormError();
}

if (searchInput) {
    searchInput.addEventListener("input", event => {
        searchTerm = event.target.value;
        currentPage = 1;
        renderProducts();
    });
}

if (statusFilterInput) {
    statusFilterInput.addEventListener("change", event => {
        statusFilter = event.target.value;
        currentPage = 1;
        renderProducts();
    });
}

if (pageSizeInput) {
    pageSizeInput.addEventListener("change", event => {
        const value = Number(event.target.value);

        if (Number.isSafeInteger(value) && value > 0) {
            pageSize = value;
            currentPage = 1;
            renderProducts();
        }
    });
}

if (previousButton) {
    previousButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
        }
    });
}

if (nextButton) {
    nextButton.addEventListener("click", () => {
        const totalPages = Math.ceil(getFilteredProducts().length / pageSize);

        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
        }
    });
}

if (addProductButton) {
    addProductButton.addEventListener("click", openAddModal);
}

if (closeModal) {
    closeModal.addEventListener("click", closeProductModal);
}

if (cancelButton) {
    cancelButton.addEventListener("click", closeProductModal);
}

if (productModal) {
    productModal.addEventListener("click", event => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });
}

if (productForm) {
    productForm.addEventListener("submit", event => {
        event.preventDefault();
        saveProduct();
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

setupUser();

if (token) {
    loadCategories();
    loadSuppliers();
    loadProducts();
}