// Teo Kim Han, A0273551E

import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../routes/authRoute.js';
import userModel from '../models/userModel.js';
import { hashPassword, comparePassword } from "../helpers/authHelper.js";

// First run of the test suite may take longer due to MongoDB Memory Server setup
jest.setTimeout(30000);

// Set up the server for testing
dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

const registerRoute = '/api/v1/auth/register';
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

describe('Register Endpoint Integration Tests', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        
        await mongoServer.stop();
    });

    test('Happy Path: Should register a new user successfully', async () => {
        const res = await request(app).post(registerRoute).send({
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            address: '123 Test St',
            password: 'password123',
            answer: 'test answer'
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
    });
    
    test('Should not register with an already registered email', async () => {
        const user = await createUser();
        await user.save();
        
        const res = await request(app).post(registerRoute).send({
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            address: '123 Test St',
            password: 'password123',
            answer: 'test answer'
        });
        
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    describe('Test Validation Errors', () => {
        const userPayload = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            phone: '1234567890',
            address: '123 Test St',
            answer: 'test answer'
        };

        const validationTestCases = ['email', 'password', 'name', 'phone', 'address', 'answer'];

        test.each(validationTestCases)(
            'Should return 400 for missing %s field', 
            async (field) => {
                const userPayloadCopy = { ...userPayload };
                delete userPayloadCopy[field];

                const res = await request(app).post(registerRoute).send(userPayloadCopy);
                
                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('success', false);
                expect(res.body).toHaveProperty('message', expect.any(String));
            }
        );
    });
});