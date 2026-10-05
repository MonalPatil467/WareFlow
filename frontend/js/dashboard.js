const API_BASE_URL = "http://localhost:8080";

const token = localStorage.getItem("wareflow_token");

if (!token) {
    window.location.href = "index.html";
}

const user = JSON.parse(
    localStorage.getItem("wareflow_user") || "null"
);

const sidebarUserName =
    document.getElementById("sidebarUserName");

const sidebarUserRole =
    document.getElementById("sidebarUserRole");

const profileName =
    document.getElementById("profileName");

const profileRole =
    document.getElementById("profileRole");

const userAvatar =
    document.getElementById("userAvatar");

const profileAvatar =
    document.getElementById("profileAvatar");

const welcomeText =
    document.getElementById("welcomeText");

const logoutButton =
    document.getElementById("logoutButton");

const menuButton =
    document.getElementById("menuButton");

const sidebar =
    document.getElementById("sidebar");


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
        return "";
    }

    return (
        user.role ||
        user.roles?.[0] ||
        ""
    );

}


function getInitials(name) {

    if (!name) {
        return "U";
    }

    const words = name.trim().split(" ");

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
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

    sidebarUserName.textContent = name;

    sidebarUserRole.textContent = role;

    profileName.textContent = name;

    profileRole.textContent = role;

    userAvatar.textContent = initials;

    profileAvatar.textContent = initials;

    welcomeText.textContent =
        `Welcome back, ${name}`;

}


function setupRoleMenu() {

    const role = getUserRole();

    const companyMenu =
        document.querySelectorAll(".super-admin");

    const inventoryMenu =
        document.querySelectorAll(".inventory-menu");

    const ordersMenu =
        document.querySelectorAll(".orders-menu");

    const paymentMenu =
        document.querySelectorAll(".payment-menu");


    if (role !== "SUPER_ADMIN") {

        companyMenu.forEach(item => {
            item.style.display = "none";
        });

    }


    if (role === "WORKER") {

        document
            .querySelectorAll(".inventory-menu")
            .forEach(item => {

                const text =
                    item.textContent.trim();

                if (
                    !text.includes("Inventory") &&
                    !text.includes("Products")
                ) {
                    item.style.display = "none";
                }

            });

        paymentMenu.forEach(item => {
            item.style.display = "none";
        });

    }


    if (
        role === "MANAGER" ||
        role === "WORKER"
    ) {

        paymentMenu.forEach(item => {
            item.style.display = "none";
        });

    }

}


async function apiRequest(
    endpoint,
    options = {}
) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    headers["Authorization"] =
        `Bearer ${token}`;

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401 ||
        response.status === 403) {

        localStorage.removeItem(
            "wareflow_token"
        );

        localStorage.removeItem(
            "wareflow_user"
        );

        window.location.href =
            "index.html";

        return null;
    }

    return response;
}


async function loadDashboardData() {

    try {

        const productsResponse =
            await apiRequest(
                "/api/products"
            );

        if (productsResponse &&
            productsResponse.ok) {

            const products =
                await productsResponse.json();

            if (Array.isArray(products)) {

                document.getElementById(
                    "totalProducts"
                ).textContent =
                    products.length;

            }

        }

    } catch (error) {

        console.error(error);

    }


    try {

        const warehouseResponse =
            await apiRequest(
                "/api/warehouses"
            );

        if (
            warehouseResponse &&
            warehouseResponse.ok
        ) {

            const warehouses =
                await warehouseResponse.json();

            if (Array.isArray(warehouses)) {

                document.getElementById(
                    "totalWarehouses"
                ).textContent =
                    warehouses.length;

            }

        }

    } catch (error) {

        console.error(error);

    }


    try {

        const orderResponse =
            await apiRequest(
                "/api/orders"
            );

        if (
            orderResponse &&
            orderResponse.ok
        ) {

            const orders =
                await orderResponse.json();

            if (Array.isArray(orders)) {

                document.getElementById(
                    "totalOrders"
                ).textContent =
                    orders.length;

                renderOrders(orders);

            }

        }

    } catch (error) {

        console.error(error);

    }

}


function renderOrders(orders) {

    const container =
        document.getElementById(
            "recentOrders"
        );

    if (!orders.length) {

        container.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    No orders available
                </td>
            </tr>
        `;

        return;
    }


    const recent =
        orders.slice(0, 5);


    container.innerHTML =
        recent.map(order => {

            return `
                <tr>
                    <td>
                        ${order.orderNumber ||
                          order.id ||
                          "-"}
                    </td>

                    <td>
                        ${order.status || "-"}
                    </td>

                    <td>
                        ${order.totalAmount ||
                          order.total ||
                          "0"}
                    </td>

                    <td>
                        ${order.createdAt
                            ? new Date(
                                order.createdAt
                              ).toLocaleDateString()
                            : "-"}
                    </td>
                </tr>
            `;

        }).join("");

}


function logout() {

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
        "index.html";

}


logoutButton.addEventListener(
    "click",
    logout
);


menuButton.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle("open");

    }
);


setupUser();

setupRoleMenu();

loadDashboardData();