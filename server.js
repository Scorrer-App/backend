import "./src/config/env.js";
import express from "express";

import mongoConnect from "./src/config/dbConnect/mongoConnect.js";
import apiRoutes from "./src/apiRoutes.js";

const app = express();

app.use(express.json());

await mongoConnect();

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/v1", apiRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server running http://localhost:${port}`);
});