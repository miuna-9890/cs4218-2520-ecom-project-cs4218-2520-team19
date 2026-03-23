// Teo Kim Han, A0273551E

import dotenv from "dotenv";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from "../models/userModel.js";
import authRoutes from '../routes/authRoute.js';
import { hashPassword } from "../helpers/authHelper.js";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
// First run of the test suite may take longer due to MongoDB Memory Server setup
jest.setTimeout(30000);

// Set up the server for testing
dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

const loginRoute = '/api/v1/auth/login';
let mongoServer;

const createUser = async () => {
    const hashedPassword = await hashPassword('password123');
    const user = new userModel({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St',
        password: hashedPassword,
        answer: 'test answer'
    });
    return user;
};

describe('Login Endpoint Integration Tests', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri, );
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        
        await mongoServer.stop();
    });

    test('Happy Path: Should login valid user successfully', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(loginRoute).send({
            email: 'test@example.com',
            password: 'password123'
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toEqual(expect.objectContaining({
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            role: user.role,
        }));
        expect(res.body).toHaveProperty('token', expect.any(String));
    });

    test('Should return 400 for missing email', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(loginRoute).send({
            password: 'password123'
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 400 for missing password', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(loginRoute).send({
            email: 'test@example.com'
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 404 for unregistered user', async () => {
        const res = await request(app).post(loginRoute).send({
            email: 'nonexistent@example.com',
            password: 'password123'
        });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 401 for incorrect password', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(loginRoute).send({
            email: 'test@example.com',
            password: 'wrongpassword'
        });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });
});