// Teo Kim Han, A0273551E

import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../routes/authRoute.js';
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import userModel from '../models/userModel.js';

// First run of the test suite may take longer due to MongoDB Memory Server setup
jest.setTimeout(30000);

// Set up the server for testing
dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

const forgotPasswordRoute = '/api/v1/auth/forgot-password';
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

describe('Forgot Password Endpoint Integration Tests', () => {
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

    test('Happy Path: Should reset password successfully for an existing user', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'test@example.com',
            answer: 'test answer',
            newPassword: 'newpassword123'
        });
        const updatedUser = await userModel.findOne({ email: 'test@example.com' });
        const isPasswordUpdated = await comparePassword('newpassword123', updatedUser.password);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message');
        expect(isPasswordUpdated).toBe(true);
    });

    test('Should return 400 if email field is missing', async () => {
        const res = await request(app).post(forgotPasswordRoute).send({
            answer: 'test answer',
            newPassword: 'newpassword123'
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 400 if answer field is missing', async () => {
        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'test@example.com',
            newPassword: 'newpassword123'
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 400 if new password field is missing', async () => {
        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'test@example.com',
            answer: 'test answer',
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 404 if user email is not found', async () => {
        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'nonexistent@example.com',
            answer: 'test answer',
            newPassword: 'newpassword123'
        });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 404 if email is incorrect' , async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'invalid-email@example.com',
            answer: 'test answer',
            newPassword: 'newpassword123'
        });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
    });

    test('Should return 404 if answer is incorrect', async () => {
        const user = await createUser();
        await user.save();

        const res = await request(app).post(forgotPasswordRoute).send({
            email: 'test@example.com',
            answer: 'incorrect answer',
            newPassword: 'newpassword123'
        });
        const updatedUser = await userModel.findOne({ email: 'test@example.com' });
        const isPasswordUpdated = await comparePassword('newpassword123', updatedUser.password);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
        expect(isPasswordUpdated).toBe(false);
    });
});