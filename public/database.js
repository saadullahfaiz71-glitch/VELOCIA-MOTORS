const Database = require("better-sqlite3");

const db = new Database("velocia.db");

// Enable foreign keys
db.pragma("foreign_keys = ON");

// ===============================
// USERS TABLE
// ===============================
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

// ===============================
// CARS TABLE
// ===============================
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

// ===============================
// BOOKINGS TABLE
// ===============================
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

// ===============================
// PURCHASE REQUESTS TABLE
// ===============================
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

// ===============================
// CONTACT MESSAGES TABLE
// ===============================
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


console.log("✅ Velocia Motors SQLite database ready!");

module.exports = db;