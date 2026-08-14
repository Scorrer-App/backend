let mongoClient = null;

export const initMongo = (client) => {
    mongoClient = client;
};

export const db = (database, collection) => {

    if (!mongoClient) {
        throw new Error("MongoDB client is not initialized");
    }

    return mongoClient
        .db(database)
        .collection(collection);
};