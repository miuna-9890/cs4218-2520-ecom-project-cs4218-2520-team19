// Sun Zhiyuan Felix (A0272474Y)

// This file sets up an Express server for testing purposes, using an in-memory MongoDB instance

import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDB } from "../config/db.js";
import authRoutes from '../routes/authRoute.js'
import categoryRoutes from '../routes/categoryRoutes.js'
import productRoutes from '../routes/productRoutes.js'
import cors from "cors";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { registerTestRoutes, seedPlaywrightAdmin } from "./testServerHelpers.js";
import testOrderRoutes from "./testOrderRoutes.js";

let mongoServer;
let server;

// configure env
dotenv.config();

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/test", testOrderRoutes);

// rest api

app.get('/', (req,res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

async function startTestServer() {
    mongoServer = await MongoMemoryServer.create({
        instance: {
            startupTimeoutMS: 30000,
        },
    });
    const mongoUri = mongoServer.getUri();

    process.env.MONGO_URL = mongoUri;
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

    //database config
    await connectDB();
    await seedPlaywrightAdmin();

    await new Promise((resolve) => {
        server = app.listen(PORT, () => {
            console.log(`Test server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
            resolve();
        });
    });
};

async function stopTestServer() {
    server.close();
    mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

async function clearTestDatabase() {
    if (mongoServer) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
}

async function clearTestDataPreservingUsers() {
    if (!mongoServer) {
        return;
    }

    const collections = mongoose.connection.collections;
    for (const key in collections) {
        if (key === 'users') {
            continue;
        }
        await collections[key].deleteMany();
    }
}

registerTestRoutes(app, { clearTestDataPreservingUsers });

export { startTestServer, stopTestServer, clearTestDatabase, clearTestDataPreservingUsers };