import { MongoClient } from "mongodb";
import { env } from "../env";

export async function getMongoClient(): Promise<MongoClient> {
    const client = new MongoClient(env.DB_CONN_STRING);
    client.connect();
    return client;
}

export async function getMongoDb() {
    const mongoClient = await getMongoClient();
    return mongoClient.db();
}
