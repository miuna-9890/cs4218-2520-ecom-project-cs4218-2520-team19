// Varatharaju Mithuna, A0281223N

// contains integration tests for updateProfileController with
// with auth(login)
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
import User from "../models/userModel";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from '../routes/authRoute.js';
import {comparePassword, hashPassword} from "../helpers/authHelper.js";
// First run of the test suite may take longer due to MongoDB Memory Server setup
jest.setTimeout(30000);

// Set up the server for testing
dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const uri = mongoServer.getUri("updateProfile-test-db"); // different name
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
});

const createSampleUser = async () => {
    const hashedPassword = await hashPassword("oldpassword");
    const user = await User.create({
        name: "John Doe",
        email: "John@gmail.com",
        password: hashedPassword,
        phone: '0987654321',
        address: 'Old Address',
        answer: "My first pet's name"
    });
    return user;
}

describe("FLOW: Update Profile -> Login", () => {

    test("update profile and login successfully", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;

        // 2. Update password
        const newPassword = "newpassword";

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: newPassword })
            .expect(200);

        // 4. Login with NEW password (should succeed)
        const newLoginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: newPassword
            })
            .expect(200);

        expect(newLoginRes.body.token).toBeDefined();
    });

    test("update profile and login with old password fails", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;

        // 2. Update password
        const newPassword = "newpassword";

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: newPassword })
            .expect(200);

        // 3. Try logging in with OLD password (should fail)
        await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "oldpassword"
            })
            .expect(401);
    });

    test("updating non-password fields does not affect login", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
        const token = loginRes.body.token;

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ phone: "111222333" })
            .expect(200);

        const newLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        expect(newLogin.body.token).toBeDefined();
    });

    test("new password token allows access to protected route", async () => {
        const user = await createSampleUser();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
        const token = loginRes.body.token;

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: "newpassword" })
            .expect(200);

        // login with new password and access orders
        const newLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "newpassword" })
            .expect(200);

        const newToken = newLogin.body.token;

        const res = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", newToken)
            .expect(200);

        expect(res.body).toBeDefined();
    });

    test("cannot login with new password if update is invalid", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const user = await createSampleUser();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
        const token = loginRes.body.token;

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: "12345" })
            .expect(200); // controller returns 200 but error in JSON

        // login with invalid new password fails
        await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "12345" })
            .expect(401);
        consoleSpy.mockRestore();
    });

    test("can still login with old password if update is invalid", async () => {
        const user = await createSampleUser();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
        const token = loginRes.body.token;

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: "12345" })
            .expect(200); // controller returns 200 but error in JSON

        // login with old password still works
        await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
    });

    test("invalid token prevents update and login remains unchanged", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const user = await createSampleUser();

        await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", "invalidtoken")
            .send({ password: "newpassword" })
            .expect(401);

        // old password should still work
        await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);
        consoleSpy.mockRestore();
    });

});
