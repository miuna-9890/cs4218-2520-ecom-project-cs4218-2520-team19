// Varatharaju Mithuna, A0281223N

// contains integration tests for updateProfileController
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
    const uri = mongoServer.getUri("profile-test-db"); // unique name
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

describe("FLOW: Login → Update Profile", () => {

    test("login and update profile successfully", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({name: "Updated Name", phone: "1234567890"})
            .expect(200);

        expect(updateRes.body.updatedUser.name).toBe("Updated Name");
        expect(updateRes.body.updatedUser.phone).toBe("1234567890");

        // Check DB persistence
        const updatedUserInDb = await User.findById(user._id);
        expect(updatedUserInDb.name).toBe("Updated Name");
        expect(updatedUserInDb.phone).toBe("1234567890");
    });

    test("Updates some fields and keeps the rest", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({email: user.email, password: "oldpassword"})
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({name: "New Name"}) // only name updated
            .expect(200);

        expect(updateRes.body.updatedUser.name).toBe("New Name");
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe("New Name");
        expect(updatedUser.phone).toBe("0987654321"); // unchanged
        expect(updatedUser.address).toBe("Old Address"); // unchanged
    });

    test("Partial update works (only name)", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({email: user.email, password: "oldpassword"})
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({name: "Partial Name"})
            .expect(200);

        expect(updateRes.body.updatedUser.name).toBe("Partial Name");
        expect(updateRes.body.updatedUser.phone).toBe("0987654321"); // unchanged
    });

    test("Update keeps all existing values if empty body", async () => {
        const user = await createSampleUser();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({email: user.email, password: "oldpassword"})
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({name: "", password: "", phone: "", address: ""})
            .expect(200);

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe("John Doe");
        expect(updatedUser.phone).toBe("0987654321");
        expect(updatedUser.address).toBe("Old Address");
    });

});
describe("Edge Cases: Login → Update Profile", () => {

    test("Fails with invalid phone number", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ phone: "invalidphone" })
            .expect(200); // your controller returns 200 with error json

        expect(updateRes.body).toEqual({ error: "Phone number should be numeric" });

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.phone).toBe(user.phone); // unchanged
    });

    test("Cannot update with short password = 5", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: "12345" }) // too short
            .expect(200);

        expect(updateRes.body).toEqual({ error: "Password is required and should be 6 characters long" });
        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("Update successsful with password = 6", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const newPassword = "123456";
        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: newPassword })
            .expect(200);

        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword(newPassword, updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("Update successsful with password = 7", async () => {
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const newPassword = "1234567";
        const updateRes = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ password: newPassword })
            .expect(200);

        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword(newPassword, updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("rejects update if JWT is missing or invalid", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const user = await createSampleUser();

        // No token
        const resNoToken = await request(app)
            .put("/api/v1/auth/profile")
            .send({name: "Name Should Not Update"})
            .expect(401);

        expect(resNoToken.body.message).toMatch("Error in require sign in middleware");
        consoleSpy.mockRestore();
    });

    test("fails if user no longer exists after login", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const user = await createSampleUser();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        // Delete user after login
        await User.findByIdAndDelete(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", token)
            .send({ name: "New Name" })
            .expect(404);

        expect(res.body).toEqual({ success: false, message: "User not found" });
        consoleSpy.mockRestore();
    });

});
