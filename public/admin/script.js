// =========================================================
// VELOCIA MOTORS — ADMIN DASHBOARD
// =========================================================

let bookings = [];
let requests = [];
let customers = [];
let cars = [];


// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionName) {

    // Hide all sections
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active-section");
    });

    // Remove active from all nav buttons
    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    // Show requested section
    const section = document.getElementById(sectionName);

    if (!section) {
        console.error("Section not found:", sectionName);
        return;
    }

    section.classList.add("active-section");

    // Activate correct navigation button
    document.querySelectorAll(".nav-item").forEach(button => {

        const target = button.getAttribute("data-section");

        if (target === sectionName) {
            button.classList.add("active");
        }
    });

    // Page title
    const titles = {
        dashboard: "Admin Dashboard",
        bookings: "Customer Bookings",
        requests: "Purchase Requests",
        customers: "Registered Customers",
        cars: "Car Inventory"
    };

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            titles[sectionName] || "Admin Dashboard";
    }

    // Load section data
    if (sectionName === "bookings") {
        loadBookings();
    }

    if (sectionName === "requests") {
        loadRequests();
    }

    if (sectionName === "customers") {
        loadCustomers();
    }

    if (sectionName === "cars") {
        loadCars();
    }
}
// =========================================================
// LOAD BOOKINGS
// =========================================================

async function loadBookings() {

    const container =
        document.getElementById("bookingTable");

    if (!container) {
        console.error("bookingTable not found.");
        return;
    }

    container.innerHTML = `
        <div class="loading">
            Loading bookings...
        </div>
    `;

    try {

        const response =
            await fetch("/api/admin/bookings");

        if (!response.ok) {
            throw new Error(
                `Server error: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log("ADMIN BOOKINGS:", data);

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load bookings."
            );
        }

        bookings =
            data.bookings || [];

        console.log(
            "BOOKINGS ARRAY:",
            bookings
        );

        renderBookings();


    } catch (error) {

        console.error(
            "BOOKINGS ERROR:",
            error
        );

        container.innerHTML = `
            <div class="empty">

                <strong>
                    Unable to load bookings.
                </strong>

                <br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

            </div>
        `;
    }
}
// =========================================================
// RENDER BOOKINGS
// =========================================================

function renderBookings() {

    const container =
        document.getElementById("bookingTable");

    if (!container) return;

    if (!bookings.length) {

        container.innerHTML = `
            <div class="empty">
                No bookings found.
            </div>
        `;

        return;
    }

    let html = `
        <div class="table-wrapper">

            <table>

                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Vehicle</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
    `;

    bookings.forEach(booking => {

        // -----------------------------------------
        // READ CUSTOMER MESSAGE
        // -----------------------------------------

        const rawMessage =
            String(booking.message || "");

        let customerFromMessage = "";
        let phoneFromMessage = "";
        let userMessage = "";


        // Customer:
        const customerMatch =
            rawMessage.match(
                /Customer:\s*(.*)/i
            );

        if (customerMatch) {
            customerFromMessage =
                customerMatch[1].trim();
        }


        // Phone:
        const phoneMatch =
            rawMessage.match(
                /Phone:\s*(.*)/i
            );

        if (phoneMatch) {
            phoneFromMessage =
                phoneMatch[1].trim();
        }


        // Remove Customer + Phone lines
        userMessage =
            rawMessage
                .replace(
                    /Customer:\s*.*(\r?\n|$)/i,
                    ""
                )
                .replace(
                    /Phone:\s*.*(\r?\n|$)/i,
                    ""
                )
                .trim();


        // Fallback customer
        const customerName =
            customerFromMessage ||
            booking.customer_name ||
            "Unknown";


        // Fallback phone
        const phone =
            phoneFromMessage ||
            "—";


        // Message
        const displayMessage =
            userMessage ||
            "—";


        html += `
            <tr>

                <!-- ID -->
                <td>
                    #${booking.id}
                </td>


                <!-- CUSTOMER -->
                <td>

                    <span class="customer-name">
                        ${escapeHTML(customerName)}
                    </span>

                    <span class="customer-email">
                        ${escapeHTML(
                            booking.customer_email || ""
                        )}
                    </span>

                </td>


                <!-- PHONE -->
                <td>

                    <span
                        style="
                            white-space:nowrap;
                            color:#cbd5e1;
                        "
                    >
                        ${escapeHTML(phone)}
                    </span>

                </td>


                <!-- VEHICLE -->
                <td>

                    <strong>
                        ${escapeHTML(
                            booking.brand || ""
                        )}
                    </strong>

                    <br>

                    ${escapeHTML(
                        booking.car_name || ""
                    )}

                </td>


                <!-- DATE -->
                <td>
                    ${escapeHTML(
                        booking.booking_date || "-"
                    )}
                </td>


                <!-- TIME -->
                <td>
                    ${escapeHTML(
                        booking.booking_time || "-"
                    )}
                </td>


                <!-- MESSAGE -->
                <td>

                    <span
                        title="${escapeHTML(displayMessage)}"
                        style="
                            display:block;
                            max-width:220px;
                            white-space:nowrap;
                            overflow:hidden;
                            text-overflow:ellipsis;
                            color:#cbd5e1;
                        "
                    >
                        ${escapeHTML(displayMessage)}
                    </span>

                </td>


                <!-- STATUS -->
                <td>
                    ${statusBadge(booking.status)}
                </td>


                <!-- ACTION -->
                <td>
    <div class="booking-actions">

        <button
            type="button"
            class="view-booking-btn"
            onclick="viewBooking(${booking.id})"
        >
            View Details
        </button>

        <select
            class="action-select"
            onchange="
                updateBookingStatus(
                    ${booking.id},
                    this.value
                )
            "
        >
            <option value="Pending"
                ${booking.status === "Pending" ? "selected" : ""}>
                Pending
            </option>

            <option value="Approved"
                ${booking.status === "Approved" ? "selected" : ""}>
                Approved
            </option>

            <option value="Rejected"
                ${booking.status === "Rejected" ? "selected" : ""}>
                Rejected
            </option>

            <option value="Completed"
                ${booking.status === "Completed" ? "selected" : ""}>
                Completed
            </option>
        </select>

    </div>
</td>
            </tr>
        `;
    });


    html += `
                </tbody>

            </table>

        </div>
    `;


    container.innerHTML = html;
}
// =========================================================
// LOAD CUSTOMERS
// =========================================================

async function loadCustomers() {

    const container =
        document.getElementById("customerTable");

    if (!container) {
        console.error("customerTable not found.");
        return;
    }

    container.innerHTML = `
        <div class="loading">
            Loading customers...
        </div>
    `;

    try {

        const response =
            await fetch("/api/admin/users");

        if (!response.ok) {
            throw new Error(
                `Server error: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log("ADMIN CUSTOMERS:", data);

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load customers."
            );
        }

        customers =
            (data.users || []).filter(
                user =>
                    String(user.role || "").toLowerCase() ===
                    "customer"
            );

        console.log(
            "CUSTOMERS ARRAY:",
            customers
        );

        renderCustomers();

    } catch (error) {

        console.error(
            "CUSTOMERS ERROR:",
            error
        );

        container.innerHTML = `
            <div class="empty">

                <strong>
                    Unable to load customers.
                </strong>

                <br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

            </div>
        `;
    }
}

// =========================================================
// RENDER CUSTOMERS
// =========================================================

function renderCustomers() {

    const container =
        document.getElementById("customerTable");

    if (!container) return;

    if (!customers.length) {

        container.innerHTML = `
            <div class="empty">
                No customers found.
            </div>
        `;

        return;
    }

    let html = `
        <div class="table-wrapper">

            <table>

                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                    </tr>
                </thead>

                <tbody>
    `;

    customers.forEach(customer => {

        html += `
            <tr>

                <td>
                    #${customer.id}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(customer.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(customer.email)}
                </td>

                <td>
                    <span class="status approved">
                        Customer
                    </span>
                </td>

                <td>
                    ${escapeHTML(customer.created_at)}
                </td>

            </tr>
        `;
    });

    html += `
                </tbody>

            </table>

        </div>
    `;

    container.innerHTML = html;
}
// ==========================================
// PURCHASE REQUESTS
// ==========================================
async function loadRequests() {

    console.log("=================================");
    console.log("LOADING PURCHASE REQUESTS...");
    console.log("=================================");

    // IMPORTANT:
    // Purchase Requests page ka actual container
    const container = document.getElementById("requestTable");

    if (!container) {
        console.error("requestTable element NOT FOUND!");
        return;
    }

    container.innerHTML = `
        <div class="loading">
            Loading requests...
        </div>
    `;

    try {

        const response = await fetch("/api/admin/purchase-requests");

        console.log(
            "Purchase API status:",
            response.status
        );

        if (!response.ok) {
            throw new Error(
                `API Error: ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "PURCHASE REQUEST DATA:",
            data
        );

        if (!data.success) {
            throw new Error(
                data.message ||
                "Unable to load purchase requests."
            );
        }

        const requests = data.requests || [];

        console.log(
            "PURCHASE REQUEST COUNT:",
            requests.length
        );

        if (!requests.length) {

            container.innerHTML = `
                <div class="empty">
                    No purchase requests yet.
                </div>
            `;

            return;
        }

        let html = `
            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>Request</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Quiz</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        requests.forEach(request => {

            const score =
                request.quiz_score !== null &&
                request.quiz_score !== undefined
                    ? request.quiz_score
                    : "-";

            const total =
                request.quiz_total_questions !== null &&
                request.quiz_total_questions !== undefined
                    ? request.quiz_total_questions
                    : "-";

            const quizHTML =
                request.quiz_result_id
                    ? `
                        <div class="quiz-mini">

                            <strong>
                                ${escapeHTML(
                                    String(score)
                                )}/${escapeHTML(
                                    String(total)
                                )}
                            </strong>

                            <small>
                                Car Challenge
                            </small>

                            <small>
                                ${escapeHTML(
                                    request.quiz_preference ||
                                    ""
                                )}
                            </small>

                        </div>
                    `
                    : `
                        <span class="quiz-not-found">
                            Not attached
                        </span>
                    `;

            html += `
                <tr>

                    <td>
                        <strong>
                            #${escapeHTML(
                                String(request.id)
                            )}
                        </strong>
                    </td>

                    <td>

                        <span class="customer-name">
                            ${escapeHTML(
                                request.customer_name ||
                                "Unknown"
                            )}
                        </span>

                        <span class="customer-email">
                            ${escapeHTML(
                                request.customer_email ||
                                "-"
                            )}
                        </span>

                    </td>

                    <td>

                        <strong>
                            ${escapeHTML(
                                request.brand ||
                                ""
                            )}
                        </strong>

                        <br>

                        ${escapeHTML(
                            request.car_name ||
                            "Unknown Vehicle"
                        )}

                        <br>

                        <small>
                            ${escapeHTML(
                                request.price ||
                                "-"
                            )}
                        </small>

                    </td>

                    <td>
                        ${quizHTML}
                    </td>

                    <td>
                        ${statusBadge(
                            request.status ||
                            "Pending"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            request.created_at ||
                            "-"
                        )}
                    </td>

                </tr>
            `;
        });

        html += `
                    </tbody>

                </table>

            </div>
        `;

        // Render into PURCHASE REQUESTS page
        container.innerHTML = html;

        console.log(
            "✅ PURCHASE REQUESTS RENDERED"
        );

    } catch (error) {

        console.error(
            "❌ PURCHASE REQUEST ERROR:",
            error
        );

        container.innerHTML = `
            <div class="empty">

                <strong>
                    Unable to load purchase requests.
                </strong>

                <br>

                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>

            </div>
        `;
    }
}

// =========================================================
// LOAD CARS
// =========================================================

async function loadCars() {

    const container =
        document.getElementById("carTable");

    if (!container) {

        console.error(
            "ERROR: #carTable not found in admin/index.html"
        );

        return;
    }

    container.innerHTML =
        `<div class="loading">Loading cars...</div>`;


    try {

        const response =
            await fetch("/api/admin/cars");


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message || "Unable to load cars."
            );
        }


        cars =
            data.cars || [];


        console.log(
            "VELOCIA CARS:",
            cars
        );


        renderCars();


        const carCount =
            document.getElementById("carCount");

        if (carCount) {
            carCount.textContent =
                cars.length;
        }


    } catch (error) {

        console.error(
            "CARS ERROR:",
            error
        );


        container.innerHTML = `
            <div class="empty">
                <strong>Unable to load cars.</strong>
                <br>
                <small>
                    ${escapeHTML(error.message)}
                </small>
            </div>
        `;
    }
}


// =========================================================
// RENDER CARS
// =========================================================

function renderCars() {

    const container =
        document.getElementById("carTable");

    if (!container) return;


    if (!cars.length) {

        container.innerHTML = `
            <div class="empty">
                No cars found in database.
            </div>
        `;

        return;
    }


    let html = `
        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>
                        <th>Image</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Price</th>
                        <th>Year</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>

                </thead>

                <tbody>
    `;


    cars.forEach(car => {

        let image = "";

        if (car.image) {

            image =
                car.image.startsWith("http")
                    ? car.image
                    : `../${car.image}`;
        }


        html += `
            <tr>

                <td>

                    ${
                        image

                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                class="car-image"
                                alt="${escapeHTML(car.name)}"
                            >
                        `

                        : `
                            <div class="car-image"></div>
                        `
                    }

                </td>


                <td>

                    <span class="car-brand">
                        ${escapeHTML(car.brand)}
                    </span>

                </td>


                <td>

                    <span class="car-name">
                        ${escapeHTML(car.name)}
                    </span>

                </td>


                <td>
                    ${escapeHTML(car.price)}
                </td>


                <td>
                    ${escapeHTML(car.year || "-")}
                </td>


                <td>
                    ${statusBadge(car.status)}
                </td>


                <td>

                    <div class="car-actions">

                        <button
                            type="button"
                            class="edit-btn"
                            onclick="editCar(${car.id})"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="delete-btn"
                            onclick="deleteCar(${car.id})"
                        >
                            Delete
                        </button>

                    </div>

                </td>

            </tr>
        `;
    });


    html += `
                </tbody>

            </table>

        </div>
    `;


    container.innerHTML =
        html;
}


// =========================================================
// OPEN CAR MODAL
// =========================================================

function openCarModal() {

    const modal =
        document.getElementById("carModal");

    const form =
        document.getElementById("carForm");


    if (!modal || !form) {

        console.error(
            "Car modal or form not found."
        );

        return;
    }


    form.reset();


    const carId =
        document.getElementById("carId");

    const modalTitle =
        document.getElementById("modalTitle");


    if (carId) {
        carId.value = "";
    }

    if (modalTitle) {
        modalTitle.textContent =
            "Add New Car";
    }


    modal.classList.add("show");
}


// =========================================================
// CLOSE CAR MODAL
// =========================================================

function closeCarModal() {

    const modal =
        document.getElementById("carModal");

    if (!modal) return;

    modal.classList.remove("show");
}


// =========================================================
// EDIT CAR
// =========================================================

function editCar(id) {

    const car =
        cars.find(
            item => Number(item.id) === Number(id)
        );


    if (!car) {

        alert("Car not found.");

        return;
    }


    document.getElementById("modalTitle").textContent =
        "Edit Vehicle";

    document.getElementById("carId").value =
        car.id;

    document.getElementById("carBrand").value =
        car.brand || "";

    document.getElementById("carName").value =
        car.name || "";

    document.getElementById("carPrice").value =
        car.price || "";

    document.getElementById("carYear").value =
        car.year || "";

    document.getElementById("carEngine").value =
        car.engine || "";

    document.getElementById("carPower").value =
        car.power || "";

    document.getElementById("carTransmission").value =
        car.transmission || "";

    document.getElementById("carFuel").value =
        car.fuel || "";

    document.getElementById("carBody").value =
        car.body_type || "";

    document.getElementById("carStatus").value =
        car.status || "Available";

    document.getElementById("carImage").value =
        car.image || "";

    document.getElementById("carDescription").value =
        car.description || "";


    document
        .getElementById("carModal")
        .classList.add("show");
}


// =========================================================
// SAVE CAR
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const carForm =
            document.getElementById("carForm");


        if (!carForm) return;


        carForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const id =
                    document.getElementById("carId").value;


                const carData = {

                    brand:
                        document
                            .getElementById("carBrand")
                            .value
                            .trim(),

                    name:
                        document
                            .getElementById("carName")
                            .value
                            .trim(),

                    price:
                        document
                            .getElementById("carPrice")
                            .value
                            .trim(),

                    year:
                        document
                            .getElementById("carYear")
                            .value,

                    engine:
                        document
                            .getElementById("carEngine")
                            .value
                            .trim(),

                    power:
                        document
                            .getElementById("carPower")
                            .value
                            .trim(),

                    transmission:
                        document
                            .getElementById("carTransmission")
                            .value
                            .trim(),

                    fuel:
                        document
                            .getElementById("carFuel")
                            .value
                            .trim(),

                    body_type:
                        document
                            .getElementById("carBody")
                            .value
                            .trim(),

                    image:
                        document
                            .getElementById("carImage")
                            .value
                            .trim(),

                    description:
                        document
                            .getElementById("carDescription")
                            .value
                            .trim(),

                    status:
                        document
                            .getElementById("carStatus")
                            .value
                };


                if (
                    !carData.brand ||
                    !carData.name ||
                    !carData.price
                ) {

                    alert(
                        "Brand, Car Name and Price are required."
                    );

                    return;
                }


                try {

                    const url =
                        id
                            ? `/api/admin/cars/${id}`
                            : "/api/admin/cars";


                    const method =
                        id
                            ? "PUT"
                            : "POST";


                    const response =
                        await fetch(
                            url,
                            {
                                method: method,

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(carData)
                            }
                        );


                    const data =
                        await response.json();


                    if (!data.success) {

                        throw new Error(
                            data.message ||
                            "Unable to save car."
                        );
                    }


                    closeCarModal();


                    await loadCars();


                    await updateDashboardStats();


                    alert(
                        id
                            ? "Car updated successfully!"
                            : "Car added successfully!"
                    );


                } catch (error) {

                    console.error(
                        "SAVE CAR ERROR:",
                        error
                    );


                    alert(
                        error.message ||
                        "Unable to save car."
                    );
                }
            }
        );
    }
);

// =========================================================
// VIEW BOOKING DETAILS
// =========================================================

function viewBooking(id) {

    console.log("VIEW BOOKING CLICKED:", id);

    const booking = bookings.find(
        item => Number(item.id) === Number(id)
    );

    if (!booking) {
        alert("Booking not found.");
        return;
    }

    const rawMessage = String(booking.message || "");

    // Customer name
    const customerMatch =
        rawMessage.match(/Customer:\s*(.*)/i);

    const customerName =
        customerMatch
            ? customerMatch[1].trim()
            : booking.customer_name || "Unknown";


    // Phone
    const phoneMatch =
        rawMessage.match(/Phone:\s*(.*)/i);

    const phone =
        phoneMatch
            ? phoneMatch[1].trim()
            : "—";


    // Actual message
    const userMessage =
        rawMessage
            .replace(/Customer:\s*.*(\r?\n|$)/i, "")
            .replace(/Phone:\s*.*(\r?\n|$)/i, "")
            .trim() || "No message";


    const modal =
        document.getElementById("bookingModal");

    const content =
        document.getElementById("bookingModalContent");


    if (!modal || !content) {

        console.error(
            "Booking modal elements not found."
        );

        return;
    }


    content.innerHTML = `

        <div class="booking-detail-grid">

            <div class="detail-section">

                <span class="detail-label">
                    CUSTOMER
                </span>

                <h3>
                    ${escapeHTML(customerName)}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.customer_email || "—"
                    )}
                </p>

                <p>
                    ${escapeHTML(phone)}
                </p>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    VEHICLE
                </span>

                <h3>
                    ${escapeHTML(
                        booking.car_name || "—"
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.brand || "—"
                    )}
                </p>

                <strong>
                    ${escapeHTML(
                        booking.price || "—"
                    )}
                </strong>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    APPOINTMENT
                </span>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(
                        booking.booking_date || "—"
                    )}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(
                        booking.booking_time || "—"
                    )}
                </p>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    STATUS
                </span>

                <div class="detail-status">
                    ${statusBadge(booking.status)}
                </div>

            </div>


            <div class="detail-section full-detail">

                <span class="detail-label">
                    CUSTOMER MESSAGE
                </span>

                <div class="message-box">
                    ${escapeHTML(userMessage)}
                </div>

            </div>

        </div>
    `;


    modal.classList.add("show");
}


// =========================================================
// CLOSE BOOKING DETAILS
// =========================================================

function closeBookingModal() {

    const modal =
        document.getElementById("bookingModal");

    if (modal) {
        modal.classList.remove("show");
    }
}

// =========================================================
// DELETE CAR
// =========================================================

async function deleteCar(id) {

    const car =
        cars.find(
            item => Number(item.id) === Number(id)
        );


    if (!car) return;


    const confirmed =
        confirm(
            `Are you sure you want to delete "${car.name}"?`
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `/api/admin/cars/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to delete car."
            );
        }


        await loadCars();

        await updateDashboardStats();


        alert(
            "Car deleted successfully!"
        );


    } catch (error) {

        console.error(
            "DELETE CAR ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to delete car."
        );
    }
}


// =========================================================
// STATUS BADGE
// =========================================================

function statusBadge(status) {

    const value =
        String(
            status ||
            "Pending"
        );


    const className =
        value
            .toLowerCase()
            .replace(/\s+/g, "-");


    return `
        <span class="status ${className}">
            ${escapeHTML(value)}
        </span>
    `;
}


// =========================================================
// HTML SECURITY
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// LOGOUT
// =========================================================

function logoutAdmin() {

    localStorage.removeItem(
        "velociaUser"
    );

    window.location.href =
        "../login.html";
}


// =========================================================
// INITIAL LOAD
// =========================================================
document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log("VELOCIA ADMIN JS LOADED");

        // Load dashboard data
        await Promise.all([
            loadDashboardRequests(),
            loadBookings(),
            loadCustomers(),
            loadCars()
        ]);

        // Update dashboard statistics
        await updateDashboardStats();

        console.log("VELOCIA ADMIN DASHBOARD READY");
    }
);
// =========================================================
// VIEW BOOKING DETAILS
// =========================================================

function viewBooking(id) {

    const booking = bookings.find(
        item => Number(item.id) === Number(id)
    );

    if (!booking) {
        alert("Booking not found.");
        return;
    }

    const rawMessage =
        String(booking.message || "");

    const customerMatch =
        rawMessage.match(/Customer:\s*(.*)/i);

    const phoneMatch =
        rawMessage.match(/Phone:\s*(.*)/i);

    const customerName =
        customerMatch
            ? customerMatch[1].trim()
            : booking.customer_name || "Unknown";

    const phone =
        phoneMatch
            ? phoneMatch[1].trim()
            : "—";

    const message =
        rawMessage
            .replace(/Customer:\s*.*(\r?\n|$)/i, "")
            .replace(/Phone:\s*.*(\r?\n|$)/i, "")
            .trim() || "No message";


    document.getElementById("bookingModalContent").innerHTML = `

        <div class="booking-detail-grid">

            <div class="detail-section">

                <span class="detail-label">
                    CUSTOMER
                </span>

                <h3>
                    ${escapeHTML(customerName)}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.customer_email || "—"
                    )}
                </p>

                <p>
                    ${escapeHTML(phone)}
                </p>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    VEHICLE
                </span>

                <h3>
                    ${escapeHTML(
                        booking.car_name || "—"
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.brand || "—"
                    )}
                </p>

                <strong>
                    ${escapeHTML(
                        booking.price || "—"
                    )}
                </strong>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    APPOINTMENT
                </span>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(
                        booking.booking_date || "—"
                    )}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(
                        booking.booking_time || "—"
                    )}
                </p>

            </div>


            <div class="detail-section full-detail">

                <span class="detail-label">
                    CUSTOMER MESSAGE
                </span>

                <div class="message-box">
                    ${escapeHTML(message)}
                </div>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    STATUS
                </span>

                <div class="detail-status">
                    ${statusBadge(booking.status)}
                </div>

            </div>

        </div>
    `;

    document
        .getElementById("bookingModal")
        .classList.add("show");
}


// =========================================================
// CLOSE BOOKING MODAL
// =========================================================

function closeBookingModal() {

    const modal =
        document.getElementById("bookingModal");

    if (modal) {
        modal.classList.remove("show");
    }
}
// ==========================================
// PURCHASE REQUESTS COMPATIBILITY FIX
// ==========================================
async function loadRequests() {
    console.log("=================================");
    console.log("LOADING PURCHASE REQUESTS...");
    console.log("=================================");

    const container = document.getElementById("requestTable");

    if (!container) {
        console.error("dashboardRequests element NOT FOUND!");
        return;
    }

    container.innerHTML = `
        <div class="loading">
            Loading requests...
        </div>
    `;

    try {
        const response = await fetch("/api/admin/purchase-requests");

        console.log("Purchase API status:", response.status);

        if (!response.ok) {
            throw new Error(
                `API Error: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("PURCHASE REQUEST DATA:", data);

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load purchase requests."
            );
        }

        const requests = data.requests || [];

        console.log(
            "PURCHASE REQUEST COUNT:",
            requests.length
        );

        if (!requests.length) {
            container.innerHTML = `
                <div class="empty">
                    No purchase requests yet.
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>Request</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Quiz</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        requests.forEach(request => {

            const score =
                request.quiz_score !== null &&
                request.quiz_score !== undefined
                    ? request.quiz_score
                    : "-";

            const total =
                request.quiz_total_questions !== null &&
                request.quiz_total_questions !== undefined
                    ? request.quiz_total_questions
                    : "-";

            const quizHTML =
                request.quiz_result_id
                    ? `
                        <div class="quiz-mini">
                            <strong>
                                ${score}/${total}
                            </strong>

                            <small>
                                Car Challenge
                            </small>

                            <small>
                                ${escapeHTML(
                                    request.quiz_preference || ""
                                )}
                            </small>
                        </div>
                    `
                    : `
                        <span class="quiz-not-found">
                            Not attached
                        </span>
                    `;

            html += `
                <tr>

                    <td>
                        <strong>
                            #${escapeHTML(
                                String(request.id)
                            )}
                        </strong>
                    </td>

                    <td>
                        <span class="customer-name">
                            ${escapeHTML(
                                request.customer_name || "Unknown"
                            )}
                        </span>

                        <span class="customer-email">
                            ${escapeHTML(
                                request.customer_email || "-"
                            )}
                        </span>
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                request.brand || ""
                            )}
                        </strong>

                        <br>

                        ${escapeHTML(
                            request.car_name ||
                            "Unknown Vehicle"
                        )}

                        <br>

                        <small>
                            ${escapeHTML(
                                request.price || "-"
                            )}
                        </small>
                    </td>

                    <td>
                        ${quizHTML}
                    </td>

                    <td>
                        ${statusBadge(
                            request.status || "Pending"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            request.created_at || "-"
                        )}
                    </td>

                </tr>
            `;
        });

        html += `
                    </tbody>

                </table>

            </div>
        `;

        container.innerHTML = html;

        console.log(
            "✅ PURCHASE REQUESTS RENDERED"
        );

    } catch (error) {

        console.error(
            "❌ PURCHASE REQUEST ERROR:",
            error
        );

        container.innerHTML = `
            <div class="empty">
                Unable to load purchase requests.
                <br>
                <small>
                    ${escapeHTML(error.message)}
                </small>
            </div>
        `;
    }
}
// =========================================================
// UPDATE DASHBOARD STATS
// =========================================================

async function updateDashboardStats() {

    try {

        const response = await fetch(
            "/api/admin/purchase-requests"
        );

        if (!response.ok) {
            throw new Error(
                `Stats API error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                data.message || "Unable to load dashboard stats."
            );
        }

        const requests = data.requests || [];

        // TOTAL
        const totalElement =
            document.getElementById("totalRequests");

        if (totalElement) {
            totalElement.textContent = requests.length;
        }

        // PENDING
        const pending =
            requests.filter(request =>
                String(request.status || "")
                    .toLowerCase() === "pending"
            ).length;

        const pendingElement =
            document.getElementById("pendingRequests");

        if (pendingElement) {
            pendingElement.textContent = pending;
        }

        // APPROVED
        const approved =
            requests.filter(request =>
                String(request.status || "")
                    .toLowerCase() === "approved"
            ).length;

        const approvedElement =
            document.getElementById("approvedRequests");

        if (approvedElement) {
            approvedElement.textContent = approved;
        }

        // COMPLETED
        const completed =
            requests.filter(request =>
                String(request.status || "")
                    .toLowerCase() === "completed"
            ).length;

        const completedElement =
            document.getElementById("completedRequests");

        if (completedElement) {
            completedElement.textContent = completed;
        }

        console.log("Dashboard stats updated:", {
            total: requests.length,
            pending,
            approved,
            completed
        });

    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );
    }
}