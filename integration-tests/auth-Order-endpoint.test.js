// Varatharaju Mithuna, A0281223N

// contains integration tests for getOrdersController, getAllOrdersController, orderStatusController
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
    const uri = mongoServer.getUri("orders-test-db"); // unique name
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
const createSampleUser2 = async () => {
    const hashedPassword = await hashPassword("oldpassword");
    const user = await User.create({
        name: "Bob Doe",
        email: "Bob@gmail.com",
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

describe("FLOW: Login → GET orders", () => {

    test("login and view orders successfully", async () => {
        const { user1, orders1 } = await createSampleOrders1();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user1.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const ordersRes = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", token)
            .expect(200);
        expect(ordersRes.body.length).toBe(2);
        expect(ordersRes.body[0]._id.toString()).toBe(orders1[0]._id.toString());
    });

    test("login and see empty array if no orders", async() => {
        const user = await createSampleUser1();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const res = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", `${token}`)
            .expect(200);

        expect(res.body).toEqual([]);
    });

    test("rejects access to /orders with missing token", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() =>{});
        const res = await request(app)
            .get("/api/v1/auth/orders")
            .expect(401);
        expect(res.body.message).toMatch("Error in require sign in middleware");
        consoleSpy.mockRestore();
    })

    test(" login user cannot access another user's orders", async () => {
        const { user1 } = await createSampleOrders1();
        const user2 = await createSampleUser2();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user2.email, password: "oldpassword" })
            .expect(200);

        const token = loginRes.body.token;

        const res = await request(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", token)
            .expect(200);

        expect(res.body).toEqual([]);
    });
});

describe("FLOW: ADMIN Login → GET all-orders", () => {

    test("login and view orders successfully", async () => {
        const { user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const ordersRes = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", token)
            .expect(200);
        expect(ordersRes.body.length).toBe(2);
        expect(ordersRes.body.map(o => o._id)).toEqual(expect.arrayContaining([orders1[0]._id.toString(), orders1[1]._id.toString()]));
    });

    test("login and see empty array if no orders", async() => {
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", `${token}`)
            .expect(200);

        expect(res.body).toEqual([]);
    });

    test("regular user login then access /all-orders should fail", async () => {
        const { user1 } = await createSampleOrders1();

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: user1.email, password: "oldpassword" })
            .expect(200);
        const token = loginRes.body.token;

        const res = await request(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", token)
            .expect(401);

        expect(res.body.message).toMatch("UnAuthorized Access");
    });
});

describe("FLOW: ADMIN Login -> PUT orderStatus", () => {
    test("login and updates order status successfully", async () => {
        const {user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const orderToUpdate = orders1[0];

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", token)
            .send({ status: "Shipped" })
            .expect(200);

        expect(res.body.status).toBe("Shipped");

        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe("Shipped");
    });

    test("login and updates all valid status values", async () => {
        const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
        const {user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const orderToUpdate = orders1[0];
        for (const status of validStatuses) {
            const res = await request(app)
                .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
                .set("Authorization", token)
                .send({ status })
                .expect(200);

            expect(res.body.status).toBe(status);
            const updatedOrder = await Order.findById(orderToUpdate._id);
            expect(updatedOrder.status).toBe(status);
        }
    });

    test("login and gets null when order does not exist", async() => {
        const fakeId = new mongoose.Types.ObjectId();
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const res = await request(app)
            .put(`/api/v1/auth/order-status/${fakeId}`)
            .set("Authorization", token)
            .send({ status: "Shipped" })
            .expect(200);

        expect(res.body).toBeNull();
    });

    test("login and returs error when trying to update invalid status", async() => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const {user1, orders1 } = await createSampleOrders1();
        const admin = await createSampleAdmin();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: admin.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const orderToUpdate = orders1[0];
        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", token)
            .send({ status: "InvalidStatus" })
            .expect(500);

        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe(orderToUpdate.status);
        consoleSpy.mockRestore();
    });

    test("rejects non-admin to update status", async() => {
        const {user1, orders1 } = await createSampleOrders1();
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: user1.email,
                password: "oldpassword"
            })
            .expect(200);

        const token = loginRes.body.token;
        const orderToUpdate = orders1[0];

        const res = await request(app)
            .put(`/api/v1/auth/order-status/${orderToUpdate._id}`)
            .set("Authorization", token)
            .send({ status: "Shipped" })
            .expect(401); // middleware should block

        expect(res.body.message).toMatch( "UnAuthorized Access");
    });
});

