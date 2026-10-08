const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./database");

const app = express();

const PORT = process.env.PORT || 3000;

// ==========================================
// TRUST PROXY
// ==========================================

app.set("trust proxy", 1);

// ==========================================
// BODY PARSING
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// SESSION
// ==========================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "velocia-motors-change-this-secret",

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// ==========================================
// STATIC FILES
// ==========================================

app.use(express.static("public"));

// ==========================================
// AUTH HELPERS
// ==========================================

async function getUserById(id) {
    const result = await db`
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM users
        WHERE id = ${id}
        LIMIT 1
    `;

    return result[0] || null;
}

async function requireLogin(req, res, next) {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const currentUser = await getUserById(
            req.session.user.id
        );

        if (!currentUser) {
            return req.session.destroy(() => {
                res.status(401).json({
                    success: false,
                    message: "User account not found."
                });
            });
        }

        req.currentUser = currentUser;
        next();

    } catch (error) {
        console.error("LOGIN AUTH ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Authentication error."
        });
    }
}

async function requireAdmin(req, res, next) {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const currentUser = await getUserById(
            req.session.user.id
        );

        if (!currentUser) {
            return req.session.destroy(() => {
                res.status(401).json({
                    success: false,
                    message: "User account not found."
                });
            });
        }

        if (
            String(currentUser.role).toLowerCase() !==
            "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        req.admin = currentUser;
        req.currentUser = currentUser;

        next();

    } catch (error) {
        console.error("ADMIN AUTH ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Authentication error."
        });
    }
}

// ==========================================
// TEST
// ==========================================

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "VELOCIA MOTORS server is working!"
    });
});

app.get("/api/cars-test", (req, res) => {
    res.json({
        success: true,
        message: "CARS TEST ROUTE IS WORKING!"
    });
});

// ==========================================
// REGISTER
// ==========================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters."
            });
        }

        const cleanEmail =
            String(email).trim().toLowerCase();

        const existingUser = await db`
            SELECT id
            FROM users
            WHERE LOWER(email) = ${cleanEmail}
            LIMIT 1
        `;

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const result = await db`
            INSERT INTO users
            (
                name,
                email,
                password_hash,
                role
            )
            VALUES
            (
                ${String(name).trim()},
                ${cleanEmail},
                ${passwordHash},
                'customer'
            )
            RETURNING id
        `;

        res.status(201).json({
            success: true,
            message:
                "Account created successfully!",
            userId: result[0].id
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            success: false,
            message:
                "Server error while creating account."
        });
    }
});

// ==========================================
// LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required."
            });
        }

        const cleanEmail =
            String(email).trim().toLowerCase();

        const result = await db`
            SELECT
                id,
                name,
                email,
                password_hash,
                role
            FROM users
            WHERE LOWER(email) = ${cleanEmail}
            LIMIT 1
        `;

        const user = result[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        req.session.regenerate(error => {
            if (error) {
                console.error(
                    "SESSION REGENERATE ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to create login session."
                });
            }

            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            req.session.save(saveError => {
                if (saveError) {
                    console.error(
                        "SESSION SAVE ERROR:",
                        saveError
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to save login session."
                    });
                }

                res.json({
                    success: true,
                    message: "Login successful!",
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            });
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message:
                "Server error during login."
        });
    }
});

// ==========================================
// CURRENT USER
// ==========================================

app.get(
    "/api/me",
    requireLogin,
    (req, res) => {
        res.json({
            success: true,
            user: req.currentUser
        });
    }
);

// ==========================================
// LOGOUT
// ==========================================

app.post("/api/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) {
            console.error(
                "LOGOUT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to logout."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message:
                "Logged out successfully."
        });
    });
});

// ==========================================
// PUBLIC — ALL CARS
// ==========================================

app.get("/api/cars", async (req, res) => {
    try {
        const cars = await db`
            SELECT *
            FROM cars
            ORDER BY id ASC
        `;

        res.json({
            success: true,
            cars
        });

    } catch (error) {
        console.error(
            "GET ALL CARS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to load cars."
        });
    }
});

// ==========================================
// PUBLIC — SINGLE CAR
// ==========================================

app.get("/api/cars/:id", async (req, res) => {
    try {
        const result = await db`
            SELECT *
            FROM cars
            WHERE id = ${req.params.id}
            LIMIT 1
        `;

        const car = result[0];

        if (!car) {
            return res.status(404).json({
                success: false,
                message: "Car not found."
            });
        }

        res.json({
            success: true,
            car
        });

    } catch (error) {
        console.error(
            "GET SINGLE CAR ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to load car."
        });
    }
});

// ==========================================
// CREATE BOOKING — CUSTOMER
// ==========================================

app.post(
    "/api/bookings",
    requireLogin,
    async (req, res) => {
        try {
            const {
                car_id,
                booking_date,
                booking_time,
                message
            } = req.body;

            const user_id =
                req.currentUser.id;

            if (
                !car_id ||
                !booking_date ||
                !booking_time
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Car, date and time are required."
                });
            }

            const car = await db`
                SELECT id
                FROM cars
                WHERE id = ${car_id}
                LIMIT 1
            `;

            if (car.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            const result = await db`
                INSERT INTO bookings
                (
                    user_id,
                    car_id,
                    booking_date,
                    booking_time,
                    message,
                    status
                )
                VALUES
                (
                    ${user_id},
                    ${car_id},
                    ${booking_date},
                    ${booking_time},
                    ${message || ""},
                    'Pending'
                )
                RETURNING id
            `;

            res.status(201).json({
                success: true,
                message:
                    "Inspection booking submitted successfully!",
                bookingId: result[0].id
            });

        } catch (error) {
            console.error(
                "BOOKING ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create booking."
            });
        }
    }
);

// ==========================================
// CUSTOMER BOOKINGS
// ==========================================

app.get(
    "/api/bookings/user/:userId",
    requireLogin,
    async (req, res) => {
        try {
            const requestedUserId =
                Number(req.params.userId);

            if (
                requestedUserId !==
                Number(req.currentUser.id)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You can only view your own bookings."
                });
            }

            const bookings = await db`
                SELECT
                    bookings.id,
                    bookings.booking_date,
                    bookings.booking_time,
                    bookings.message,
                    bookings.status,
                    bookings.created_at,

                    cars.brand,
                    cars.name,
                    cars.price,
                    cars.image

                FROM bookings

                INNER JOIN cars
                    ON bookings.car_id = cars.id

                WHERE bookings.user_id =
                    ${req.currentUser.id}

                ORDER BY bookings.id DESC
            `;

            res.json({
                success: true,
                bookings
            });

        } catch (error) {
            console.error(
                "CUSTOMER BOOKINGS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load bookings."
            });
        }
    }
);

// ==========================================
// CREATE PURCHASE REQUEST — CUSTOMER
// ==========================================

app.post(
    "/api/purchase-requests",
    requireLogin,
    async (req, res) => {
        try {
            const {
                car_id,
                message,
                quiz_result_id
            } = req.body;

            const user_id =
                req.currentUser.id;

            if (!car_id) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Car is required."
                });
            }

            const car = await db`
                SELECT id
                FROM cars
                WHERE id = ${car_id}
                LIMIT 1
            `;

            if (car.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            if (quiz_result_id) {
                const quizResult = await db`
                    SELECT id
                    FROM quiz_results
                    WHERE id = ${quiz_result_id}
                    AND user_id = ${user_id}
                    AND car_id = ${car_id}
                    LIMIT 1
                `;

                if (quizResult.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Quiz result not found for this customer and car."
                    });
                }
            }

            const result = await db`
                INSERT INTO purchase_requests
                (
                    user_id,
                    car_id,
                    message,
                    status,
                    quiz_result_id
                )
                VALUES
                (
                    ${user_id},
                    ${car_id},
                    ${message || ""},
                    'Pending',
                    ${quiz_result_id || null}
                )
                RETURNING id
            `;

            const savedRequest = await db`
                SELECT
                    pr.id,
                    pr.user_id,
                    pr.car_id,
                    pr.message,
                    pr.status,
                    pr.quiz_result_id,
                    pr.created_at,

                    u.name AS customer_name,
                    u.email AS customer_email,

                    c.brand,
                    c.name AS car_name,
                    c.price,

                    qr.score AS quiz_score,
                    qr.total_questions
                        AS quiz_total_questions,
                    qr.correct_answers
                        AS quiz_correct_answers,
                    qr.wrong_answers
                        AS quiz_wrong_answers,
                    qr.preference
                        AS quiz_preference

                FROM purchase_requests pr

                LEFT JOIN users u
                    ON pr.user_id = u.id

                LEFT JOIN cars c
                    ON pr.car_id = c.id

                LEFT JOIN quiz_results qr
                    ON pr.quiz_result_id = qr.id

                WHERE pr.id = ${result[0].id}
            `;

            res.status(201).json({
                success: true,
                message:
                    "Purchase request submitted successfully!",
                requestId: result[0].id,
                request:
                    savedRequest[0] || null
            });

        } catch (error) {
            console.error(
                "PURCHASE REQUEST ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create purchase request.",
                error: error.message
            });
        }
    }
);

// ==========================================
// CUSTOMER PURCHASE REQUESTS
// ==========================================

app.get(
    "/api/purchase-requests/user/:userId",
    requireLogin,
    async (req, res) => {
        try {
            const requestedUserId =
                Number(req.params.userId);

            if (
                requestedUserId !==
                Number(req.currentUser.id)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You can only view your own purchase requests."
                });
            }

            const requests = await db`
                SELECT
                    pr.id,
                    pr.message,
                    pr.status,
                    pr.created_at,
                    pr.quiz_result_id,

                    cars.brand,
                    cars.name,
                    cars.price,
                    cars.image,

                    qr.score AS quiz_score,
                    qr.total_questions
                        AS quiz_total_questions,
                    qr.correct_answers
                        AS quiz_correct_answers,
                    qr.wrong_answers
                        AS quiz_wrong_answers,
                    qr.preference
                        AS quiz_preference,
                    qr.result_data
                        AS quiz_result_data

                FROM purchase_requests pr

                INNER JOIN cars
                    ON pr.car_id = cars.id

                LEFT JOIN quiz_results qr
                    ON pr.quiz_result_id = qr.id

                WHERE pr.user_id =
                    ${req.currentUser.id}

                ORDER BY pr.id DESC
            `;

            res.json({
                success: true,
                requests
            });

        } catch (error) {
            console.error(
                "PURCHASE REQUESTS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load purchase requests.",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN — ALL BOOKINGS
// ==========================================

app.get(
    "/api/admin/bookings",
    requireAdmin,
    async (req, res) => {
        try {
            const bookings = await db`
                SELECT
                    bookings.id,
                    bookings.booking_date,
                    bookings.booking_time,
                    bookings.message,
                    bookings.status,
                    bookings.created_at,

                    users.id AS user_id,
                    users.name AS customer_name,
                    users.email AS customer_email,

                    cars.id AS car_id,
                    cars.brand,
                    cars.name AS car_name,
                    cars.price

                FROM bookings

                INNER JOIN users
                    ON bookings.user_id = users.id

                INNER JOIN cars
                    ON bookings.car_id = cars.id

                ORDER BY bookings.id DESC
            `;

            res.json({
                success: true,
                bookings
            });

        } catch (error) {
            console.error(
                "ADMIN BOOKINGS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load bookings."
            });
        }
    }
);

// ==========================================
// ADMIN — UPDATE BOOKING STATUS
// ==========================================

app.put(
    "/api/admin/bookings/:id/status",
    requireAdmin,
    async (req, res) => {
        try {
            const { status } = req.body;

            const allowedStatuses = [
                "Pending",
                "Approved",
                "Rejected",
                "Completed"
            ];

            if (
                !allowedStatuses.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid booking status."
                });
            }

            const booking = await db`
                SELECT id
                FROM bookings
                WHERE id = ${req.params.id}
                LIMIT 1
            `;

            if (booking.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found."
                });
            }

            await db`
                UPDATE bookings
                SET status = ${status}
                WHERE id = ${req.params.id}
            `;

            res.json({
                success: true,
                message:
                    "Booking status updated successfully."
            });

        } catch (error) {
            console.error(
                "UPDATE BOOKING ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update booking status."
            });
        }
    }
);

// ==========================================
// ADMIN — ALL PURCHASE REQUESTS
// ==========================================

app.get(
    "/api/admin/purchase-requests",
    requireAdmin,
    async (req, res) => {
        try {
            const requests = await db`
                SELECT
                    purchase_requests.id,
                    purchase_requests.message,
                    purchase_requests.status,
                    purchase_requests.created_at,

                    users.id AS user_id,
                    users.name AS customer_name,
                    users.email AS customer_email,

                    cars.id AS car_id,
                    cars.brand,
                    cars.name AS car_name,
                    cars.price,
                    cars.image,

                    purchase_requests.quiz_result_id,

                    quiz_results.score
                        AS quiz_score,
                    quiz_results.total_questions
                        AS quiz_total_questions,
                    quiz_results.correct_answers
                        AS quiz_correct_answers,
                    quiz_results.wrong_answers
                        AS quiz_wrong_answers,
                    quiz_results.preference
                        AS quiz_preference,
                    quiz_results.result_data
                        AS quiz_result_data,
                    quiz_results.created_at
                        AS quiz_created_at

                FROM purchase_requests

                INNER JOIN users
                    ON purchase_requests.user_id = users.id

                INNER JOIN cars
                    ON purchase_requests.car_id = cars.id

                LEFT JOIN quiz_results
                    ON purchase_requests.quiz_result_id =
                       quiz_results.id

                ORDER BY
                    purchase_requests.id DESC
            `;

            res.json({
                success: true,
                requests
            });

        } catch (error) {
            console.error(
                "ADMIN PURCHASE REQUESTS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load purchase requests.",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN — GET CUSTOMERS
// ==========================================

app.get(
    "/api/admin/users",
    requireAdmin,
    async (req, res) => {
        try {
            const users = await db`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                FROM users
                WHERE role = 'customer'
                ORDER BY id DESC
            `;

            res.json({
                success: true,
                users
            });

        } catch (error) {
            console.error(
                "ADMIN USERS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load customers.",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN — GET ALL CARS
// ==========================================

app.get(
    "/api/admin/cars",
    requireAdmin,
    async (req, res) => {
        try {
            const cars = await db`
                SELECT *
                FROM cars
                ORDER BY id DESC
            `;

            res.json({
                success: true,
                cars
            });

        } catch (error) {
            console.error(
                "ADMIN CARS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load cars."
            });
        }
    }
);

// ==========================================
// ADMIN — ADD CAR
// ==========================================

app.post(
    "/api/admin/cars",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                brand,
                name,
                price,
                year,
                engine,
                power,
                transmission,
                fuel,
                body_type,
                image,
                description,
                status
            } = req.body;

            if (
                !brand ||
                !name ||
                !price
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Brand, car name and price are required."
                });
            }

            const result = await db`
                INSERT INTO cars
                (
                    brand,
                    name,
                    price,
                    year,
                    engine,
                    power,
                    transmission,
                    fuel,
                    body_type,
                    image,
                    description,
                    status
                )
                VALUES
                (
                    ${brand},
                    ${name},
                    ${price},
                    ${year || null},
                    ${engine || ""},
                    ${power || ""},
                    ${transmission || ""},
                    ${fuel || ""},
                    ${body_type || ""},
                    ${image || ""},
                    ${description || ""},
                    ${status || "Available"}
                )
                RETURNING *
            `;

            res.json({
                success: true,
                message:
                    "Car added successfully.",
                car: result[0]
            });

        } catch (error) {
            console.error(
                "ADD CAR ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add car.",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN — UPDATE CAR
// ==========================================

app.put(
    "/api/admin/cars/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                brand,
                name,
                price,
                year,
                engine,
                power,
                transmission,
                fuel,
                body_type,
                image,
                description,
                status
            } = req.body;

            if (
                !brand ||
                !name ||
                !price
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Brand, car name and price are required."
                });
            }

            const existingCar = await db`
                SELECT id
                FROM cars
                WHERE id = ${req.params.id}
                LIMIT 1
            `;

            if (existingCar.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            const result = await db`
                UPDATE cars
                SET
                    brand = ${brand},
                    name = ${name},
                    price = ${price},
                    year = ${year || null},
                    engine = ${engine || ""},
                    power = ${power || ""},
                    transmission = ${transmission || ""},
                    fuel = ${fuel || ""},
                    body_type = ${body_type || ""},
                    image = ${image || ""},
                    description = ${description || ""},
                    status = ${status || "Available"}
                WHERE id = ${req.params.id}
                RETURNING *
            `;

            res.json({
                success: true,
                message:
                    "Car updated successfully.",
                car: result[0]
            });

        } catch (error) {
            console.error(
                "UPDATE CAR ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update car.",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN — DELETE CAR
// ==========================================

app.delete(
    "/api/admin/cars/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const existingCar = await db`
                SELECT id
                FROM cars
                WHERE id = ${req.params.id}
                LIMIT 1
            `;

            if (existingCar.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            await db`
                DELETE FROM cars
                WHERE id = ${req.params.id}
            `;

            res.json({
                success: true,
                message:
                    "Car deleted successfully."
            });

        } catch (error) {
            console.error(
                "DELETE CAR ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete car.",
                error: error.message
            });
        }
    }
);

// ==========================================
// QUIZ — GET QUESTIONS
// ==========================================

app.get(
    "/api/quiz/questions",
    async (req, res) => {
        try {
            const questions = await db`
                SELECT
                    id,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    category
                FROM quiz_questions
                ORDER BY id ASC
            `;

            res.json({
                success: true,
                questions
            });

        } catch (error) {
            console.error(
                "QUIZ QUESTIONS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load quiz questions.",
                error: error.message
            });
        }
    }
);

// ==========================================
// QUIZ — SAVE RESULT — CUSTOMER
// ==========================================

app.post(
    "/api/quiz/results",
    requireLogin,
    async (req, res) => {
        try {
            const {
                car_id,
                score,
                total_questions,
                preference,
                result_data
            } = req.body;

            const user_id =
                req.currentUser.id;

            if (
                score === undefined ||
                !total_questions
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Score and total questions are required."
                });
            }

            if (!car_id) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Car is required for quiz result."
                });
            }

            const car = await db`
                SELECT id
                FROM cars
                WHERE id = ${car_id}
                LIMIT 1
            `;

            if (car.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            let parsedResult = {};

            try {
                parsedResult =
                    typeof result_data === "string"
                        ? JSON.parse(result_data)
                        : result_data || {};
            } catch (error) {
                console.error(
                    "RESULT DATA PARSE ERROR:",
                    error
                );
            }

            const submittedAnswers =
                Array.isArray(
                    parsedResult.answers
                )
                    ? parsedResult.answers
                    : [];

            const questionIds =
                Array.isArray(
                    parsedResult.question_ids
                )
                    ? parsedResult.question_ids
                    : [];

            const questions = await db`
                SELECT
                    id,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    correct_answer,
                    category
                FROM quiz_questions
                ORDER BY id ASC
            `;

            let correctAnswers = 0;
            let knowledgeQuestions = 0;

            questions.forEach(question => {
                const category =
                    String(
                        question.category || ""
                    )
                        .trim()
                        .toLowerCase();

                if (category === "preference") {
                    return;
                }

                knowledgeQuestions++;

                let answerIndex =
                    questionIds.indexOf(
                        question.id
                    );

                if (answerIndex === -1) {
                    answerIndex =
                        questions.findIndex(
                            q =>
                                q.id ===
                                question.id
                        );
                }

                const selected =
                    String(
                        submittedAnswers[
                            answerIndex
                        ] || ""
                    )
                        .trim()
                        .toUpperCase();

                const correct =
                    String(
                        question.correct_answer ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                if (
                    selected === correct
                ) {
                    correctAnswers++;
                    return;
                }

                const optionMap = {
                    A: String(
                        question.option_a || ""
                    )
                        .trim()
                        .toUpperCase(),

                    B: String(
                        question.option_b || ""
                    )
                        .trim()
                        .toUpperCase(),

                    C: String(
                        question.option_c || ""
                    )
                        .trim()
                        .toUpperCase(),

                    D: String(
                        question.option_d || ""
                    )
                        .trim()
                        .toUpperCase()
                };

                const selectedText =
                    optionMap[selected] || "";

                if (
                    selectedText &&
                    selectedText === correct
                ) {
                    correctAnswers++;
                }
            });

            const wrongAnswers =
                Math.max(
                    0,
                    knowledgeQuestions -
                        correctAnswers
                );

            const result = await db`
                INSERT INTO quiz_results
                (
                    user_id,
                    car_id,
                    total_questions,
                    correct_answers,
                    wrong_answers,
                    score,
                    result_data,
                    preference
                )
                VALUES
                (
                    ${user_id},
                    ${car_id},
                    ${knowledgeQuestions},
                    ${correctAnswers},
                    ${wrongAnswers},
                    ${correctAnswers},
                    ${JSON.stringify(parsedResult)},
                    ${preference || "Balanced"}
                )
                RETURNING id
            `;

            const savedResult = await db`
                SELECT
                    qr.*,

                    u.name AS customer_name,
                    u.email AS customer_email,

                    c.brand,
                    c.name AS car_name,
                    c.price

                FROM quiz_results qr

                LEFT JOIN users u
                    ON qr.user_id = u.id

                LEFT JOIN cars c
                    ON qr.car_id = c.id

                WHERE qr.id = ${result[0].id}
            `;

            res.json({
                success: true,
                message:
                    "Quiz result saved successfully.",
                result:
                    savedResult[0] || null
            });

        } catch (error) {
            console.error(
                "SAVE QUIZ RESULT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to save quiz result.",
                error: error.message
            });
        }
    }
);
// ==========================================
// WHATSAPP CLOUD API
// ==========================================

async function sendWhatsAppOrderNotification(order) {
    try {
        const token = process.env.WHATSAPP_TOKEN;
        const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID;
        const recipient =
            process.env.WHATSAPP_RECIPIENT;

        if (!token || !phoneNumberId || !recipient) {
            console.error(
                "WHATSAPP ERROR: Required environment variables are missing."
            );

            return {
                success: false,
                message: "WhatsApp environment variables are missing."
            };
        }

        const apiVersion =
            process.env.WHATSAPP_API_VERSION || "v23.0";

        const message = [
            "🚗 VELOCIA MOTORS — NEW ORDER",
            "",
            `Order ID: ${order.order_id}`,
            `Customer: ${order.customer_name}`,
            `Phone: ${order.phone}`,
            `Email: ${order.email || "Not provided"}`,
            `Address: ${order.address || "Not provided"}`,
            "",
            `Car: ${order.car_name}`,
            `Price: ${order.car_price || "Not provided"}`,
            `Order Type: ${order.order_type || "Purchase Request"}`,
            `Preferred Contact: ${order.preferred_contact || "WhatsApp"}`,
            "",
            `Message: ${order.message || "No message"}`,
            "",
            "Status: Pending"
        ].join("\n");

        const response = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: "text",
                    text: {
                        preview_url: false,
                        body: message
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "WHATSAPP API ERROR:",
                data
            );

            return {
                success: false,
                message:
                    data?.error?.message ||
                    "WhatsApp API request failed.",
                data
            };
        }

        console.log(
            "WHATSAPP NOTIFICATION SENT:",
            data
        );

        return {
            success: true,
            data
        };

    } catch (error) {
        console.error(
            "WHATSAPP SEND ERROR:",
            error
        );

        return {
            success: false,
            message: error.message
        };
    }
}
// ==========================================
// CREATE ORDER — PUBLIC CUSTOMER
// ==========================================

app.post("/api/orders", async (req, res) => {
    try {
        const {
            order_id,
            customer_name,
            phone,
            email,
            address,
            car_name,
            car_price,
            order_type,
            preferred_contact,
            message
        } = req.body;

        if (
            !order_id ||
            !customer_name ||
            !phone ||
            !car_name
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Order ID, customer name, phone and car name are required."
            });
        }

        const existingOrder = await db`
            SELECT id
            FROM orders
            WHERE order_id = ${order_id}
            LIMIT 1
        `;

        if (existingOrder.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This order already exists."
            });
        }

        const result = await db`
            INSERT INTO orders
            (
                order_id,
                customer_name,
                phone,
                email,
                address,
                car_name,
                car_price,
                order_type,
                preferred_contact,
                message,
                status
            )
            VALUES
            (
                ${String(order_id).trim()},
                ${String(customer_name).trim()},
                ${String(phone).trim()},
                ${email || ""},
                ${address || ""},
                ${String(car_name).trim()},
                ${car_price || ""},
                ${order_type || "Purchase Request"},
                ${preferred_contact || "WhatsApp"},
                ${message || ""},
                'Pending'
            )
            RETURNING *
        `;

        const order = result[0];

        console.log(
            "NEW ORDER:",
            order.order_id
        );

        // ======================================
        // SEND WHATSAPP NOTIFICATION
        // ======================================

        const whatsappResult =
            await sendWhatsAppOrderNotification(order);

        if (!whatsappResult.success) {
            console.error(
                "ORDER SAVED BUT WHATSAPP FAILED:",
                whatsappResult.message
            );
        }

        res.status(201).json({
            success: true,

            message:
                "Order submitted successfully!",

            order,

            whatsapp: {
                sent:
                    whatsappResult.success
            }
        });

    } catch (error) {
        console.error(
            "CREATE ORDER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to create order."
        });
    }
});
// ==========================================
// WHATSAPP WEBHOOK VERIFICATION
// ==========================================

app.get("/webhook/whatsapp", (req, res) => {
    const mode =
        req.query["hub.mode"];

    const token =
        req.query["hub.verify_token"];

    const challenge =
        req.query["hub.challenge"];

    const verifyToken =
        process.env.WHATSAPP_VERIFY_TOKEN;

    if (
        mode === "subscribe" &&
        token === verifyToken
    ) {
        console.log(
            "WHATSAPP WEBHOOK VERIFIED"
        );

        return res
            .status(200)
            .send(challenge);
    }

    console.error(
        "WHATSAPP WEBHOOK VERIFICATION FAILED"
    );

    res.sendStatus(403);
});


// ==========================================
// WHATSAPP WEBHOOK EVENTS
// ==========================================

app.post("/webhook/whatsapp", (req, res) => {
    console.log(
        "WHATSAPP WEBHOOK EVENT:",
        JSON.stringify(
            req.body,
            null,
            2
        )
    );

    res.sendStatus(200);
});
// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            "       VELOCIA MOTORS SERVER"
        );
        console.log(
            "======================================"
        );

        console.log(
            `Server running at: http://0.0.0.0:${PORT}`
        );

        console.log(
            "Supabase PostgreSQL database connected."
        );

        console.log(
            "Cars API ready."
        );

        console.log(
            "Booking API ready."
        );

        console.log(
            "Purchase API ready."
        );

        console.log(
            "Authentication API ready."
        );

        console.log(
            "Quiz API ready."
        );

        console.log(
            "======================================"
        );

        console.log("");
    }
);