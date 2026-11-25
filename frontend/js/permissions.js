(function () {

    var user = null;

    try {
        user = JSON.parse(localStorage.getItem("wareflow_user") || "null");
    } catch (e) {
        user = null;
    }

    var role = String((user && user.role) || "")
        .replace(/^ROLE_/, "")
        .toUpperCase();

    window.WF_USER = user;
    window.WF_ROLE = role;

    var page = (location.pathname.split("/").pop() || "").toLowerCase();


    var blocked = {
        WORKER: ["payments.html", "reports.html"],
        MANAGER: ["companies.html"],
        COMPANY_ADMIN: ["companies.html"]
    };

    if ((blocked[role] || []).indexOf(page) !== -1) {
        location.replace("../dashboard.html");
        return;
    }

    if (role !== "SUPER_ADMIN" && page === "companies.html") {
        location.replace("../dashboard.html");
        return;
    }

    var workerHidden = [
        "#addCategoryButton",
        "#addInventoryButton",
        "#addSupplierButton",
        "#addWarehouseBtn",
        "#addProductButton",
        "td .action-button",              // edit / delete icons (products, categories, ...)
        "td .action-btn[data-action='edit']",
        "td .action-btn[data-action='delete']",
        "td .action-btn[data-action='status']"
    ];

    var css = "body.role-worker " +
        workerHidden.join(", body.role-worker ") +
        " { display: none !important; }";

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    function apply() {
        if (!document.body) {
            return;
        }
        document.body.classList.add("role-" + role.toLowerCase().replace(/_/g, "-"));
        if (role === "WORKER") {
            document.body.classList.add("role-worker");
        }
    }

    if (document.body) {
        apply();
    } else {
        document.addEventListener("DOMContentLoaded", apply);
    }

})();