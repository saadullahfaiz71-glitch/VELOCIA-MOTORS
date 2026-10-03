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
// DATABASE MIGRATIONS
// ==========================================

function addColumnIfMissing(table, column, definition) {
    const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all();

    const exists = columns.some(
        columnInfo => columnInfo.name === column
    );

    if (!exists) {
        db.prepare(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
        ).run();

        console.log(
            `Database migration: ${table}.${column} added`
        );
    }
}

addColumnIfMissing(
    "purchase_requests",
    "quiz_result_id",
    "INTEGER"
);

// ==========================================
// AUTH HELPERS
// ==========================================

function requireLogin(req, res, next) {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const currentUser = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role
                FROM users
                WHERE id = ?
            `)
            .get(req.session.user.id);

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
        console.error(
            "LOGIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Authentication error."
        });
    }
}

// ==========================================
// ADMIN AUTH
// ==========================================

function requireAdmin(req, res, next) {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const currentUser = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role
                FROM users
                WHERE id = ?
            `)
            .get(req.session.user.id);

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
        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

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

        const existingUser = db
            .prepare(`
                SELECT id
                FROM users
                WHERE email = ?
            `)
            .get(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const result = db
            .prepare(`
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role
                )
                VALUES (?, ?, ?, 'customer')
            `)
            .run(
                name,
                email,
                passwordHash
            );

        res.status(201).json({
            success: true,
            message:
                "Account created successfully!",
            userId: result.lastInsertRowid
        });

    } catch (error) {
        console.error(
            "REGISTER ERROR:",
            error
        );

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

        const user = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email,
                    password_hash,
                    role
                FROM users
                WHERE email = ?
            `)
            .get(email);

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

        // Clear old session data
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
        console.error(
            "LOGIN ERROR:",
            error
        );

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

app.get("/api/cars", (req, res) => {
    try {
        const cars = db
            .prepare(`
                SELECT *
                FROM cars
                ORDER BY id ASC
            `)
            .all();

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

app.get("/api/cars/:id", (req, res) => {
    try {
        const car = db
            .prepare(`
                SELECT *
                FROM cars
                WHERE id = ?
            `)
            .get(req.params.id);

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
    (req, res) => {
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

            const car = db
                .prepare(`
                    SELECT id
                    FROM cars
                    WHERE id = ?
                `)
                .get(car_id);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            const result = db
                .prepare(`
                    INSERT INTO bookings
                    (
                        user_id,
                        car_id,
                        booking_date,
                        booking_time,
                        message,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, 'Pending')
                `)
                .run(
                    user_id,
                    car_id,
                    booking_date,
                    booking_time,
                    message || ""
                );

            res.status(201).json({
                success: true,
                message:
                    "Inspection booking submitted successfully!",
                bookingId:
                    result.lastInsertRowid
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
    (req, res) => {
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

            const bookings = db
                .prepare(`
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

                    WHERE bookings.user_id = ?

                    ORDER BY bookings.id DESC
                `)
                .all(req.currentUser.id);

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
    (req, res) => {
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

            const car = db
                .prepare(`
                    SELECT id
                    FROM cars
                    WHERE id = ?
                `)
                .get(car_id);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            if (quiz_result_id) {
                const quizResult = db
                    .prepare(`
                        SELECT id
                        FROM quiz_results
                        WHERE id = ?
                          AND user_id = ?
                          AND car_id = ?
                    `)
                    .get(
                        quiz_result_id,
                        user_id,
                        car_id
                    );

                if (!quizResult) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "Quiz result not found for this customer and car."
                    });
                }
            }

            const result = db
                .prepare(`
                    INSERT INTO purchase_requests
                    (
                        user_id,
                        car_id,
                        message,
                        status,
                        quiz_result_id
                    )
                    VALUES (?, ?, ?, 'Pending', ?)
                `)
                .run(
                    user_id,
                    car_id,
                    message || "",
                    quiz_result_id || null
                );

            const savedRequest = db
                .prepare(`
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

                    WHERE pr.id = ?
                `)
                .get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                message:
                    "Purchase request submitted successfully!",
                requestId:
                    result.lastInsertRowid,
                request: savedRequest
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
    (req, res) => {
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

            const requests = db
                .prepare(`
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

                    WHERE pr.user_id = ?

                    ORDER BY pr.id DESC
                `)
                .all(req.currentUser.id);

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
    (req, res) => {
        try {
            const bookings = db
                .prepare(`
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
                `)
                .all();

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
    (req, res) => {
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

            const booking = db
                .prepare(`
                    SELECT id
                    FROM bookings
                    WHERE id = ?
                `)
                .get(req.params.id);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found."
                });
            }

            db.prepare(`
                UPDATE bookings
                SET status = ?
                WHERE id = ?
            `).run(
                status,
                req.params.id
            );

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
    (req, res) => {
        try {
            const requests = db
                .prepare(`
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
                `)
                .all();

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
    (req, res) => {
        try {
            const users = db
                .prepare(`
                    SELECT
                        id,
                        name,
                        email,
                        role,
                        created_at
                    FROM users
                    WHERE role = 'customer'
                    ORDER BY id DESC
                `)
                .all();

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
    (req, res) => {
        try {
            const cars = db
                .prepare(`
                    SELECT *
                    FROM cars
                    ORDER BY id DESC
                `)
                .all();

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
    (req, res) => {
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

            const result = db
                .prepare(`
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
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    brand,
                    name,
                    price,
                    year || null,
                    engine || "",
                    power || "",
                    transmission || "",
                    fuel || "",
                    body_type || "",
                    image || "",
                    description || "",
                    status || "Available"
                );

            const newCar = db
                .prepare(`
                    SELECT *
                    FROM cars
                    WHERE id = ?
                `)
                .get(
                    result.lastInsertRowid
                );

            res.json({
                success: true,
                message:
                    "Car added successfully.",
                car: newCar
            });

        } catch (error) {
            console.error(
                "ADD CAR ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add car."
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
    (req, res) => {
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

            const car = db
                .prepare(`
                    SELECT id
                    FROM cars
                    WHERE id = ?
                `)
                .get(req.params.id);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

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

            db.prepare(`
                UPDATE cars
                SET
                    brand = ?,
                    name = ?,
                    price = ?,
                    year = ?,
                    engine = ?,
                    power = ?,
                    transmission = ?,
                    fuel = ?,
                    body_type = ?,
                    image = ?,
                    description = ?,
                    status = ?
                WHERE id = ?
            `).run(
                brand,
                name,
                price,
                year || null,
                engine || "",
                power || "",
                transmission || "",
                fuel || "",
                body_type || "",
                image || "",
                description || "",
                status || "Available",
                req.params.id
            );

            const updatedCar = db
                .prepare(`
                    SELECT *
                    FROM cars
                    WHERE id = ?
                `)
                .get(req.params.id);

            res.json({
                success: true,
                message:
                    "Car updated successfully.",
                car: updatedCar
            });

        } catch (error) {
            console.error(
                "UPDATE CAR ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update car."
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
    (req, res) => {
        try {
            const car = db
                .prepare(`
                    SELECT id
                    FROM cars
                    WHERE id = ?
                `)
                .get(req.params.id);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            db.prepare(`
                DELETE FROM cars
                WHERE id = ?
            `).run(req.params.id);

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
                    "Unable to delete car."
            });
        }
    }
);

// ==========================================
// QUIZ — GET QUESTIONS
// ==========================================

app.get(
    "/api/quiz/questions",
    (req, res) => {
        try {
            const questions = db
                .prepare(`
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
                `)
                .all();

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
    (req, res) => {
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

            const car = db
                .prepare(`
                    SELECT id
                    FROM cars
                    WHERE id = ?
                `)
                .get(car_id);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Car not found."
                });
            }

            let parsedResult = {};

            try {
                parsedResult =
                    typeof result_data ===
                    "string"
                        ? JSON.parse(result_data)
                        : (
                            result_data || {}
                        );
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

            const questions = db
                .prepare(`
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
                `)
                .all();

            let correctAnswers = 0;
            let knowledgeQuestions = 0;

            questions.forEach(question => {
                const category =
                    String(
                        question.category || ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    category === "preference"
                ) {
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

            const result = db
                .prepare(`
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
                    (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    user_id,
                    car_id,
                    knowledgeQuestions,
                    correctAnswers,
                    wrongAnswers,
                    correctAnswers,
                    JSON.stringify(
                        parsedResult
                    ),
                    preference ||
                        "Balanced"
                );

            const savedResult = db
                .prepare(`
                    SELECT
                        qr.*,

                        u.name
                            AS customer_name,
                        u.email
                            AS customer_email,

                        c.brand,
                        c.name
                            AS car_name,
                        c.price

                    FROM quiz_results qr

                    LEFT JOIN users u
                        ON qr.user_id = u.id

                    LEFT JOIN cars c
                        ON qr.car_id = c.id

                    WHERE qr.id = ?
                `)
                .get(
                    result.lastInsertRowid
                );

            res.json({
                success: true,
                message:
                    "Quiz result saved successfully.",
                result: savedResult
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
// ADMIN ACCOUNT
// ==========================================

const adminEmail = "admin@velocia.com";
const adminPassword = "Admin@12345";

const existingAdmin = db
    .prepare(
        "SELECT id FROM users WHERE email = ?"
    )
    .get(adminEmail);

if (!existingAdmin) {
    const passwordHash =
        bcrypt.hashSync(
            adminPassword,
            10
        );

    db.prepare(`
        INSERT INTO users
        (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `).run(
        "Administrator",
        adminEmail,
        passwordHash,
        "admin"
    );

    console.log(
        "Admin account created."
    );

} else {
    db.prepare(`
        UPDATE users
        SET role = ?
        WHERE email = ?
    `).run(
        "admin",
        adminEmail
    );

    console.log(
        "Admin account ready."
    );
}

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
            "Database connected successfully."
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
            "======================================"
        );

        console.log("");
    }
);