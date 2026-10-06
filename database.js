const postgres = require("postgres");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
}

const sql = postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 5
});

module.exports = sql;

console.log("✅ Supabase PostgreSQL database connected!");