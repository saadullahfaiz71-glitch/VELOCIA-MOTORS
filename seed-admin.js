const bcrypt = require("bcrypt");
const db = require("./database");

const email = "admin@velocia.com";
const password = "Admin@12345";
const name = "Administrator";

const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);

if (existing) {
    db.prepare(`
        UPDATE users
        SET name = ?, role = ?
        WHERE email = ?
    `).run(name, "admin", email);

    console.log("✅ Admin account already exists.");
} else {

    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
        INSERT INTO users
        (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `).run(
        name,
        email,
        passwordHash,
        "admin"
    );

    console.log("✅ Admin account created.");
}

console.log("📧 Email: admin@velocia.com");
console.log("🔑 Password: Admin@12345");