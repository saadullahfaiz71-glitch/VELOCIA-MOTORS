const bcrypt = require("bcrypt");
const sql = require("./database");

async function seedAdmin() {
    try {
        const email = "admin@velocia.com";
        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            throw new Error(
                "ADMIN_PASSWORD environment variable is missing."
            );
        }

        const name = "Administrator";
        const passwordHash = await bcrypt.hash(password, 12);

        const existing = await sql`
            SELECT id
            FROM users
            WHERE LOWER(email) = ${email}
            LIMIT 1
        `;

        if (existing.length > 0) {

            await sql`
                UPDATE users
                SET
                    name = ${name},
                    password_hash = ${passwordHash},
                    role = 'admin'
                WHERE LOWER(email) = ${email}
            `;

            console.log("✅ Admin account updated successfully.");

        } else {

            await sql`
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role
                )
                VALUES
                (
                    ${name},
                    ${email},
                    ${passwordHash},
                    'admin'
                )
            `;

            console.log("✅ Admin account created successfully.");
        }

        await sql.end();
        process.exit(0);

    } catch (error) {
        console.error("❌ Admin seed error:", error);

        try {
            await sql.end();
        } catch {}

        process.exit(1);
    }
}

seedAdmin();