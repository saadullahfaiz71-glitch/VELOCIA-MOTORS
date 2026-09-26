const db = require("./database");

const questions = [

    {
        question: "BMW M5 Competition kis type ki vehicle hai?",
        a: "Performance Sedan",
        b: "Pickup Truck",
        c: "Minivan",
        d: "Hatchback",
        answer: "A",
        category: "Car Knowledge"
    },

    {
        question: "Car ki braking system ka basic purpose kya hai?",
        a: "Speed increase karna",
        b: "Vehicle ko slow ya stop karna",
        c: "Fuel increase karna",
        d: "Engine cool karna",
        answer: "B",
        category: "Car Knowledge"
    },

    {
        question: "Automatic transmission mein normally clutch pedal ka kya hota hai?",
        a: "Driver manually operate karta hai",
        b: "Do clutch pedals hote hain",
        c: "Separate clutch pedal nahi hota",
        d: "Clutch steering mein hota hai",
        answer: "C",
        category: "Car Knowledge"
    },

    {
        question: "Tyre pressure check karna kyun important hai?",
        a: "Safety aur handling ke liye",
        b: "Music quality ke liye",
        c: "Screen brightness ke liye",
        d: "Horn ki awaaz ke liye",
        answer: "A",
        category: "Vehicle Safety"
    },

    {
        question: "Test drive se pehle kya check karna useful hai?",
        a: "Vehicle condition",
        b: "Only radio",
        c: "Only headlights",
        d: "Only seat color",
        answer: "A",
        category: "Vehicle Safety"
    },

    {
        question: "Engine oil ka main purpose kya hai?",
        a: "Engine components ko lubricate karna",
        b: "Tyres ko inflate karna",
        c: "Windows clean karna",
        d: "Horn chalana",
        answer: "A",
        category: "Engine"
    },

    {
        question: "ABS ka full form kya hai?",
        a: "Automatic Brake System",
        b: "Anti-lock Braking System",
        c: "Advanced Battery System",
        d: "Auto Balance Steering",
        answer: "B",
        category: "Vehicle Safety"
    },

    {
        question: "Aap car mein sabse zyada kis cheez ko priority dete hain?",
        a: "Performance",
        b: "Comfort",
        c: "Luxury",
        d: "Fuel Economy",
        answer: "A",
        category: "Preference"
    },

    {
        question: "Long drive ke liye aap kis feature ko prefer karenge?",
        a: "Comfortable seats",
        b: "Large speakers only",
        c: "Exterior lights only",
        d: "Sport stickers",
        answer: "A",
        category: "Preference"
    },

    {
        question: "Used car purchase karte waqt kya inspect karna chahiye?",
        a: "Vehicle condition and history",
        b: "Only color",
        c: "Only logo",
        d: "Only number plate",
        answer: "A",
        category: "Car Knowledge"
    }

];


const insert = db.prepare(`
    INSERT INTO quiz_questions (
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        category
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);


const insertMany = db.transaction(() => {

    for (const q of questions) {

        insert.run(
            q.question,
            q.a,
            q.b,
            q.c,
            q.d,
            q.answer,
            q.category
        );

    }

});


insertMany();

console.log(
    `${questions.length} quiz questions added successfully!`
);
db.close();