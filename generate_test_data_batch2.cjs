
const names = [
    "Lukas Mayer", "Sarah König", "Daniel Braun", "Julia Schwarz", "Jan Hartmann",
    "Laura Lange", "Timo Schmitz", "Lisa Voigt", "Kevin Krauß", "Nina Peters",
    "Marcel Fuchs", "Melanie Möller", "Patrick Scholz", "Jessica Weiß", "Sven Jung",
    "Nicole Horn", "Ralf Bergmann", "Sandra Jung", "Maik Vogt", "Heike Keller",
    "Uwe Günther", "Katrin Roth", "Thorsten Beck", "Manuela Sauer", "Dirk Simon",
    "Anja Maurer", "Bernd Franke", "Petra Albrecht", "Holger Ludwig", "Beate Böhm"
];

const brands = ["Cube", "Canyon", "Specialized", "Trek", "Giant", "Scott", "Rose", "Gazelle", "Kalkhoff", "Stevens"];
const models = {
    "Cube": ["Reaction C:62", "Stereo 140", "Kathmandu Hybrid"],
    "Canyon": ["Ultimate CF SLX", "Grizl CF SL", "Spectral:ON"],
    "Specialized": ["Stumpjumper", "Tarmac SL8", "Turbo Vado"],
    "Trek": ["Fuel EX", "Domane", "Rail"],
    "Giant": ["Trance", "Defy", "AnyRoad"],
    "Scott": ["Scale", "Addict", "Patron eRide"],
    "Rose": ["Backroad", "Reveal", "The Bruce"],
    "Gazelle": ["Ultimate", "Chamonix", "HeavyDutyNL"],
    "Kalkhoff": ["Endeavour", "Image", "Entice"],
    "Stevens": ["Strada", "P-Carpo", "E-Inception"]
};
const types = ["E-Bike", "Mountainbike", "Rennrad", "Gravelbike", "Trekkingrad", "Citybike"];
const statuses = ["eingegangen", "warten_auf_teile", "in_bearbeitung", "kontrolle_offen", "abholbereit"];
const descriptions = ["Gabel-Service", "Tretlager knarzt", "Bremsleitung entlüften", "Speiche gebrochen", "Display-Tausch", "Kette gesprungen", "Pedale locker", "Reifenwechsel"];

const workshopId = "28894025-08ea-423b-9386-cecf39e488aa";

let sql = "INSERT INTO public.orders (workshop_id, order_number, customer_name, customer_email, customer_phone, bike_brand, bike_model, bike_type, status, description, estimated_price) VALUES ";

const values = [];

for (let i = 0; i < 30; i++) {
    const name = names[i];
    const email = name.toLowerCase().replace(/ /g, ".").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss") + "@example.com";
    const phone = "+49 1" + Math.floor(Math.random() * 900 + 100) + " " + Math.floor(Math.random() * 9000000 + 1000000);
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[brand][Math.floor(Math.random() * models[brand].length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const price = (Math.random() * 450 + 50).toFixed(2);
    const orderNumber = "TEST-" + (1020 + i);

    values.push(`('${workshopId}', '${orderNumber}', '${name}', '${email}', '${phone}', '${brand}', '${model}', '${type}', '${status}', '${description}', ${price})`);
}

const fs = require('fs');
sql += values.join(",\n") + ";";

fs.writeFileSync('test_data_batch2.sql', sql);
console.log("SQL written to test_data_batch2.sql");
