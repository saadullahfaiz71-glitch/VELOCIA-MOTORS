// =========================================================
// VELOCIA MOTORS — ADMIN DASHBOARD
// =========================================================

var velociaAdminUser = null;

let bookings = [];
let requests = [];
let customers = [];
let cars = [];


// =========================================================
// API HELPER
// =========================================================

async function apiFetch(url, options = {}) {

    const config = {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        }
    };

    return fetch(url, config);
}


// =========================================================
// ADMIN SESSION CHECK
// =========================================================

async function checkAdminSession() {

    try {

        const response = await apiFetch("/api/me");

        if (!response.ok) {
            throw new Error("Not logged in.");
        }

        const data = await response.json();

        console.log("SESSION RESPONSE:", data);

        if (!data.user) {
            throw new Error("User session not found.");
        }

        if (
            String(data.user.role || "").toLowerCase() !== "admin"
        ) {
            throw new Error("Admin access required.");
        }

       velociaAdminUser = data.user;

        // Save only for UI convenience.
        // Authentication is handled by server session.
        localStorage.setItem(
            "velociaUser",
           JSON.stringify(velociaAdminUser)
        );

        document
            .querySelectorAll(".admin-profile strong")
            .forEach(element => {

                element.textContent =
                   velociaAdminUser.name || "Administrator";

            });

         console.log(
            "ADMIN SESSION VERIFIED:",
            velociaAdminUser
        );



        return true;

    } catch (error) {

        console.error(
            "ADMIN AUTHENTICATION ERROR:",
            error
        );

        localStorage.removeItem("velociaUser");

        window.location.replace("../login.html");

        return false;
    }
}


// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionName) {

    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.remove("active");

        });


    const section =
        document.getElementById(sectionName);


    if (!section) {

        console.error(
            "Section not found:",
            sectionName
        );

        return;
    }


    section.classList.add(
        "active-section"
    );


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            if (
                button.getAttribute(
                    "data-section"
                ) === sectionName
            ) {

                button.classList.add(
                    "active"
                );

            }

        });


    const titles = {

        dashboard:
            "Admin Dashboard",

        bookings:
            "Customer Bookings",

        requests:
            "Purchase Requests",

        customers:
            "Registered Customers",

        cars:
            "Car Inventory",

        history:
            "Processing History"
    };


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            titles[sectionName] ||
            "Admin Dashboard";

    }


    if (sectionName === "dashboard") {

        loadDashboardRequests();
        updateDashboardStats();

    }


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


    if (sectionName === "history") {

        loadProcessingHistory();

    }
}


// =========================================================
// LOAD BOOKINGS
// =========================================================

async function loadBookings() {

    const container =
        document.getElementById(
            "bookingTable"
        );

    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading bookings...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/admin/bookings"
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load bookings."
            );

        }


        bookings =
            data.bookings || [];


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
        document.getElementById(
            "bookingTable"
        );

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

        const rawMessage =
            String(
                booking.message || ""
            );


        const customerMatch =
            rawMessage.match(
                /Customer:\s*(.*)/i
            );


        const phoneMatch =
            rawMessage.match(
                /Phone:\s*(.*)/i
            );


        const customerName =
            customerMatch
                ? customerMatch[1].trim()
                : booking.customer_name ||
                  "Unknown";


        const phone =
            phoneMatch
                ? phoneMatch[1].trim()
                : "—";


        const displayMessage =
            rawMessage
                .replace(
                    /Customer:\s*.*(\r?\n|$)/i,
                    ""
                )
                .replace(
                    /Phone:\s*.*(\r?\n|$)/i,
                    ""
                )
                .trim() ||
            "—";


        html += `

            <tr>

                <td>
                    #${escapeHTML(booking.id)}
                </td>


                <td>

                    <span class="customer-name">

                        ${escapeHTML(
                            customerName
                        )}

                    </span>


                    <span class="customer-email">

                        ${escapeHTML(
                            booking.customer_email ||
                            ""
                        )}

                    </span>

                </td>


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


                <td>

                    <strong>

                        ${escapeHTML(
                            booking.brand ||
                            ""
                        )}

                    </strong>

                    <br>

                    ${escapeHTML(
                        booking.car_name ||
                        ""
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        booking.booking_date ||
                        "-"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        booking.booking_time ||
                        "-"
                    )}

                </td>


                <td>

                    <span
                        title="${escapeHTML(
                            displayMessage
                        )}"
                        style="
                            display:block;
                            max-width:220px;
                            white-space:nowrap;
                            overflow:hidden;
                            text-overflow:ellipsis;
                            color:#cbd5e1;
                        "
                    >

                        ${escapeHTML(
                            displayMessage
                        )}

                    </span>

                </td>


                <td>

                    ${statusBadge(
                        booking.status
                    )}

                </td>


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

                            <option
                                value="Pending"
                                ${
                                    booking.status ===
                                    "Pending"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Pending
                            </option>


                            <option
                                value="Approved"
                                ${
                                    booking.status ===
                                    "Approved"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Approved
                            </option>


                            <option
                                value="Rejected"
                                ${
                                    booking.status ===
                                    "Rejected"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Rejected
                            </option>


                            <option
                                value="Completed"
                                ${
                                    booking.status ===
                                    "Completed"
                                        ? "selected"
                                        : ""
                                }
                            >
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
// UPDATE BOOKING STATUS
// =========================================================

async function updateBookingStatus(
    id,
    status
) {

    try {

        const response =
            await apiFetch(
                `/api/admin/bookings/${id}/status`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status
                    })
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to update booking status."
            );

        }


        const booking =
            bookings.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (booking) {

            booking.status =
                status;

        }


        renderBookings();

        await updateDashboardStats();

        await loadProcessingHistory();


        console.log(
            `Booking #${id} status changed to ${status}`
        );


    } catch (error) {

        console.error(
            "UPDATE BOOKING STATUS ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to update booking status."
        );


        await loadBookings();
    }
}


// =========================================================
// VIEW BOOKING
// =========================================================

function viewBooking(id) {

    const booking =
        bookings.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!booking) {

        alert("Booking not found.");

        return;
    }


    const rawMessage =
        String(
            booking.message || ""
        );


    const customerMatch =
        rawMessage.match(
            /Customer:\s*(.*)/i
        );


    const phoneMatch =
        rawMessage.match(
            /Phone:\s*(.*)/i
        );


    const customerName =
        customerMatch
            ? customerMatch[1].trim()
            : booking.customer_name ||
              "Unknown";


    const phone =
        phoneMatch
            ? phoneMatch[1].trim()
            : "—";


    const message =
        rawMessage
            .replace(
                /Customer:\s*.*(\r?\n|$)/i,
                ""
            )
            .replace(
                /Phone:\s*.*(\r?\n|$)/i,
                ""
            )
            .trim() ||
        "No message";


    const modal =
        document.getElementById(
            "bookingModal"
        );


    const content =
        document.getElementById(
            "bookingModalContent"
        );


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
                    ${escapeHTML(
                        customerName
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.customer_email ||
                        "—"
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
                        booking.car_name ||
                        "—"
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        booking.brand ||
                        "—"
                    )}
                </p>

                <strong>
                    ${escapeHTML(
                        booking.price ||
                        "—"
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
                        booking.booking_date ||
                        "—"
                    )}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(
                        booking.booking_time ||
                        "—"
                    )}
                </p>

            </div>


            <div class="detail-section">

                <span class="detail-label">
                    STATUS
                </span>

                <div class="detail-status">
                    ${statusBadge(
                        booking.status
                    )}
                </div>

            </div>


            <div class="detail-section full-detail">

                <span class="detail-label">
                    CUSTOMER MESSAGE
                </span>

                <div class="message-box">
                    ${escapeHTML(message)}
                </div>

            </div>

        </div>
    `;


    modal.classList.add("show");
}


// =========================================================
// CLOSE BOOKING MODAL
// =========================================================

function closeBookingModal() {

    const modal =
        document.getElementById(
            "bookingModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }
}


// =========================================================
// LOAD CUSTOMERS
// =========================================================

async function loadCustomers() {

    const container =
        document.getElementById(
            "customerTable"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading customers...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/admin/users"
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load customers."
            );

        }


        customers =
            (data.users || [])
                .filter(
                    user =>
                        String(
                            user.role || ""
                        ).toLowerCase() ===
                        "customer"
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
                    ${escapeHTML(
                        error.message
                    )}
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
        document.getElementById(
            "customerTable"
        );


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
                    #${escapeHTML(
                        customer.id
                    )}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            customer.name ||
                            "Unknown"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        customer.email ||
                        "-"
                    )}
                </td>

                <td>

                    <span class="status approved">
                        Customer
                    </span>

                </td>

                <td>
                    ${escapeHTML(
                        customer.created_at ||
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


    container.innerHTML = html;
}


// =========================================================
// LOAD PURCHASE REQUESTS
// =========================================================

async function loadRequests() {

    const container =
        document.getElementById(
            "requestTable"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading purchase requests...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/admin/purchase-requests"
            );


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load purchase requests."
            );

        }


        requests =
            data.requests || [];


        renderRequests();


    } catch (error) {

        console.error(
            "PURCHASE REQUEST ERROR:",
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
// RENDER PURCHASE REQUESTS
// =========================================================

function renderRequests() {

    const container =
        document.getElementById(
            "requestTable"
        );


    if (!container) return;


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


    container.innerHTML = html;
}


// =========================================================
// LOAD CARS
// =========================================================

async function loadCars() {

    const container =
        document.getElementById(
            "carTable"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading cars...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/admin/cars"
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load cars."
            );

        }


        cars =
            data.cars || [];


        renderCars();


        const carCount =
            document.getElementById(
                "carCount"
            );


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

                <strong>
                    Unable to load cars.
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
// RENDER CARS
// =========================================================

function renderCars() {

    const container =
        document.getElementById(
            "carTable"
        );


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
                                    src="${escapeHTML(
                                        image
                                    )}"
                                    class="car-image"
                                    alt="${escapeHTML(
                                        car.name ||
                                        "Car"
                                    )}"
                                >
                            `

                            : `
                                <div class="car-image"></div>
                            `
                    }

                </td>


                <td>

                    <span class="car-brand">

                        ${escapeHTML(
                            car.brand ||
                            "-"
                        )}

                    </span>

                </td>


                <td>

                    <span class="car-name">

                        ${escapeHTML(
                            car.name ||
                            "-"
                        )}

                    </span>

                </td>


                <td>

                    ${escapeHTML(
                        car.price ||
                        "-"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        car.year ||
                        "-"
                    )}

                </td>


                <td>

                    ${statusBadge(
                        car.status
                    )}

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
        document.getElementById(
            "carModal"
        );


    const form =
        document.getElementById(
            "carForm"
        );


    if (!modal || !form) {

        console.error(
            "Car modal or form not found."
        );

        return;
    }


    form.reset();


    document.getElementById(
        "carId"
    ).value = "";


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Add New Car";


    modal.classList.add(
        "show"
    );
}


// =========================================================
// CLOSE CAR MODAL
// =========================================================

function closeCarModal() {

    const modal =
        document.getElementById(
            "carModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }
}


// =========================================================
// EDIT CAR
// =========================================================

function editCar(id) {

    const car =
        cars.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!car) {

        alert("Car not found.");

        return;
    }


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Edit Vehicle";


    document.getElementById(
        "carId"
    ).value =
        car.id;


    document.getElementById(
        "carBrand"
    ).value =
        car.brand || "";


    document.getElementById(
        "carName"
    ).value =
        car.name || "";


    document.getElementById(
        "carPrice"
    ).value =
        car.price || "";


    document.getElementById(
        "carYear"
    ).value =
        car.year || "";


    document.getElementById(
        "carEngine"
    ).value =
        car.engine || "";


    document.getElementById(
        "carPower"
    ).value =
        car.power || "";


    document.getElementById(
        "carTransmission"
    ).value =
        car.transmission || "";


    document.getElementById(
        "carFuel"
    ).value =
        car.fuel || "";


    document.getElementById(
        "carBody"
    ).value =
        car.body_type || "";


    document.getElementById(
        "carStatus"
    ).value =
        car.status ||
        "Available";


    document.getElementById(
        "carImage"
    ).value =
        car.image || "";


    document.getElementById(
        "carDescription"
    ).value =
        car.description || "";


    document
        .getElementById("carModal")
        .classList.add("show");
}


// =========================================================
// SAVE CAR
// =========================================================

function setupCarForm() {

    const carForm =
        document.getElementById(
            "carForm"
        );


    if (!carForm) return;


    carForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "carId"
                ).value;


            const carData = {

                brand:
                    document
                        .getElementById(
                            "carBrand"
                        )
                        .value
                        .trim(),

                name:
                    document
                        .getElementById(
                            "carName"
                        )
                        .value
                        .trim(),

                price:
                    document
                        .getElementById(
                            "carPrice"
                        )
                        .value
                        .trim(),

                year:
                    document
                        .getElementById(
                            "carYear"
                        )
                        .value,

                engine:
                    document
                        .getElementById(
                            "carEngine"
                        )
                        .value
                        .trim(),

                power:
                    document
                        .getElementById(
                            "carPower"
                        )
                        .value
                        .trim(),

                transmission:
                    document
                        .getElementById(
                            "carTransmission"
                        )
                        .value
                        .trim(),

                fuel:
                    document
                        .getElementById(
                            "carFuel"
                        )
                        .value
                        .trim(),

                body_type:
                    document
                        .getElementById(
                            "carBody"
                        )
                        .value
                        .trim(),

                image:
                    document
                        .getElementById(
                            "carImage"
                        )
                        .value
                        .trim(),

                description:
                    document
                        .getElementById(
                            "carDescription"
                        )
                        .value
                        .trim(),

                status:
                    document
                        .getElementById(
                            "carStatus"
                        )
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
                    await apiFetch(
                        url,
                        {
                            method,
                            body:
                                JSON.stringify(
                                    carData
                                )
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


// =========================================================
// DELETE CAR
// =========================================================

async function deleteCar(id) {

    const car =
        cars.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!car) return;


    const confirmed =
        confirm(
            `Are you sure you want to delete "${car.name}"?`
        );


    if (!confirmed) return;


    try {

        const response =
            await apiFetch(
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
// DASHBOARD RECENT ACTIVITY
// =========================================================

async function loadDashboardRequests() {

    const container =
        document.getElementById(
            "dashboardRequests"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading recent activity...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/admin/purchase-requests"
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load activity."
            );

        }


        const list =
            data.requests || [];


        if (!list.length) {

            container.innerHTML = `
                <div class="empty">
                    No recent purchase requests.
                </div>
            `;

            return;
        }


        const latest =
            list.slice(0, 5);


        let html = "";


        latest.forEach(request => {

            html += `

                <div class="activity-item">

                    <div>

                        <strong>

                            ${escapeHTML(
                                request.customer_name ||
                                "Customer"
                            )}

                        </strong>


                        <small>

                            ${escapeHTML(
                                request.brand ||
                                ""
                            )}

                            ${escapeHTML(
                                request.car_name ||
                                ""
                            )}

                        </small>

                    </div>


                    <div>

                        ${statusBadge(
                            request.status ||
                            "Pending"
                        )}

                    </div>

                </div>
            `;
        });


        container.innerHTML =
            html;


    } catch (error) {

        console.error(
            "DASHBOARD REQUEST ERROR:",
            error
        );


        container.innerHTML = `
            <div class="empty">
                Unable to load recent activity.
            </div>
        `;
    }
}


// =========================================================
// DASHBOARD STATISTICS
// =========================================================

async function updateDashboardStats() {

    try {

        const [
            usersResponse,
            bookingsResponse,
            requestsResponse,
            carsResponse
        ] = await Promise.all([

            apiFetch(
                "/api/admin/users"
            ),

            apiFetch(
                "/api/admin/bookings"
            ),

            apiFetch(
                "/api/admin/purchase-requests"
            ),

            apiFetch(
                "/api/admin/cars"
            )

        ]);


        const usersData =
            await usersResponse.json();


        const bookingsData =
            await bookingsResponse.json();


        const requestsData =
            await requestsResponse.json();


        const carsData =
            await carsResponse.json();


        const customersList =
            (usersData.users || [])
                .filter(
                    user =>
                        String(
                            user.role || ""
                        ).toLowerCase() ===
                        "customer"
                );


        const bookingsList =
            bookingsData.bookings ||
            [];


        const requestsList =
            requestsData.requests ||
            [];


        const carsList =
            carsData.cars ||
            [];


        const customerCount =
            document.getElementById(
                "customerCount"
            );


        if (customerCount) {

            customerCount.textContent =
                customersList.length;

        }


        const bookingCount =
            document.getElementById(
                "bookingCount"
            );


        if (bookingCount) {

            bookingCount.textContent =
                bookingsList.length;

        }


        const requestCount =
            document.getElementById(
                "requestCount"
            );


        if (requestCount) {

            requestCount.textContent =
                requestsList.length;

        }


        const carCount =
            document.getElementById(
                "carCount"
            );


        if (carCount) {

            carCount.textContent =
                carsList.length;

        }


        const pendingCount =
            document.getElementById(
                "pendingCount"
            );


        if (pendingCount) {

            const pending =
                requestsList.filter(
                    request =>
                        String(
                            request.status ||
                            ""
                        ).toLowerCase() ===
                        "pending"
                ).length;


            pendingCount.textContent =
                pending;

        }


    } catch (error) {

        console.error(
            "DASHBOARD STATS ERROR:",
            error
        );
    }
}


// =========================================================
// PROCESSING HISTORY
// =========================================================

async function loadProcessingHistory() {

    const container =
        document.getElementById(
            "processingHistoryTable"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            Loading processing history...
        </div>
    `;


    try {

        const [
            bookingsResponse,
            requestsResponse
        ] = await Promise.all([

            apiFetch(
                "/api/admin/bookings"
            ),

            apiFetch(
                "/api/admin/purchase-requests"
            )

        ]);


        const bookingsData =
            await bookingsResponse.json();


        const requestsData =
            await requestsResponse.json();


        const bookingHistory =
            (bookingsData.bookings || [])
                .map(item => ({

                    type: "Booking",

                    id: item.id,

                    customer:
                        item.customer_name ||
                        "Unknown",

                    email:
                        item.customer_email ||
                        "-",

                    vehicle:
                        `${item.brand || ""} ${
                            item.car_name || ""
                        }`.trim(),

                    status:
                        item.status ||
                        "Pending",

                    date:
                        item.created_at ||
                        item.booking_date ||
                        "-"

                }));


        const requestHistory =
            (requestsData.requests || [])
                .map(item => ({

                    type:
                        "Purchase Request",

                    id: item.id,

                    customer:
                        item.customer_name ||
                        "Unknown",

                    email:
                        item.customer_email ||
                        "-",

                    vehicle:
                        `${item.brand || ""} ${
                            item.car_name || ""
                        }`.trim(),

                    status:
                        item.status ||
                        "Pending",

                    date:
                        item.created_at ||
                        "-"

                }));


        const history = [

            ...bookingHistory,

            ...requestHistory

        ];


        history.sort(
            (a, b) =>
                String(b.date)
                    .localeCompare(
                        String(a.date)
                    )
        );


        if (!history.length) {

            container.innerHTML = `
                <div class="empty">
                    No processing history available.
                </div>
            `;

            return;
        }


        let html = `

            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>

                            <th>Type</th>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Email</th>
                            <th>Vehicle</th>
                            <th>Status</th>
                            <th>Date</th>

                        </tr>

                    </thead>

                    <tbody>
        `;


        history.forEach(item => {

            html += `

                <tr>

                    <td>

                        <span class="history-type">

                            ${escapeHTML(
                                item.type
                            )}

                        </span>

                    </td>


                    <td>

                        #${escapeHTML(
                            item.id
                        )}

                    </td>


                    <td>

                        <strong>

                            ${escapeHTML(
                                item.customer
                            )}

                        </strong>

                    </td>


                    <td>

                        ${escapeHTML(
                            item.email
                        )}

                    </td>


                    <td>

                        ${escapeHTML(
                            item.vehicle ||
                            "-"
                        )}

                    </td>


                    <td>

                        ${statusBadge(
                            item.status
                        )}

                    </td>


                    <td>

                        ${escapeHTML(
                            item.date
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


        container.innerHTML =
            html;


    } catch (error) {

        console.error(
            "PROCESSING HISTORY ERROR:",
            error
        );


        container.innerHTML = `
            <div class="empty">

                <strong>
                    Unable to load processing history.
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
            .replace(
                /\s+/g,
                "-"
            );


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

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// =========================================================
// LOGOUT
// =========================================================

async function logoutAdmin() {

    try {

        await apiFetch(
            "/api/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    velociaAdminUser = null;

    localStorage.removeItem(
        "velociaUser"
    );

    sessionStorage.clear();


    window.location.replace(
        "../login.html"
    );
}


// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "VELOCIA ADMIN JS LOADED"
        );


        const authenticated =
            await checkAdminSession();


        if (!authenticated) {

            return;

        }


        setupCarForm();


        await Promise.all([

            loadDashboardRequests(),

            loadBookings(),

            loadCustomers(),

            loadRequests(),

            loadCars(),

            loadProcessingHistory()

        ]);


        await updateDashboardStats();


        console.log(
            "VELOCIA ADMIN DASHBOARD READY"
        );

    }
);