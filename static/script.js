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

function switchAuthTab(mode) {
    activeAuthMode = mode;

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
        if (modalTitle) modalTitle.textContent = "Create Your Free Account";
        if (modalSubtitle) modalSubtitle.textContent = "Save your AI itineraries, preferences, and custom trip threads.";
        if (submitBtn) submitBtn.textContent = "Create Account & Open Studio";
    } else {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabSignup) tabSignup.classList.remove("active");
        if (nameGroup) nameGroup.classList.add("hidden");
        if (modalTitle) modalTitle.textContent = "Welcome Back to Tripmate";
        if (modalSubtitle) modalSubtitle.textContent = "Log in to access saved travel threads and preferences.";
        if (submitBtn) submitBtn.textContent = "Log In to Tripmate";
    }
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("authEmail").value;
    const nameInput = document.getElementById("authName").value;
    const name = nameInput || email.split("@")[0];

    const userSession = {
        name: name,
        email: email,
        isLoggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem("tripmate_user", JSON.stringify(userSession));

    closeAuthModal();
    switchView("planner");
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