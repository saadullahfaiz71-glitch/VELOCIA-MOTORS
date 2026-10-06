/* =========================================================
   VELOCIA MOTORS
   PREMIUM CAR SHOWROOM
   MAIN JAVASCRIPT
========================================================= */


/* =========================================================
   1. PAGE READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeNavigation();
    initializeUpcomingButtons();
    initializeCarCards();
    initializeScrollEffects();
    initializeImageFallback();

    console.log("Velocia Motors website loaded successfully.");

});


/* =========================================================
   2. NAVIGATION
========================================================= */

function initializeNavigation() {

    const navigationLinks = document.querySelectorAll(".navbar a");

    navigationLinks.forEach((link) => {

        link.addEventListener("click", (event) => {

            const target = link.getAttribute("href");

            /*
                Only handle links that point
                to sections on the current page.
            */

            if (target && target.startsWith("#")) {

                const section = document.querySelector(target);

                if (section) {

                    event.preventDefault();

                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }

        });

    });

}


/* =========================================================
   3. UPCOMING CAR BUTTONS
========================================================= */

function initializeUpcomingButtons() {

    const buttons = document.querySelectorAll(
        ".upcoming-content button"
    );

    buttons.forEach((button) => {

        button.addEventListener("click", () => {

            const originalText = button.textContent;

            button.textContent = "Notification Added";

            button.style.background = "#e10600";
            button.style.color = "#ffffff";

            setTimeout(() => {

                button.textContent = originalText;

                button.style.background = "";
                button.style.color = "";

            }, 2500);

        });

    });

}


/* =========================================================
   4. CAR CARD INTERACTIONS
========================================================= */

function initializeCarCards() {

    const carCards = document.querySelectorAll(".car-card");

    carCards.forEach((card) => {

        card.addEventListener("mouseenter", () => {

            card.classList.add("active");

        });


        card.addEventListener("mouseleave", () => {

            card.classList.remove("active");

        });

    });

}


/* =========================================================
   5. SCROLL EFFECTS
========================================================= */

function initializeScrollEffects() {

    const header = document.querySelector(".header");

    if (!header) {
        return;
    }


    function updateHeader() {

        if (window.scrollY > 40) {

            header.classList.add("scrolled");

        } else {

            header.classList.remove("scrolled");

        }

    }


    window.addEventListener("scroll", updateHeader);

    updateHeader();

}


/* =========================================================
   6. IMAGE FALLBACK
========================================================= */

function initializeImageFallback() {

    const images = document.querySelectorAll("img");

    images.forEach((image) => {

        image.addEventListener("error", () => {

            /*
                Prevent broken image icons.
                We keep the original element but
                hide it if the image cannot be loaded.
            */

            image.style.opacity = "0";

        });

    });

}


/* =========================================================
   7. HERO BUTTON ANIMATION
========================================================= */

const heroButtons = document.querySelectorAll(
    ".hero-buttons a"
);

heroButtons.forEach((button) => {

    button.addEventListener("mouseenter", () => {

        button.style.transform = "translateY(-3px)";

    });


    button.addEventListener("mouseleave", () => {

        button.style.transform = "";

    });

});


/* =========================================================
   8. CONTACT BUTTON EFFECT
========================================================= */

const contactButtons = document.querySelectorAll(
    ".contact-buttons a"
);

contactButtons.forEach((button) => {

    button.addEventListener("click", () => {

        console.log(
            "Contact action selected:",
            button.textContent.trim()
        );

    });

});


/* =========================================================
   9. CURRENT YEAR
========================================================= */

function updateFooterYear() {

    const footerText = document.querySelector(
        ".footer-bottom p"
    );

    if (!footerText) {
        return;
    }

    const currentYear = new Date().getFullYear();

    footerText.textContent =
        `© ${currentYear} Velocia Motors. All Rights Reserved.`;

}

updateFooterYear();


/* =========================================================
   10. ACTIVE NAVIGATION ON SCROLL
========================================================= */

function initializeActiveNavigation() {

    const sections = document.querySelectorAll(
        "main section[id]"
    );

    const links = document.querySelectorAll(
        ".navbar a"
    );

    if (!sections.length || !links.length) {
        return;
    }


    window.addEventListener("scroll", () => {

        let currentSection = "";

        sections.forEach((section) => {

            const sectionTop =
                section.offsetTop - 150;

            const sectionHeight =
                section.offsetHeight;

            if (
                window.scrollY >= sectionTop &&
                window.scrollY < sectionTop + sectionHeight
            ) {

                currentSection = section.getAttribute("id");

            }

        });


        links.forEach((link) => {

            link.classList.remove("active");

            const href = link.getAttribute("href");

            if (href === `#${currentSection}`) {

                link.classList.add("active");

            }

        });

    });

}

initializeActiveNavigation();


/* =========================================================
   11. SIMPLE BOOKING DEMO
========================================================= */

function showBookingMessage(carName) {

    if (!carName) {
        carName = "Selected Car";
    }

    alert(
        `Booking Request\n\n` +
        `${carName}\n\n` +
        `The full booking system will be connected ` +
        `to the customer account and database later.`
    );

}


/* =========================================================
   12. GLOBAL CAR BOOKING FUNCTION
========================================================= */

window.bookCar = function (carName) {

    showBookingMessage(carName);

};


/* =========================================================
   13. CONSOLE INFORMATION
========================================================= */

console.log(
    "===================================="
);

console.log(
    "       VELOCIA MOTORS"
);

console.log(
    "   Premium Car Showroom System"
);

console.log(
    "===================================="
);

