// Varatharaju Mithuna, A0281223N

// contains integration tests for updateProfileController, getOrdersController,
// getAllOrdersController, orderStatusController with routes + Middleware

process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
import request from "supertest";
import dotenv from 'dotenv';
import express from 'express';
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../models/categoryModel";
import Product from "../models/productModel";
import User from "../models/userModel";
import Order from "../models/orderModel";
import jwt from "jsonwebtoken";
import authRoutes from '../routes/authRoute.js';
import {comparePassword, hashPassword} from "../helpers/authHelper";

// First run of the test suite may take longer due to MongoDB Memory Server setup
jest.setTimeout(30000);

// Set up the server for testing
dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

// Helper to generate auth token for middleware
const generateToken = (userId, isAdmin = false) =>
    jwt.sign({ _id: userId, role: isAdmin ? "admin" : "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });


let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const uri = mongoServer.getUri("ordersProfile-test-db"); // different name
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
});

const createSampleCategory = async () => {
    return await Category.create({ name: "Electronics", slug: "electronics" });
};
const createSampleProducts = async (categoryId) => {
    const product1 = await Product.create({
        name: "Product 1",
        slug: "product-1",
        description: "Description 1",
        price: 100,
        category: categoryId,
        quantity: 10,
        shipping: true
    });

    const product2 = await Product.create({
        name: "Product 2",
        slug: "product-2",
        description: "Description 2",
        price: 200,
        category: categoryId,
        quantity: 5,
        shipping: false
    });

    const product3 = await Product.create({
        name: "Product 3",
        slug: "product-3",
        description: "Description 3",
        price: 300,
        category: categoryId,
        quantity: 7,
        shipping: true
    });

    return [product1, product2, product3];
}
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
const createSampleAdmin = async () => {
    const hashedPassword = await hashPassword("oldpassword");
    const user = await User.create({
        name: "Jane Doe",
        email: "Jane@gmail.com",
        password: hashedPassword,
        phone: '0987654321',
        address: 'Old Address',
        answer: "My first pet's name",
        role: 1
    });
    return user;
}
// create mock user and order data for testing
const createSampleOrders = async () => {
    const user = await createSampleUser();
    const category = await createSampleCategory();
    const products = await createSampleProducts(category._id);

    const order1 = await Order.create({
        products: products.map(p => p._id),
        payment: {success: true},
        buyer: user._id,
        status: "Delivered",
        createdAt: new Date()
    });

    const order2 = await Order.create({
        products: products.map(p => p._id),
        payment: {success: false},
        buyer: user._id,
        status: "Processing",
        createdAt: new Date()
    });
    return { user, orders: [order1, order2] };
}

describe("ordersController backend integration with routes", () => {
    test("GET /api/v1/auth/orders returns orders for authenticated user", async () => {
        const {user, orders} = await createSampleOrders();

        // Supertest request
        const res = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", `${generateToken(user._id)}`)
            .expect(200);

        expect(res.body.length).toBe(2);
        expect(res.body[0]._id.toString()).toBe(orders[0]._id.toString());
    });

    test("GET /api/v1/auth/orders returns empty array if no orders", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", `${token}`)
            .expect(200);

        expect(res.body).toEqual([]);
    });

    test("should reject unauthenticated requests", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const res = await request(app)
            .get("/api/v1/auth/orders")
            .expect(401); // middleware should block
        expect(res.body.message).toMatch( "Error in require sign in middleware");
        consoleSpy.mockRestore();
    });
});

describe("allOrdersController backend integration with routes", () => {
    test("Admin GET /api/v1/auth/all-orders returns all orders", async () => {
        const {user, orders} = await createSampleOrders();
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true);

        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", `${token}`)
            .expect(200);

        expect(res.body.length).toBe(2);
        expect(res.body.map(o => o._id)).toEqual(expect.arrayContaining([orders[0]._id.toString(), orders[1]._id.toString()]));
    });

    test("Admin GET /api/v1/auth/all-orders returns empty array if no orders", async () => {
        await Order.deleteMany({});
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", `${token}`)
            .expect(200);

        expect(res.body).toEqual([]);
    });

    test("Admin GET /api/v1/auth/all-orders returns orders in descending creation order", async () => {
        const {user, orders} = await createSampleOrders();
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", `${token}`)
            .expect(200);

        // First order returned is the most recently created
        const firstReturnedOrder = res.body[0];
        const secondReturnedOrder = res.body[1];

        expect(firstReturnedOrder._id.toString()).toBe(orders[1]._id.toString());
        expect(secondReturnedOrder._id.toString()).toBe(orders[0]._id.toString());
    });

    test("should reject non-admin on admin route", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id); // regular user
        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", `${token}`)
            .expect(401); // middleware should block
        expect(res.body.message).toMatch( "UnAuthorized Access");
    });
});

describe("orderStatusController backend integration with routes", () => {

    test("PUT /api/v1/auth/order-status/:id updates order status", async () => {
        const {user, orders } = await createSampleOrders();
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)
        const orderToUpdate = orders[0];

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", `${token}`)
            .send({ status: "Shipped" })
            .expect(200);

        expect(res.body.status).toBe("Shipped");

        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe("Shipped");
    });

    test("PUT /api/v1/auth/order-status/:id accepts all valid status values", async () => {
        const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
        const {user, orders } = await createSampleOrders();
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)
        const orderToUpdate = orders[0];

        for (const status of validStatuses) {
            const res = await request(app)
                .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
                .set("Authorization", `${token}`)
                .send({ status })
                .expect(200);

            expect(res.body.status).toBe(status);
            const updatedOrder = await Order.findById(orderToUpdate._id);
            expect(updatedOrder.status).toBe(status);
        }
    });

    test("PUT /api/v1/auth/order-status/:id returns null if order does not exist", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${fakeId}`)
            .set("Authorization", `${token}`)
            .send({ status: "Shipped" })
            .expect(200);

        expect(res.body).toBeNull();
    });

    test("PUT /api/v1/auth/order-status/:id returns error for invalid status", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const {user, orders } = await createSampleOrders();
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)
        const orderToUpdate = orders[0];

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", `${token}`)
            .send({ status: "InvalidStatus" })
            .expect(500);

        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe(orderToUpdate.status);

        consoleSpy.mockRestore();
    });

    test("should reject non-admin on admin route", async () => {
        const {user, orders } = await createSampleOrders();
        const token = generateToken(user._id);
        const orderToUpdate = orders[0];

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", `${token}`)
            .send({ status: "Shipped" })
            .expect(401); // middleware should block

        expect(res.body.message).toMatch( "UnAuthorized Access");
    });
});

describe("User profileController backend integration with routes", () => {
    test("PUT /api/v1/auth/profile updates user profile", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "New Name", password: "newpassword", phone: "1234567890", address: "New Address" })
            .expect(200);

        const updatedUser = await User.findById(user._id);

        expect(updatedUser.name).toBe("New Name");
        expect(updatedUser.phone).toBe("1234567890");
        expect(updatedUser.address).toBe("New Address");
        const isMatch = await comparePassword("newpassword", updatedUser.password);
        expect(isMatch).toBe(true);
        expect(res.body.updatedUser.name).toBe("New Name");
    });

    test("PUT /api/v1/auth/profile rejects password = 5 characters", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ password: "short" })
            .expect(200);

        expect(res.body).toEqual({ error: "Password is required and should be 6 characters long" });
        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("PUT /api/v1/auth/profile updates password = 6", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

            const res = await request(app)
                .put("/api/v1/auth/profile")
                .set("Authorization", `${token}`)
                .send({ password: "sixess" })
                .expect(200);

            const updatedUser = await User.findById(user._id);
            const isMatch = await comparePassword("sixess", updatedUser.password);
            expect(isMatch).toBe(true);

    });

    test("PUT /api/v1/auth/profile updates password = 7", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ password: "sixesss" })
            .expect(200);

        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("sixesss", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("PUT /api/v1/auth/profile rejects invalid phone", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ phone: "invalidphone" })
            .expect(200); // your controller returns 200 with error json

        expect(res.body).toEqual({ error: "Phone number should be numeric" });

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.phone).toBe(user.phone); // unchanged
    });

    test("PUT /api/v1/auth/profile handles partial updates", async () => {
        const user = await createSampleUser();
        const token = generateToken(user._id);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "Updated Name" })
            .expect(200);

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe("Updated Name");
        expect(updatedUser.phone).toBe(user.phone);
        expect(updatedUser.address).toBe(user.address);
    });

    test("PUT /api/v1/auth/profile handles non-existent user", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const token = generateToken(fakeId);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "New Name" })
            .expect(404);

        expect(res.body).toEqual({ success: false, message: "User not found" });
    });
});

describe("ADMIN profileController backend integration with routes", () => {
    test("PUT /api/v1/auth/profile updates user profile", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "New Name", password: "newpassword", phone: "1234567890", address: "New Address" })
            .expect(200);

        const updatedUser = await User.findById(admin._id);

        expect(updatedUser.name).toBe("New Name");
        expect(updatedUser.phone).toBe("1234567890");
        expect(updatedUser.address).toBe("New Address");
        const isMatch = await comparePassword("newpassword", updatedUser.password);
        expect(isMatch).toBe(true);

        expect(res.body.updatedUser.name).toBe("New Name");
    });

    test("PUT /api/v1/auth/profile rejects password = 5 characters", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ password: "short" })
            .expect(200);

        const updatedUser = await User.findById(admin._id);
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("PUT /api/v1/auth/profile updates password = 6", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ password: "sixess" })
            .expect(200);

        const updatedUser = await User.findById(admin._id);
        const isMatch = await comparePassword("sixess", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("PUT /api/v1/auth/profile updates password = 7", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ password: "sixesss" })
            .expect(200);

        const updatedUser = await User.findById(admin._id);
        const isMatch = await comparePassword("sixesss", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("PUT /api/v1/auth/profile rejects invalid phone", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ phone: "invalidphone" })
            .expect(200); // your controller returns 200 with error json

        expect(res.body).toEqual({ error: "Phone number should be numeric" });

        const updatedUser = await User.findById(admin._id);
        expect(updatedUser.phone).toBe(admin.phone); // unchanged
    });

    test("PUT /api/v1/auth/profile handles partial updates", async () => {
        const admin = await createSampleAdmin();
        const token = generateToken(admin._id, true)

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "Updated Name" })
            .expect(200);

        const updatedUser = await User.findById(admin._id);
        expect(updatedUser.name).toBe("Updated Name");
        expect(updatedUser.phone).toBe(admin.phone);
        expect(updatedUser.address).toBe(admin.address);
    });

    test("PUT /api/v1/auth/profile handles non-existent user", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const token = generateToken(fakeId);

        const res = await request(app)
            .put("/api/v1/auth/profile")
            .set("Authorization", `${token}`)
            .send({ name: "New Name" })
            .expect(404);

        expect(res.body).toEqual({ success: false, message: "User not found" });
    });
});
