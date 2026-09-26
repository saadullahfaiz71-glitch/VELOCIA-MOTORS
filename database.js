const Database = require("better-sqlite3");

const db = new Database("velocia.db");

db.pragma("foreign_keys = ON");

// USERS
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// CARS
db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        year INTEGER,
        engine TEXT,
        power TEXT,
        transmission TEXT,
        fuel TEXT,
        body_type TEXT,
        image TEXT,
        description TEXT,
        status TEXT DEFAULT 'Available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// BOOKINGS
db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        car_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL,
        booking_time TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (car_id)
            REFERENCES cars(id)
            ON DELETE CASCADE
    );
`);

// PURCHASE REQUESTS
db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        car_id INTEGER NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (car_id)
            REFERENCES cars(id)
            ON DELETE CASCADE
    );
`);

// CONTACT MESSAGES
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'Unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
// =========================================================
// VELOCIA CAR CHALLENGE
// =========================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        category TEXT DEFAULT 'Car Knowledge',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        car_id INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        wrong_answers INTEGER NOT NULL,
        score INTEGER NOT NULL,
        result_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (car_id)
            REFERENCES cars(id)
            ON DELETE CASCADE
    );
`);
// ==========================================
// QUIZ QUESTIONS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ==========================================
// QUIZ RESULTS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        car_id INTEGER,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        preference TEXT,
        result_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (car_id)
            REFERENCES cars(id)
            ON DELETE SET NULL
    );
`);
console.log("Velocia Motors SQLite database ready!");

module.exports = db;