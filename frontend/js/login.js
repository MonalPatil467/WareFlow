
const API_BASE_URL = "http://localhost:8080";



const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");

const loginError =
    document.getElementById("loginError");

const loginButton =
    document.getElementById("loginButton");

const buttonText =
    document.getElementById("buttonText");

const loader =
    document.getElementById("loader");

const togglePassword =
    document.getElementById("togglePassword");



togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "🙈";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "👁";

    }

});



function clearErrors() {

    emailError.textContent = "";

    passwordError.textContent = "";

    loginError.textContent = "";

    loginError.style.display = "none";

}



function isValidEmail(email) {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);

}


function validateForm() {

    clearErrors();

    let valid = true;

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    // Email validation

    if (email === "") {

        emailError.textContent =
            "Email is required.";

        valid = false;

    } else if (!isValidEmail(email)) {

        emailError.textContent =
            "Please enter a valid email address.";

        valid = false;

    }


    // Password validation

    if (password === "") {

        passwordError.textContent =
            "Password is required.";

        valid = false;

    }


    return valid;

}



function setLoading(isLoading) {

    if (isLoading) {

        loginButton.disabled = true;

        buttonText.style.display = "none";

        loader.style.display = "inline-block";

    } else {

        loginButton.disabled = false;

        buttonText.style.display = "inline";

        loader.style.display = "none";

    }

}



loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // Validate form

        if (!validateForm()) {

            return;

        }


        // Get values

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        // Request body

        const loginData = {

            email: email,

            password: password

        };


        setLoading(true);


        try {


            const response = await fetch(
                `${API_BASE_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(loginData)
                }
            );


            // Try to read JSON response

            const data =
                await response.json();



            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Invalid email or password."
                );

            }



            localStorage.setItem(
                "wareflow_token",
                data.token
            );




            if (data.user) {

                localStorage.setItem(
                    "wareflow_user",
                    JSON.stringify(data.user)
                );

            }



            if (data.message) {

                localStorage.setItem(
                    "wareflow_message",
                    data.message
                );

            }



            window.location.href =
                "dashboard.html";


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            loginError.textContent =
                error.message ||
                "Unable to login. Please try again.";


            loginError.style.display =
                "block";


        } finally {

            setLoading(false);

        }

    }
);