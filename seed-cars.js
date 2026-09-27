const db = require("./database");

const cars = [
    {
        brand: "BMW",
        name: "BMW M5 Competition",
        price: "PKR 8.50 Crore",
        year: 2025,
        engine: "4.4L V8",
        power: "617 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Sedan",
        image: "images/car-1.jpg",
        description: "A high-performance BMW combining luxury, advanced technology and powerful driving performance."
    },

    {
        brand: "Mercedes",
        name: "Mercedes-AMG GT",
        price: "PKR 7.20 Crore",
        year: 2025,
        engine: "4.0L V8",
        power: "577 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Coupe",
        image: "images/car-2.jpg",
        description: "A premium performance coupe with aggressive styling, luxury interior and advanced technology."
    },

    {
        brand: "Porsche",
        name: "Porsche 911 Carrera",
        price: "PKR 6.50 Crore",
        year: 2025,
        engine: "3.0L Flat-6",
        power: "379 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Coupe",
        image: "images/car-3.jpg",
        description: "An iconic sports car offering precision handling, premium comfort and exciting performance."
    },

    {
        brand: "Toyota",
        name: "Toyota Corolla Grande",
        price: "PKR 95 Lac",
        year: 2025,
        engine: "1.8L",
        power: "138 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Sedan",
        image: "images/car-4.jpg",
        description: "A practical sedan combining comfort, modern technology and everyday usability."
    },

    {
        brand: "Honda",
        name: "Honda Civic RS",
        price: "PKR 1.05 Crore",
        year: 2025,
        engine: "1.5L Turbo",
        power: "176 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Sedan",
        image: "images/car-5.jpg",
        description: "A modern sedan with sporty styling, comfortable interior and useful technology."
    },

    {
        brand: "KIA",
        name: "KIA Sportage",
        price: "PKR 1.15 Crore",
        year: 2025,
        engine: "1.6L Turbo",
        power: "177 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "SUV",
        image: "images/car-6.jpg",
        description: "A modern SUV designed for comfort, practicality and everyday driving."
    },

    {
        brand: "Hyundai",
        name: "Hyundai Tucson",
        price: "PKR 1.10 Crore",
        year: 2025,
        engine: "2.0L",
        power: "155 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "SUV",
        image: "images/car-7.jpg",
        description: "A stylish SUV with modern technology, spacious comfort and practical features."
    },

    {
        brand: "Audi",
        name: "Audi A6",
        price: "PKR 3.80 Crore",
        year: 2025,
        engine: "2.0L Turbo",
        power: "261 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Sedan",
        image: "images/car-8.jpg",
        description: "A premium executive sedan focused on luxury, technology and refined performance."
    },

    {
        brand: "BMW",
        name: "BMW 3 Series",
        price: "PKR 2.90 Crore",
        year: 2025,
        engine: "2.0L Turbo",
        power: "255 HP",
        transmission: "Automatic",
        fuel: "Petrol",
        body_type: "Sedan",
        image: "images/car-9.jpg",
        description: "A premium sports sedan combining driving dynamics, technology and everyday comfort."
    }
];

// ==========================================
// CHECK IF CARS ALREADY EXIST
// ==========================================

const existingCars = db
    .prepare("SELECT COUNT(*) AS count FROM cars")
    .get();

if (existingCars.count > 0) {
    console.log("");
    console.log("======================================");
    console.log("Cars already exist in database.");
    console.log("Skipping car seed to avoid duplicates.");
    console.log("======================================");
    db.close();
    process.exit(0);
}

// ==========================================
// INSERT CARS
// ==========================================

const insert = db.prepare(`
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')
`);


const insertMany = db.transaction((cars) => {

    for (const car of cars) {

        insert.run(
            car.brand,
            car.name,
            car.price,
            car.year,
            car.engine,
            car.power,
            car.transmission,
            car.fuel,
            car.body_type,
            car.image,
            car.description
        );

    }

});


insertMany(cars);


// ==========================================
// SHOW RESULT
// ==========================================

const result = db
    .prepare(`
        SELECT
            id,
            brand,
            name,
            price
        FROM cars
        ORDER BY id
    `)
    .all();


console.log("");
console.log("======================================");
console.log("     VELOCIA MOTORS CAR DATABASE");
console.log("======================================");

console.table(result);

console.log("======================================");
console.log(`${result.length} cars inserted successfully!`);
console.log("======================================");