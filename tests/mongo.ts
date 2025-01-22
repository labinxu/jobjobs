import { getMongoDb } from "../src/db";
import { env } from "../src/env";
console.log(env.DB_CONN_STRING);
async function fetchData() {
    const db = await getMongoDb();
    const collection = db.collection("table");
    // collection.insertMany([
    //     { name: "gg", age: 20 },
    //     { name: "pp", age: 30 },
    // ]);
    const data = await collection.find({}).toArray();
    console.log(data);
}

fetchData();
