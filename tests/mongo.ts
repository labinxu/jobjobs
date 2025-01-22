import WuJob from "../src/51job/";

async function fetchData() {
    const wj = new WuJob("");
    const db = await wj.getDb();
    console.log(db);
    const collection = db.collection("table");
    // collection.insertMany(
    //     { name: "gg", age: 20 },
    //     { name: "pp", age: 30 },
    // ]);
    const data = await collection.find({}).toArray();
    console.log(data);
}

fetchData();
