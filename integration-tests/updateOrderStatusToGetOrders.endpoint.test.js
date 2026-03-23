// Varatharaju Mithuna, A0281223N

// contains integration tests for getOrdersController with orderStatusController
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
import User from "../models/userModel";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from '../routes/authRoute.js';
import {hashPassword} from "../helpers/authHelper.js";
import Category from "../models/categoryModel";
import Product from "../models/productModel";
import Order from "../models/orderModel";
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

    const uri = mongoServer.getUri("updateStatus-test-db"); // different name
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
const createSampleUser1 = async () => {
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
const createSampleOrders1 = async () => {
    const user1 = await createSampleUser1();
    const category = await createSampleCategory();
    const products = await createSampleProducts(category._id);

    const order1 = await Order.create({
        products: products.map(p => p._id),
        payment: {success: true},
        buyer: user1._id,
        status: "Delivered",
        createdAt: new Date()
    });

    const order2 = await Order.create({
        products: products.map(p => p._id),
        payment: {success: false},
        buyer: user1._id,
        status: "Processing",
        createdAt: new Date()
    });
    return { user1: user1, orders1: [order1, order2] };
}


describe("FLOW: Admin updates order → User views updated order", () => {
    test("order status update is reflected when user fetches orders", async () => {
        const { user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();

        // 1. Admin logs in
        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const adminToken = adminLogin.body.token;

        // 2. Admin updates order status
        const orderToUpdate = orders1[0];

        await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", adminToken)
            .send({ status: "Shipped" })
            .expect(200);

        // 3. User logs in
        const userLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user1.email,
                password: "oldpassword"
            })
            .expect(200);

        const userToken = userLogin.body.token;

        // 4. User fetches orders
        const ordersRes = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", userToken)
            .expect(200);

        // 5. Check updated status is reflected
        const updatedOrder = ordersRes.body.find(
            o => o._id.toString() === orderToUpdate._id.toString()
        );

        expect(updatedOrder.status).toBe("Shipped");
    });
    test("updating non-existent order does not affect user orders", async () => {
        const { user1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const fakeOrderId = new mongoose.Types.ObjectId();

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: admin.email, password: "oldpassword" })
            .expect(200);

        const adminToken = adminLogin.body.token;

        await request(app)
            .put(`/api/v1/auth/order-status/${fakeOrderId}`)
            .set("Authorization", adminToken)
            .send({ status: "Shipped" })
            .expect(200); // controller returns null for non-existent

        const userLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user1.email, password: "oldpassword" })
            .expect(200);

        const userToken = userLogin.body.token;

        const ordersRes = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", userToken)
            .expect(200);

        expect(ordersRes.body.length).toBe(2); // original orders unaffected
    });
    test("admin invalid status update does not change user view", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const { user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const orderToUpdate = orders1[0];

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: admin.email, password: "oldpassword" })
            .expect(200);

        const adminToken = adminLogin.body.token;

        await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", adminToken)
            .send({ status: "InvalidStatus" })
            .expect(500);

        const userLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user1.email, password: "oldpassword" })
            .expect(200);

        const userToken = userLogin.body.token;

        const ordersRes = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", userToken)
            .expect(200);

        const updatedOrder = ordersRes.body.find(o => o._id.toString() === orderToUpdate._id.toString());
        expect(updatedOrder.status).toBe(orderToUpdate.status); // still old status

        consoleSpy.mockRestore();
    });
    test("non-admin cannot update order and state remains unchanged", async () => {
        const { user1, orders1 } = await createSampleOrders1();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user1.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const orderToUpdate = orders1[0];

        await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", token)
            .send({ status: "Shipped" })
            .expect(401);

        const orderInDb = await Order.findById(orderToUpdate._id);
        expect(orderInDb.status).toBe(orderToUpdate.status);
    });
});

describe("FLOW: Admin updates order → Admin views updated order", () => {
    test("order status update is reflected when admin fetches all-orders", async () => {
        const { user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();

        // 1. Admin logs in
        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const adminToken = adminLogin.body.token;

        // 2. Admin updates order status
        const orderToUpdate = orders1[0];

        await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", adminToken)
            .send({ status: "Shipped" })
            .expect(200);

        // 4. Admin fetches orders
        const ordersRes = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", adminToken)
            .expect(200);

        // 5. Check updated status is reflected
        const updatedOrder = ordersRes.body.find(
            o => o._id.toString() === orderToUpdate._id.toString()
        );

        expect(updatedOrder.status).toBe("Shipped");
    });
    test("admin can update multiple orders and see reflected status", async () => {
        const { orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();

        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: admin.email, password: "oldpassword" })
            .expect(200);

        const adminToken = adminLogin.body.token;

        for (const order of orders1) {
            await request(app)
                .put(`/api/v1/auth/order-status/${order._id}`)
                .set("Authorization", adminToken)
                .send({ status: "Processing" })
                .expect(200);
        }

        const ordersRes = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", adminToken)
            .expect(200);

        ordersRes.body.forEach(order => {
            expect(order.status).toBe("Processing");
        });
    });
    test("invalid status update does not affect all-orders view", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const { orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const orderToUpdate = orders1[0];

        // Admin login
        const adminLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: admin.email, password: "oldpassword" })
            .expect(200);

        const adminToken = adminLogin.body.token;

        // Attempt invalid update
        await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", adminToken)
            .send({ status: "InvalidStatus" })
            .expect(500); // controller returns 500

        // Fetch all orders
        const ordersRes = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", adminToken)
            .expect(200);

        // Make sure the invalid update didn't change the order
        const originalOrder = ordersRes.body.find(
            o => o._id.toString() === orderToUpdate._id.toString()
        );

        expect(originalOrder.status).toBe(orderToUpdate.status); // still old status
        consoleSpy.mockRestore();
    });
});
