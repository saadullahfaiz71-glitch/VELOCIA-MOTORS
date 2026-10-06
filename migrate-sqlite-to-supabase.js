const Database = require("better-sqlite3");
const postgres = require("postgres");

const sqlite = new Database("./velocia.db");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
}

const sql = postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 5
});

async function migrate() {
    try {
        console.log("======================================");
        console.log("VELOCIA MOTORS DATA MIGRATION");
        console.log("SQLite → Supabase PostgreSQL");
        console.log("======================================");

        // -----------------------------------------
        // USERS
        // -----------------------------------------
        console.log("\n📦 Migrating users...");

        const users = sqlite.prepare(`
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                created_at
            FROM users
        `).all();

        for (const user of users) {
            await sql`
                INSERT INTO users
                (id, name, email, password_hash, role, created_at)
                VALUES
                (${user.id},
                 ${user.name},
                 ${user.email},
                 ${user.password_hash},
                 ${user.role || "customer"},
                 ${user.created_at ? new Date(user.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Users migrated: ${users.length}`);


        // -----------------------------------------
        // CARS
        // -----------------------------------------
        console.log("\n🚗 Migrating cars...");

        const cars = sqlite.prepare(`
            SELECT
                id,
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
                status,
                created_at
            FROM cars
        `).all();

        for (const car of cars) {
            await sql`
                INSERT INTO cars
                (id, brand, name, price, year, engine, power,
                 transmission, fuel, body_type, image,
                 description, status, created_at)
                VALUES
                (${car.id},
                 ${car.brand},
                 ${car.name},
                 ${String(car.price ?? "")},
                 ${car.year || null},
                 ${car.engine || null},
                 ${car.power || null},
                 ${car.transmission || null},
                 ${car.fuel || null},
                 ${car.body_type || null},
                 ${car.image || null},
                 ${car.description || null},
                 ${car.status || "Available"},
                 ${car.created_at ? new Date(car.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Cars migrated: ${cars.length}`);


        // -----------------------------------------
        // QUIZ QUESTIONS
        // -----------------------------------------
        console.log("\n📝 Migrating quiz questions...");

        const questions = sqlite.prepare(`
            SELECT
                id,
                question,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                category,
                created_at
            FROM quiz_questions
        `).all();

        for (const q of questions) {
            await sql`
                INSERT INTO quiz_questions
                (id, question, option_a, option_b, option_c,
                 option_d, correct_answer, category, created_at)
                VALUES
                (${q.id},
                 ${q.question},
                 ${q.option_a},
                 ${q.option_b},
                 ${q.option_c},
                 ${q.option_d},
                 ${q.correct_answer},
                 ${q.category || null},
                 ${q.created_at ? new Date(q.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Quiz questions migrated: ${questions.length}`);


        // -----------------------------------------
        // QUIZ RESULTS
        // -----------------------------------------
        console.log("\n🎯 Migrating quiz results...");

        const quizResults = sqlite.prepare(`
            SELECT
                id,
                user_id,
                car_id,
                total_questions,
                correct_answers,
                wrong_answers,
                score,
                result_data,
                created_at,
                preference
            FROM quiz_results
        `).all();

        for (const result of quizResults) {
            let resultData = null;

            if (result.result_data) {
                try {
                    resultData = JSON.parse(result.result_data);
                } catch {
                    resultData = null;
                }
            }

            await sql`
                INSERT INTO quiz_results
                (id, user_id, car_id, total_questions,
                 correct_answers, wrong_answers, score,
                 result_data, created_at, preference)
                VALUES
                (${result.id},
                 ${result.user_id || null},
                 ${result.car_id || null},
                 ${result.total_questions || 0},
                 ${result.correct_answers || 0},
                 ${result.wrong_answers || 0},
                 ${result.score || 0},
                 ${resultData},
                 ${result.created_at ? new Date(result.created_at) : new Date()},
                 ${result.preference || null})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Quiz results migrated: ${quizResults.length}`);


        // -----------------------------------------
        // BOOKINGS
        // -----------------------------------------
        console.log("\n📅 Migrating bookings...");

        const bookings = sqlite.prepare(`
            SELECT
                id,
                user_id,
                car_id,
                booking_date,
                booking_time,
                message,
                status,
                created_at
            FROM bookings
        `).all();

        for (const booking of bookings) {
            await sql`
                INSERT INTO bookings
                (id, user_id, car_id, booking_date,
                 booking_time, message, status, created_at)
                VALUES
                (${booking.id},
                 ${booking.user_id || null},
                 ${booking.car_id || null},
                 ${booking.booking_date || null},
                 ${booking.booking_time || null},
                 ${booking.message || null},
                 ${booking.status || "Pending"},
                 ${booking.created_at ? new Date(booking.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Bookings migrated: ${bookings.length}`);


        // -----------------------------------------
        // PURCHASE REQUESTS
        // -----------------------------------------
        console.log("\n💰 Migrating purchase requests...");

        const purchases = sqlite.prepare(`
            SELECT
                id,
                user_id,
                car_id,
                quiz_result_id,
                message,
                status,
                created_at
            FROM purchase_requests
        `).all();

        for (const purchase of purchases) {
            await sql`
                INSERT INTO purchase_requests
                (id, user_id, car_id, quiz_result_id,
                 message, status, created_at)
                VALUES
                (${purchase.id},
                 ${purchase.user_id || null},
                 ${purchase.car_id || null},
                 ${purchase.quiz_result_id || null},
                 ${purchase.message || null},
                 ${purchase.status || "Pending"},
                 ${purchase.created_at ? new Date(purchase.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Purchase requests migrated: ${purchases.length}`);


        // -----------------------------------------
        // MESSAGES
        // -----------------------------------------
        console.log("\n📨 Migrating messages...");

        const messages = sqlite.prepare(`
            SELECT
                id,
                name,
                email,
                phone,
                message,
                status,
                created_at
            FROM messages
        `).all();

        for (const msg of messages) {
            await sql`
                INSERT INTO messages
                (id, name, email, phone, message,
                 status, created_at)
                VALUES
                (${msg.id},
                 ${msg.name},
                 ${msg.email},
                 ${msg.phone || null},
                 ${msg.message},
                 ${msg.status || "New"},
                 ${msg.created_at ? new Date(msg.created_at) : new Date()})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log(`✅ Messages migrated: ${messages.length}`);


        // -----------------------------------------
        // RESET ID SEQUENCES
        // -----------------------------------------
        console.log("\n🔧 Resetting PostgreSQL ID sequences...");

        const tables = [
            "users",
            "cars",
            "bookings",
            "quiz_questions",
            "quiz_results",
            "purchase_requests",
            "messages"
        ];

        for (const table of tables) {
            await sql.unsafe(`
                SELECT setval(
                    pg_get_serial_sequence('${table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM ${table}), 1),
                    true
                );
            `);
        }

        console.log("✅ ID sequences updated.");


        // -----------------------------------------
        // FINAL COUNTS
        // -----------------------------------------
        console.log("\n======================================");
        console.log("MIGRATION COMPLETE");
        console.log("======================================");

        const counts = {};

        for (const table of tables) {
            const result = await sql.unsafe(
                `SELECT COUNT(*)::int AS count FROM ${table}`
            );

            counts[table] = result[0].count;
        }

        console.table(counts);

        await sql.end();
        sqlite.close();

        console.log("\n✅ All available local data has been transferred.");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ MIGRATION ERROR:");
        console.error(error);

        try {
            await sql.end();
        } catch {}

        try {
            sqlite.close();
        } catch {}

        process.exit(1);
    }
}

migrate();