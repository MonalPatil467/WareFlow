const API_BASE_URL = "http://localhost:8080";

const token = localStorage.getItem("wareflow_token");

if (!token) {
    window.location.href = "../index.html";
}

const user = JSON.parse(
    localStorage.getItem("wareflow_user") || "null"
);

let products = [];
let categories = [];
let suppliers = [];

let currentPage = 1;
let pageSize = 10;
let searchTerm = "";
let statusFilter = "all";
let editingProductId = null;


const productTableBody =
    document.getElementById("productTableBody");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const statusFilterInput =
    document.getElementById("statusFilter");

const pageSizeInput =
    document.getElementById("pageSize");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const pageNumbers =
    document.getElementById("pageNumbers");

const paginationInfo =
    document.getElementById("paginationInfo");

const productModal =
    document.getElementById("productModal");

const productForm =
    document.getElementById("productForm");

const modalTitle =
    document.getElementById("modalTitle");

const modalSubtitle =
    document.getElementById("modalSubtitle");

const formError =
    document.getElementById("formError");

const saveButton =
    document.getElementById("saveButton");

const addProductButton =
    document.getElementById("addProductButton");

const closeModal =
    document.getElementById("closeModal");

const cancelButton =
    document.getElementById("cancelButton");

const logoutButton =
    document.getElementById("logoutButton");

const menuButton =
    document.getElementById("menuButton");

const sidebar =
    document.getElementById("sidebar");

const toast =
    document.getElementById("toast");


function authHeaders() {

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

}


async function apiRequest(
    endpoint,
    options = {}
) {

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers: {
                ...authHeaders(),
                ...(options.headers || {})
            }
        }
    );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "wareflow_token"
        );

        localStorage.removeItem(
            "wareflow_user"
        );

        window.location.href =
            "../index.html";

        return null;
    }


    return response;

}


async function getResponseData(response) {

    if (!response) {
        return null;
    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }

}


function showToast(
    message,
    isError = false
) {

    toast.textContent = message;

    toast.classList.toggle(
        "error",
        isError
    );

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


function getUserName() {

    if (!user) {
        return "User";
    }

    return (
        user.name ||
        user.fullName ||
        user.username ||
        user.email ||
        "User"
    );

}


function getUserRole() {

    if (!user) {
        return "USER";
    }

    return (
        user.role ||
        user.roles?.[0] ||
        "USER"
    );

}


function getInitials(name) {

    if (!name) {
        return "U";
    }

    const words = name.trim().split(" ");

    if (words.length === 1) {
        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


function setupUser() {

    const name = getUserName();

    const role = getUserRole();

    const initials = getInitials(name);

    document.getElementById(
        "userName"
    ).textContent = name;

    document.getElementById(
        "userRole"
    ).textContent = role;

    document.getElementById(
        "profileName"
    ).textContent = name;

    document.getElementById(
        "profileRole"
    ).textContent = role;

    document.getElementById(
        "userAvatar"
    ).textContent = initials;

    document.getElementById(
        "profileAvatar"
    ).textContent = initials;

}


async function loadProducts() {

    try {

        const response =
            await apiRequest(
                "/api/products"
            );

        if (!response) {
            return;
        }

        const data =
            await getResponseData(response);

        if (!response.ok) {

            throw new Error(
                data?.message ||
                "Unable to load products."
            );

        }

        products =
            Array.isArray(data)
                ? data
                : [];

        updateStats();

        renderProducts();

    } catch (error) {

        showToast(
            error.message,
            true
        );

    }

}


async function loadCategories() {

    try {

        const response =
            await apiRequest(
                "/api/categories"
            );

        if (!response) {
            return;
        }

        const data =
            await getResponseData(response);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                "Unable to load categories."
            );
        }

        categories =
            Array.isArray(data)
                ? data
                : [];

        populateCategories();

    } catch (error) {

        showToast(
            error.message,
            true
        );

    }

}


async function loadSuppliers() {

    try {

        const response =
            await apiRequest(
                "/api/suppliers"
            );

        if (!response) {
            return;
        }

        const data =
            await getResponseData(response);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                "Unable to load suppliers."
            );
        }

        suppliers =
            Array.isArray(data)
                ? data
                : [];

        populateSuppliers();

    } catch (error) {

        showToast(
            error.message,
            true
        );

    }

}


function getCategoryId(category) {

    return category.id;

}


function getCategoryName(category) {

    return (
        category.categoryName ||
        category.name ||
        category.category ||
        `Category ${category.id}`
    );

}


function getSupplierId(supplier) {

    return supplier.id;

}


function getSupplierName(supplier) {

    return (
        supplier.supplierName ||
        supplier.name ||
        supplier.companyName ||
        `Supplier ${supplier.id}`
    );

}


function populateCategories() {

    const select =
        document.getElementById(
            "categoryId"
        );

    select.innerHTML = `
        <option value="">
            Select category
        </option>
    `;


    categories.forEach(category => {

        const option =
            document.createElement("option");

        option.value =
            getCategoryId(category);

        option.textContent =
            getCategoryName(category);

        select.appendChild(option);

    });

}


function populateSuppliers() {

    const select =
        document.getElementById(
            "supplierId"
        );

    select.innerHTML = `
        <option value="">
            Select supplier
        </option>
    `;


    suppliers.forEach(supplier => {

        const option =
            document.createElement("option");

        option.value =
            getSupplierId(supplier);

        option.textContent =
            getSupplierName(supplier);

        select.appendChild(option);

    });

}


function getCategoryNameById(id) {

    const category =
        categories.find(
            item => Number(item.id) === Number(id)
        );

    return category
        ? getCategoryName(category)
        : "-";

}


function getSupplierNameById(id) {

    const supplier =
        suppliers.find(
            item => Number(item.id) === Number(id)
        );

    return supplier
        ? getSupplierName(supplier)
        : "-";

}


function updateStats() {

    const active =
        products.filter(
            product => product.active
        ).length;

    document.getElementById(
        "totalProducts"
    ).textContent =
        products.length;

    document.getElementById(
        "activeProducts"
    ).textContent =
        active;

    document.getElementById(
        "inactiveProducts"
    ).textContent =
        products.length - active;

}


function getFilteredProducts() {

    return products.filter(product => {

        const searchable =
            [
                product.productName,
                product.sku,
                product.brand,
                product.categoryName,
                product.supplierName
            ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


        const matchesSearch =
            searchable.includes(
                searchTerm.toLowerCase()
            );


        const matchesStatus =
            statusFilter === "all" ||
            (
                statusFilter === "active" &&
                product.active
            ) ||
            (
                statusFilter === "inactive" &&
                !product.active
            );


        return (
            matchesSearch &&
            matchesStatus
        );

    });

}


function renderProducts() {

    const filtered =
        getFilteredProducts();

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filtered.length / pageSize
            )
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const start =
        (currentPage - 1) * pageSize;

    const end =
        start + pageSize;

    const visibleProducts =
        filtered.slice(start, end);


    productTableBody.innerHTML = "";


    if (!visibleProducts.length) {

        emptyState.style.display =
            "block";

        document.querySelector(
            ".table-wrapper"
        ).style.display = "none";

    } else {

        emptyState.style.display =
            "none";

        document.querySelector(
            ".table-wrapper"
        ).style.display = "block";


        visibleProducts.forEach(
            product => {

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td>
                        <div class="product-name">
                            ${escapeHtml(
                                product.productName || "-"
                            )}
                        </div>

                        <div class="product-unit">
                            ${escapeHtml(
                                product.unit || "-"
                            )}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(
                            product.sku || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            product.brand || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            product.categoryName ||
                            getCategoryNameById(
                                product.categoryId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            product.supplierName ||
                            getSupplierNameById(
                                product.supplierId
                            )
                        )}
                    </td>

                    <td>
                        ₹${formatPrice(
                            product.price
                        )}
                    </td>

                    <td>

                        <span class="status ${
                            product.active
                                ? "active"
                                : "inactive"
                        }">

                            ${
                                product.active
                                    ? "Active"
                                    : "Inactive"
                            }

                        </span>

                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button"
                                onclick="editProduct(
                                    ${product.id}
                                )">

                                ✎

                            </button>

                            <button
                                class="action-button delete"
                                onclick="deleteProduct(
                                    ${product.id}
                                )">

                                🗑

                            </button>

                        </div>

                    </td>
                `;


                productTableBody.appendChild(
                    row
                );

            }
        );

    }


    renderPagination(
        filtered.length,
        totalPages,
        start,
        visibleProducts.length
    );

}


function renderPagination(
    total,
    totalPages,
    start,
    visibleCount
) {

    if (total === 0) {

        paginationInfo.textContent =
            "Showing 0 of 0";

    } else {

        paginationInfo.textContent =
            `Showing ${start + 1}-${start + visibleCount} of ${total}`;

    }


    previousButton.disabled =
        currentPage === 1;

    nextButton.disabled =
        currentPage === totalPages;


    pageNumbers.innerHTML = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.className =
            "page-number";

        if (page === currentPage) {
            button.classList.add("active");
        }

        button.textContent = page;

        button.addEventListener(
            "click",
            () => {

                currentPage = page;

                renderProducts();

            }
        );

        pageNumbers.appendChild(
            button
        );

    }

}


function formatPrice(price) {

    const number =
        Number(price || 0);

    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function openAddModal() {

    editingProductId = null;

    productForm.reset();

    document.getElementById(
        "productId"
    ).value = "";

    modalTitle.textContent =
        "Add Product";

    modalSubtitle.textContent =
        "Create a new product";

    saveButton.textContent =
        "Save Product";


    document
        .querySelectorAll(".create-only")
        .forEach(element => {

            element.style.display =
                "flex";

        });


    document
        .querySelectorAll(".edit-only")
        .forEach(element => {

            element.style.display =
                "none";

        });


    formError.style.display =
        "none";

    productModal.classList.add("show");

}


function openEditModal(product) {

    editingProductId =
        product.id;

    document.getElementById(
        "productId"
    ).value =
        product.id;

    document.getElementById(
        "productName"
    ).value =
        product.productName || "";

    document.getElementById(
        "sku"
    ).value =
        product.sku || "";

    document.getElementById(
        "brand"
    ).value =
        product.brand || "";

    document.getElementById(
        "price"
    ).value =
        product.price ?? "";

    document.getElementById(
        "unit"
    ).value =
        product.unit || "";

    document.getElementById(
        "categoryId"
    ).value =
        product.categoryId || "";

    document.getElementById(
        "supplierId"
    ).value =
        product.supplierId || "";

    document.getElementById(
        "active"
    ).value =
        String(product.active);


    modalTitle.textContent =
        "Edit Product";

    modalSubtitle.textContent =
        "Update product information";

    saveButton.textContent =
        "Update Product";


    document
        .querySelectorAll(".create-only")
        .forEach(element => {

            element.style.display =
                "none";

        });


    document
        .querySelectorAll(".edit-only")
        .forEach(element => {

            element.style.display =
                "flex";

        });


    formError.style.display =
        "none";

    productModal.classList.add(
        "show"
    );

}


window.editProduct = function(id) {

    const product =
        products.find(
            item => Number(item.id) === Number(id)
        );

    if (!product) {
        return;
    }

    openEditModal(product);

};


window.deleteProduct = async function(id) {

    const product =
        products.find(
            item => Number(item.id) === Number(id)
        );

    if (!product) {
        return;
    }


    const confirmed =
        window.confirm(
            `Delete "${product.productName}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await apiRequest(
                `/api/products/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response) {
            return;
        }


        if (!response.ok) {

            const data =
                await getResponseData(response);

            throw new Error(
                data?.message ||
                "Unable to delete product."
            );

        }


        showToast(
            "Product deleted successfully."
        );

        await loadProducts();

    } catch (error) {

        showToast(
            error.message,
            true
        );

    }

};


async function saveProduct() {

    formError.style.display =
        "none";

    const productName =
        document.getElementById(
            "productName"
        ).value.trim();

    const sku =
        document.getElementById(
            "sku"
        ).value.trim();

    const brand =
        document.getElementById(
            "brand"
        ).value.trim();

    const price =
        document.getElementById(
            "price"
        ).value;

    const unit =
        document.getElementById(
            "unit"
        ).value.trim();

    const categoryId =
        document.getElementById(
            "categoryId"
        ).value;

    const supplierId =
        document.getElementById(
            "supplierId"
        ).value;


    if (
        !productName ||
        !sku ||
        !brand ||
        !price ||
        !unit ||
        !categoryId ||
        !supplierId
    ) {

        formError.textContent =
            "Please fill all required fields.";

        formError.style.display =
            "block";

        return;

    }


    saveButton.disabled = true;

    saveButton.textContent =
        editingProductId
            ? "Updating..."
            : "Saving...";


    try {

        let payload;

        let endpoint;

        let method;


        if (editingProductId) {

            payload = {

                productName,

                sku,

                brand,

                price: Number(price),

                unit,

                categoryId:
                    Number(categoryId),

                supplierId:
                    Number(supplierId),

                active:
                    document.getElementById(
                        "active"
                    ).value === "true"

            };


            endpoint =
                `/api/products/${editingProductId}`;

            method = "PUT";

        } else {

            const quantity =
                document.getElementById(
                    "quantity"
                ).value;

            const reorderLevel =
                document.getElementById(
                    "reorderLevel"
                ).value;

            const maximumStock =
                document.getElementById(
                    "maximumStock"
                ).value;

            const warehouseLocation =
                document.getElementById(
                    "warehouseLocation"
                ).value.trim();


            if (
                quantity === "" ||
                reorderLevel === "" ||
                maximumStock === "" ||
                !warehouseLocation
            ) {

                throw new Error(
                    "Please fill all required fields."
                );

            }


            payload = {

                productName,

                sku,

                brand,

                price: Number(price),

                unit,

                categoryId:
                    Number(categoryId),

                supplierId:
                    Number(supplierId),

                quantity:
                    Number(quantity),

                reorderLevel:
                    Number(reorderLevel),

                maximumStock:
                    Number(maximumStock),

                warehouseLocation

            };


            endpoint =
                "/api/products";

            method = "POST";

        }


        const response =
            await apiRequest(
                endpoint,
                {
                    method,
                    body:
                        JSON.stringify(payload)
                }
            );


        if (!response) {
            return;
        }


        const data =
            await getResponseData(response);


        if (!response.ok) {

            throw new Error(
                data?.message ||
                "Unable to save product."
            );

        }


        closeProductModal();

        showToast(
            editingProductId
                ? "Product updated successfully."
                : "Product created successfully."
        );


        await loadProducts();


    } catch (error) {

        formError.textContent =
            error.message;

        formError.style.display =
            "block";

    } finally {

        saveButton.disabled =
            false;

        saveButton.textContent =
            editingProductId
                ? "Update Product"
                : "Save Product";

    }

}


function closeProductModal() {

    productModal.classList.remove(
        "show"
    );

    productForm.reset();

    editingProductId = null;

}


searchInput.addEventListener(
    "input",
    event => {

        searchTerm =
            event.target.value;

        currentPage = 1;

        renderProducts();

    }
);


statusFilterInput.addEventListener(
    "change",
    event => {

        statusFilter =
            event.target.value;

        currentPage = 1;

        renderProducts();

    }
);


pageSizeInput.addEventListener(
    "change",
    event => {

        pageSize =
            Number(event.target.value);

        currentPage = 1;

        renderProducts();

    }
);


previousButton.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            currentPage--;

            renderProducts();

        }

    }
);


nextButton.addEventListener(
    "click",
    () => {

        const total =
            getFilteredProducts().length;

        const totalPages =
            Math.ceil(
                total / pageSize
            );

        if (currentPage < totalPages) {

            currentPage++;

            renderProducts();

        }

    }
);


addProductButton.addEventListener(
    "click",
    openAddModal
);


closeModal.addEventListener(
    "click",
    closeProductModal
);


cancelButton.addEventListener(
    "click",
    closeProductModal
);


productModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            productModal
        ) {

            closeProductModal();

        }

    }
);


productForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        saveProduct();

    }
);


logoutButton.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "wareflow_token"
        );

        localStorage.removeItem(
            "wareflow_user"
        );

        localStorage.removeItem(
            "wareflow_message"
        );

        window.location.href =
            "../index.html";

    }
);


menuButton.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle(
            "open"
        );

    }
);


setupUser();

loadCategories();

loadSuppliers();

loadProducts();