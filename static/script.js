/* ==========================================================================
   TRIPMATE AI — FRONTEND INTERACTIVITY & API INTEGRATION
   ========================================================================== */

let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";
let pendingPrompt = "";

/* --------------------------------------------------------------------------
   1. VIEW CONTROLLER (LANDING vs PLANNER STUDIO)
   -------------------------------------------------------------------------- */
function switchView(viewName) {
    const publicLandingView = document.getElementById("publicLandingView");
    const appPlannerView = document.getElementById("appPlannerView");
    const landingNavItems = document.querySelectorAll(".landing-only-nav");
    const plannerNavItems = document.querySelectorAll(".planner-only-nav");
    const user = getLoggedInUser();

    // If logged in, stay locked on Planner Studio view. Only logoutUser() returns to landing page.
    if (user || viewName === "planner") {
        if (!user) {
            openAuthModal("signup");
            return;
        }

        if (publicLandingView) publicLandingView.classList.add("hidden");
        if (appPlannerView) appPlannerView.classList.remove("hidden");

        landingNavItems.forEach(el => el.classList.add("hidden"));
        plannerNavItems.forEach(el => el.classList.remove("hidden"));

        const userWelcomeName = document.getElementById("userWelcomeName");
        if (userWelcomeName && user) {
            userWelcomeName.textContent = user.name || "Explorer";
        }

        if (pendingPrompt) {
            setPrompt(pendingPrompt);
            pendingPrompt = "";
        }

        window.scrollTo({ top: 0, behavior: "smooth" });

    } else {
        // Public landing page view (Only accessible when logged out)
        if (publicLandingView) publicLandingView.classList.remove("hidden");
        if (appPlannerView) appPlannerView.classList.add("hidden");

        landingNavItems.forEach(el => el.classList.remove("hidden"));
        plannerNavItems.forEach(el => el.classList.add("hidden"));

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    updateUserAuthUI();
}

function handleLogoClick() {
    const user = getLoggedInUser();
    if (user) {
        switchView("planner");
    } else {
        switchView("landing");
    }
}

function getLoggedInUser() {
    const userJson = localStorage.getItem("tripmate_user");
    if (!userJson) return null;
    try {
        const user = JSON.parse(userJson);
        return (user && user.isLoggedIn) ? user : null;
    } catch (e) {
        return null;
    }
}

function logoutUser() {
    localStorage.removeItem("tripmate_user");
    closeProfileDropdown();
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            window.google.accounts.id.disableAutoSelect();
        } catch (e) {}
    }
    switchView("landing");
}

function handleNavLoginClick() {
    const user = getLoggedInUser();
    if (user) {
        switchView("planner");
    } else {
        openAuthModal("login");
    }
}

function handleNavSignupClick() {
    const user = getLoggedInUser();
    if (user) {
        logoutUser();
    } else {
        openAuthModal("signup");
    }
}

/* --------------------------------------------------------------------------
   2. HERO SEARCH & PROMPT FILLING
   -------------------------------------------------------------------------- */
function submitHeroSearch() {
    const heroInput = document.getElementById("heroInput");
    const query = heroInput ? heroInput.value.trim() : "";

    if (!query) {
        const user = getLoggedInUser();
        if (user) {
            switchView("planner");
        } else {
            openAuthModal("login");
        }
        return;
    }

    pendingPrompt = query;
    const user = getLoggedInUser();
    if (user) {
        switchView("planner");
        sendMessage();
    } else {
        openAuthModal("signup");
    }
}

function handleHeroKeyPress(event) {
    if (event.key === "Enter") {
        submitHeroSearch();
    }
}

function quickFillPrompt(text) {
    pendingPrompt = text;
    const user = getLoggedInUser();
    if (user) {
        switchView("planner");
    } else {
        openAuthModal("signup");
    }
}

function setPrompt(text) {
    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.value = text;
    }
}

/* --------------------------------------------------------------------------
   3. API COMMUNICATION (LANGGRAPH BACKEND)
   -------------------------------------------------------------------------- */
function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    if (!sendBtn) return;

    sendBtn.disabled = isLoading;

    if (isLoading) {
        if (btnText) btnText.classList.add("hidden");
        if (btnLoader) btnLoader.classList.remove("hidden");
    } else {
        if (btnText) btnText.classList.remove("hidden");
        if (btnLoader) btnLoader.classList.add("hidden");
    }
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    const errorBox = document.getElementById("errorBox");
    if (!errorBox) return;

    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

function showResult(answer, threadId) {
    latestAnswerMarkdown = answer;

    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");

    if (!resultSection || !resultBox) return;

    if (typeof marked !== "undefined") {
        resultBox.innerHTML = marked.parse(answer);
    } else {
        resultBox.innerText = answer;
    }

    if (threadInfo) {
        threadInfo.textContent = `Thread ID: ${threadId}`;
    }

    resultSection.classList.remove("hidden");

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function sendMessage() {
    hideError();

    const input = document.getElementById("userInput");
    if (!input) return;

    const message = input.value.trim();

    if (!message) {
        showError("Please enter your travel request first.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/travel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong generating your plan.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem("travel_thread_id", currentThreadId);

        showResult(data.answer, data.thread_id);

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

/* --------------------------------------------------------------------------
   4. EXPORTING & UTILITIES
   -------------------------------------------------------------------------- */
function copyResult() {
    const resultBox = document.getElementById("resultBox");
    if (!resultBox) return;

    const text = resultBox.innerText;
    if (!text) return;

    navigator.clipboard.writeText(text)
        .then(() => {
            const copyBtn = document.querySelector(".copy-btn");
            if (!copyBtn) return;
            const oldText = copyBtn.innerHTML;

            copyBtn.innerHTML = "✅ Copied!";
            setTimeout(() => {
                copyBtn.innerHTML = oldText;
            }, 1600);
        })
        .catch(() => {
            showError("Could not copy result to clipboard.");
        });
}

function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");

    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    const downloadBtn = document.querySelector(".download-btn");
    const oldText = downloadBtn ? downloadBtn.innerHTML : "";

    if (downloadBtn) {
        downloadBtn.innerHTML = "⌛ Preparing PDF...";
        downloadBtn.disabled = true;
    }

    const options = {
        margin: 0.5,
        filename: `tripmate-itinerary-${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    if (typeof html2pdf !== "undefined") {
        html2pdf()
            .set(options)
            .from(pdfContent)
            .save()
            .then(() => {
                if (downloadBtn) {
                    downloadBtn.innerHTML = oldText;
                    downloadBtn.disabled = false;
                }
            })
            .catch(() => {
                if (downloadBtn) {
                    downloadBtn.innerHTML = oldText;
                    downloadBtn.disabled = false;
                }
                showError("Could not download PDF.");
            });
    }
}

/* --------------------------------------------------------------------------
   5. FRONTEND AUTH MODAL CONTROLLER
   -------------------------------------------------------------------------- */
let activeAuthMode = "login";

function openAuthModal(mode = "login") {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    activeAuthMode = mode;
    switchAuthTab(mode);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

function handleModalBackdropClick(event) {
    if (event.target.id === "authModal") {
        closeAuthModal();
    }
}

/* --------------------------------------------------------------------------
   5. USER DATABASE & AUTHENTICATION CONTROLLER
   -------------------------------------------------------------------------- */
const DB_USERS_KEY = "tripmate_users_db";

function getUsersDatabase() {
    try {
        const data = localStorage.getItem(DB_USERS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to read user database:", e);
    }
    // Initialize default seed user database
    const seedUsers = [
        {
            id: "usr_demo",
            name: "Alex Morgan",
            email: "alex@example.com",
            password: "password123",
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
}

function saveUserToDatabase(userObj) {
    const users = getUsersDatabase();
    users.push(userObj);
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
}

function findUserInDatabase(email) {
    const users = getUsersDatabase();
    const cleanEmail = (email || "").trim().toLowerCase();
    return users.find(u => u.email.toLowerCase() === cleanEmail);
}

function findUserByGoogleSub(googleSub) {
    if (!googleSub) return null;
    const users = getUsersDatabase();
    return users.find(u => u.googleSub === googleSub);
}

function updateUserInDatabase(userObj) {
    const users = getUsersDatabase();
    const index = users.findIndex(u => (userObj.googleSub && u.googleSub === userObj.googleSub) || u.email.toLowerCase() === userObj.email.toLowerCase());
    if (index !== -1) {
        users[index] = { ...users[index], ...userObj };
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    }
}

function resetAuthModalAlerts() {
    const authErrorMsg = document.getElementById("authErrorMsg");
    const authSuccessMsg = document.getElementById("authSuccessMsg");
    if (authErrorMsg) {
        authErrorMsg.textContent = "";
        authErrorMsg.classList.add("hidden");
    }
    if (authSuccessMsg) {
        authSuccessMsg.textContent = "";
        authSuccessMsg.classList.add("hidden");
    }
}

function openAuthModal(mode = "login") {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    resetAuthModalAlerts();
    activeAuthMode = mode;
    switchAuthTab(mode);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Render Google Sign-In Button on modal open
    setTimeout(renderGoogleSignInButton, 50);
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    resetAuthModalAlerts();
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

function handleModalBackdropClick(event) {
    if (event.target.id === "authModal") {
        closeAuthModal();
    }
}

function switchAuthTab(mode) {
    activeAuthMode = mode;
    resetAuthModalAlerts();

    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const nameGroup = document.getElementById("nameGroup");
    const modalTitle = document.getElementById("modalTitle");
    const modalSubtitle = document.getElementById("modalSubtitle");
    const submitBtn = document.getElementById("authSubmitBtn");

    if (mode === "signup") {
        if (tabSignup) tabSignup.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        if (nameGroup) nameGroup.classList.remove("hidden");
        if (modalTitle) modalTitle.textContent = "Create Your Account";
        if (modalSubtitle) modalSubtitle.textContent = "Sign up to save your custom trip plans and AI agent threads.";
        if (submitBtn) submitBtn.textContent = "Create Account & Open Planner";
    } else {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabSignup) tabSignup.classList.remove("active");
        if (nameGroup) nameGroup.classList.add("hidden");
        if (modalTitle) modalTitle.textContent = "Welcome Back to Tripmate";
        if (modalSubtitle) modalSubtitle.textContent = "Log in to access saved travel threads and preferences.";
        if (submitBtn) submitBtn.textContent = "Log In to Tripmate";
    }
}

function showAuthError(msg) {
    const authErrorMsg = document.getElementById("authErrorMsg");
    if (authErrorMsg) {
        authErrorMsg.textContent = msg;
        authErrorMsg.classList.remove("hidden");
    }
}

function showAuthSuccess(msg) {
    const authSuccessMsg = document.getElementById("authSuccessMsg");
    if (authSuccessMsg) {
        authSuccessMsg.textContent = msg;
        authSuccessMsg.classList.remove("hidden");
    }
}

function handleAuthSubmit(event) {
    event.preventDefault();
    resetAuthModalAlerts();

    const emailInput = document.getElementById("authEmail").value.trim().toLowerCase();
    const passwordInput = document.getElementById("authPassword").value.trim();
    const nameInput = document.getElementById("authName").value.trim();

    if (!emailInput || !passwordInput) {
        showAuthError("Please fill in both email and password.");
        return;
    }

    if (activeAuthMode === "signup") {
        // Check if user already exists in database
        const existingUser = findUserInDatabase(emailInput);
        if (existingUser) {
            showAuthError(`⚠️ An account with "${emailInput}" already exists! Please click "Log In" above.`);
            return;
        }

        // Create & Save User Record in Database
        const newUser = {
            id: "usr_" + Date.now(),
            name: nameInput || emailInput.split("@")[0],
            email: emailInput,
            password: passwordInput,
            createdAt: new Date().toISOString()
        };

        saveUserToDatabase(newUser);

        // Session reset & login
        localStorage.removeItem("tripmate_user");
        const userSession = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            isLoggedIn: true,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem("tripmate_user", JSON.stringify(userSession));

        showAuthSuccess(`🎉 Account created successfully! Welcome to Tripmate, ${newUser.name}.`);

        setTimeout(() => {
            closeAuthModal();
            switchView("planner");
        }, 900);

    } else {
        // Login mode: Look up user in Database
        const userInDb = findUserInDatabase(emailInput);

        if (!userInDb) {
            showAuthError(`❌ No account found with email "${emailInput}". Please click "Sign Up" above to register.`);
            return;
        }

        if (userInDb.password !== passwordInput) {
            showAuthError(`❌ Incorrect password for "${emailInput}". Please try again.`);
            return;
        }

        // Session reset & Login success
        localStorage.removeItem("tripmate_user");
        const userSession = {
            id: userInDb.id,
            name: userInDb.name,
            email: userInDb.email,
            isLoggedIn: true,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem("tripmate_user", JSON.stringify(userSession));

        showAuthSuccess(`✨ Welcome back, ${userInDb.name}! Opening your planner workspace...`);

        setTimeout(() => {
            closeAuthModal();
            switchView("planner");
        }, 900);
    }
}

/* --------------------------------------------------------------------------
   GOOGLE IDENTITY SERVICES OAUTH CONTROLLER
   -------------------------------------------------------------------------- */
const GOOGLE_CLIENT_ID = "443771133772-c6sa8ulrqoiac18lpflnvo3ntckfabuq.apps.googleusercontent.com";
let isGoogleSdkInitialized = false;

function initGoogleAuthSDK() {
    if (isGoogleSdkInitialized) return;
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
        });
        isGoogleSdkInitialized = true;
    }
}

function renderGoogleSignInButton() {
    initGoogleAuthSDK();
    const container = document.getElementById("googleBtnContainer");
    if (container && window.google && window.google.accounts && window.google.accounts.id) {
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 320
        });
    }
}

function handleGoogleCredentialResponse(response) {
    try {
        if (!response || !response.credential) {
            showAuthError("No Google credential received. Please try again.");
            return;
        }

        // 1. DECODE GOOGLE ID TOKEN (JWT Payload)
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        // 2. EXTRACT AUTHENTICATED IDENTITY DIRECTLY FROM ID TOKEN
        const googleSub = payload.sub; // Stable Google Subject ID
        const googleEmail = (payload.email || "").trim().toLowerCase();
        const googleName = (payload.name || payload.given_name || googleEmail.split('@')[0]).trim();
        const googlePicture = payload.picture || "";

        if (!googleEmail || !googleSub) {
            showAuthError("Invalid Google token payload. Missing email or user ID.");
            return;
        }

        // 3. LOOK UP OR CREATE USER IN DATABASE USING STABLE SUB / EMAIL
        let userInDb = findUserByGoogleSub(googleSub) || findUserInDatabase(googleEmail);

        if (!userInDb) {
            // Create new Google user account
            userInDb = {
                id: "usr_g_" + googleSub,
                googleSub: googleSub,
                name: googleName,
                email: googleEmail,
                picture: googlePicture,
                password: "google_oauth_provider",
                createdAt: new Date().toISOString()
            };
            saveUserToDatabase(userInDb);
        } else {
            // Update existing user record with verified Google identity details
            userInDb.googleSub = googleSub;
            userInDb.name = googleName;
            userInDb.email = googleEmail;
            if (googlePicture) userInDb.picture = googlePicture;
            updateUserInDatabase(userInDb);
        }

        // 4. SESSION RESET - PURGE STALE STATE & STORE EXACT ONE USER
        localStorage.removeItem("tripmate_user");

        const newSession = {
            id: userInDb.id,
            googleSub: userInDb.googleSub,
            name: userInDb.name,
            email: userInDb.email,
            picture: userInDb.picture,
            isLoggedIn: true,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem("tripmate_user", JSON.stringify(newSession));

        // 5. UPDATE UI WITH VERIFIED USER NAME & EMAIL
        showAuthSuccess(`✨ Welcome to Tripmate, ${userInDb.name}!`);

        setTimeout(() => {
            closeAuthModal();
            switchView("planner");
        }, 800);

    } catch (err) {
        console.error("Google Auth credential handler error:", err);
        showAuthError("Google Sign-In failed. Please try again.");
    }
}

function toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) {
        dropdown.classList.toggle("hidden");
    }
}

function closeProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) {
        dropdown.classList.add("hidden");
    }
}

function updateUserAuthUI() {
    const user = getLoggedInUser();
    const navLoginBtn = document.getElementById("navLoginBtn");
    const navSignupBtn = document.getElementById("navSignupBtn");
    const userProfileMenu = document.getElementById("userProfileMenu");

    if (user) {
        if (navLoginBtn) navLoginBtn.classList.add("hidden");
        if (navSignupBtn) navSignupBtn.classList.add("hidden");
        if (userProfileMenu) userProfileMenu.classList.remove("hidden");

        const name = user.name || "Explorer";
        const email = user.email || "user@example.com";
        const initial = name.charAt(0).toUpperCase();

        const profileAvatar = document.getElementById("profileAvatar");
        const profileName = document.getElementById("profileName");
        const dropdownUserName = document.getElementById("dropdownUserName");
        const dropdownUserEmail = document.getElementById("dropdownUserEmail");

        if (profileAvatar) profileAvatar.textContent = initial;
        if (profileName) profileName.textContent = name;
        if (dropdownUserName) dropdownUserName.textContent = name;
        if (dropdownUserEmail) dropdownUserEmail.textContent = email;

    } else {
        if (navLoginBtn) navLoginBtn.classList.remove("hidden");
        if (navSignupBtn) navSignupBtn.classList.remove("hidden");
        if (userProfileMenu) userProfileMenu.classList.add("hidden");

        if (navLoginBtn) navLoginBtn.innerHTML = `Log In`;
        if (navSignupBtn) {
            navSignupBtn.innerHTML = `<span>Sign Up</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>`;
        }
    }
}

// Close profile dropdown when clicking anywhere outside
document.addEventListener("click", (e) => {
    const userProfileMenu = document.getElementById("userProfileMenu");
    if (userProfileMenu && !userProfileMenu.contains(e.target)) {
        closeProfileDropdown();
    }
});

/* --------------------------------------------------------------------------
   6. HERO CAROUSEL CONTROLLER
   -------------------------------------------------------------------------- */
let currentHeroSlide = 0;
let heroSlideTimer = null;

function setHeroSlide(index) {
    currentHeroSlide = index;
    const slides = document.querySelectorAll(".postcard.card-slide");
    const dots = document.querySelectorAll(".carousel-dots .dot");

    if (!slides.length) return;

    slides.forEach((slide) => {
        const slideIndex = parseInt(slide.getAttribute("data-slide"));
        slide.classList.remove("active", "next", "prev");

        if (slideIndex === index) {
            slide.classList.add("active");
        } else if (slideIndex === (index + 1) % 3) {
            slide.classList.add("next");
        } else {
            slide.classList.add("prev");
        }
    });

    dots.forEach((dot, idx) => {
        if (idx === index) {
            dot.classList.add("active");
        } else {
            dot.classList.remove("active");
        }
    });
}

function startHeroSlideAutoplay() {
    if (heroSlideTimer) clearInterval(heroSlideTimer);
    heroSlideTimer = setInterval(() => {
        currentHeroSlide = (currentHeroSlide + 1) % 3;
        setHeroSlide(currentHeroSlide);
    }, 4500);
}

/* --------------------------------------------------------------------------
   7. INITIALIZATION
   -------------------------------------------------------------------------- */
function toggleMobileMenu() {
    const navLinks = document.getElementById("navLinks");
    if (navLinks) {
        navLinks.classList.toggle("active");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const user = getLoggedInUser();
    if (user) {
        switchView("planner");
    } else {
        switchView("landing");
    }

    startHeroSlideAutoplay();
});

/* --------------------------------------------------------------------------
   8. SCROLLSPY NAVBAR HIGHLIGHT
   -------------------------------------------------------------------------- */
function updateScrollspy() {
    const destinationsSec = document.getElementById("destinations");
    const howItThinksSec = document.getElementById("how-it-thinks");
    const navItems = document.querySelectorAll(".landing-only-nav");

    if (!navItems.length) return;

    const scrollPos = window.scrollY + 250;
    let activeId = "";

    if (destinationsSec && scrollPos >= destinationsSec.offsetTop && scrollPos < destinationsSec.offsetTop + destinationsSec.offsetHeight) {
        activeId = "destinations";
    } else if (howItThinksSec && scrollPos >= howItThinksSec.offsetTop && scrollPos < howItThinksSec.offsetTop + howItThinksSec.offsetHeight) {
        activeId = "how-it-thinks";
    }

    navItems.forEach(item => {
        const href = item.getAttribute("href");
        if (href === `#${activeId}`) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}

window.addEventListener("scroll", updateScrollspy);

// Shortcut: Ctrl + Enter sends message
document.addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
});