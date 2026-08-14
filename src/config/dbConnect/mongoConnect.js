import { MongoClient } from "mongodb";
import { initMongo } from "./mongo.js";

const client = new MongoClient(process.env.MONGODB_URI);

const mongoConnect = async () => {

    try {

        await client.connect();

        initMongo(client);

        console.log("MongoDB connected successfully");

        return client;

    } catch (error) {

        console.error("MongoDB connection failed:", error);

        process.exit(1);
    }
};

export default mongoConnect;