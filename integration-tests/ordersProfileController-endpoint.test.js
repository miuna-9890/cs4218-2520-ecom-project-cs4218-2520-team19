// Varatharaju Mithuna, A0281223N

// contains integration tests for updateProfileController, getOrdersController,
// getAllOrdersController, orderStatusController with DB
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Order from "../models/orderModel";
import User from "../models/userModel";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } from "../controllers/authController";
import {comparePassword, hashPassword} from "../helpers/authHelper";

let mongoServer;

// Set up in-memory MongoDB server before running tests and connect mongoose to it
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const uri = mongoServer.getUri("controller-test-db"); // different name
    await mongoose.connect(uri);
});

// Clean up database and disconnect mongoose after tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Clear collections after each test to ensure isolation
afterEach(async () => {
    await Order.deleteMany({});
    await User.deleteMany({});
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
const createSampleUsers = async () => {
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
// create mock user and order data for testing
const createSampleOrders = async () => {
    const user = await createSampleUsers();
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

describe("getOrdersController Integration Test", () => {
    let req, res;

    beforeEach(async () => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test("should return orders for authenticated user", async () => {
        const { user, orders } = await createSampleOrders();
        req.user = { _id: user._id };

        await getOrdersController(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ _id: orders[0]._id }),
                expect.objectContaining({ _id: orders[1]._id }),
            ])
        );
    });

    test("return an empty array if user has no orders", async () => {
        const userWithoutOrders = await User.create({
            name: "Jane Doe",
            email: "Jane@gmail.com",
            password: 'password123',
            phone: '1234567890',
            address: '123 Main St',
            answer: "My first pet's name"
        });
        req.user = { _id: userWithoutOrders._id };

        await getOrdersController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

});

describe("getAllOrdersController Integration Test", () => {
    let req, res;

    beforeEach(async () => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test("should return all orders for admin", async () => {
        const { orders } = await createSampleOrders();

        await getAllOrdersController(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ _id: orders[0]._id }),
                expect.objectContaining({ _id: orders[1]._id }),
            ])
        );
    });

    test("should return an empty array if there are no orders", async () => {
        // Clear all orders from the database
        await Order.deleteMany({});

        await getAllOrdersController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

    test('checks orders are returned in descending order of creation', async () => {
        const {orders} = await createSampleOrders();

        await getAllOrdersController(req, res);

        // Check if the first order returned is the most recently created one
        const firstReturnedOrder = res.json.mock.calls[0][0][0]; // Get the first order from the json response
        expect(firstReturnedOrder._id.toString()).toBe(orders[1]._id.toString()); // The second order created should be returned first

        const secondReturnedOrder = res.json.mock.calls[0][0][1]; // Get the second order from the json response
        expect(secondReturnedOrder._id.toString()).toBe(orders[0]._id.toString()); // The first order created should be returned second
    });
});

describe("orderStatusController Integration Test", () => {
    let req, res;

    beforeEach(async () => {
        req = {
            params: {},
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test("should update order status successfully", async () => {
        const { orders } = await createSampleOrders();
        const orderToUpdate = orders[0];
        req.params.orderId = orderToUpdate._id;
        req.body.status = "Shipped";

        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ _id: orderToUpdate._id, status: "Shipped" })
        );
        //check db to ensure status was updated
        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe("Shipped");
    });

    test('updates order even if status is the same as current status', async () => {
        const { orders } = await createSampleOrders();
        const orderToUpdate = orders[0];
        req.params.orderId = orderToUpdate._id;
        req.body.status = orderToUpdate.status; // Set to current status

        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ _id: orderToUpdate._id, status: orderToUpdate.status })
        );

        //check db to ensure status was updated (even if it's the same value)
        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe(orderToUpdate.status);
    });

    test('accepts all valid status values', async () => {
        const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
        const { orders } = await createSampleOrders();
        const orderToUpdate = orders[0];
        req.params.orderId = orderToUpdate._id;

        for (const status of validStatuses) {
            req.body.status = status;
            await orderStatusController(req, res);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ _id: orderToUpdate._id, status })
            );
            //check db to ensure status was updated
            const updatedOrder = await Order.findById(orderToUpdate._id);
            expect(updatedOrder.status).toBe(status);
            res.json.mockClear(); // Clear mock calls before next iteration
        }

    });

    test('should not update order status if invalid status value is provided', async () => {
        const { orders } = await createSampleOrders();
        const orderToUpdate = orders[0];
        req.params.orderId = orderToUpdate._id;
        req.body.status = "InvalidStatus"; // Set to an invalid status

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.any(Error),
            message: "Error While Updating Order"
        }));
        //check db to ensure status was not updated
        const updatedOrder = await Order.findById(orderToUpdate._id);
        expect(updatedOrder.status).toBe(orderToUpdate.status); // Status should remain unchanged

        consoleSpy.mockRestore();
    });

    test('return empty object if orderId does not exist', async () => {
        req.params.orderId = new mongoose.Types.ObjectId(); // Use a valid ObjectId that doesn't exist in the database
        req.body.status = "Shipped";

        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalledWith(null);
    });

});

describe("updateProfileController Integration Test", () => {
    let req, res;

    beforeEach(async () => {
        req = {
            user: {},
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test("should update user profile successfully", async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { name: 'New Name', password: 'newpassword', phone: '1234567890', address: 'New Address' };

        await updateProfileController(req, res);

        //check db to ensure profile was updated
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe('New Name');
        expect(updatedUser.phone).toBe('1234567890');
        expect(updatedUser.address).toBe('New Address');
        const isMatch = await comparePassword("newpassword", updatedUser.password);
        expect(isMatch).toBe(true);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: expect.objectContaining({ name: 'New Name', phone: '1234567890', address: 'New Address' })
        }));
    });

    test("should return error if password is = 5 characters and updateProfileController should not update profile", async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { password: 'short' }; // 5 characters

        await updateProfileController(req, res);

        //check db to ensure profile was not updated
        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
    });

    test("password = 6 characters should update profile successfully", async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { password: 'sixsix' }; // 6 characters

        await updateProfileController(req, res);

        //check db to ensure password was updated
        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("sixsix", updatedUser.password);
        expect(isMatch).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: expect.objectContaining({ name: user.name, phone: user.phone, address: user.address })
        }));
     });

    test("password = 7 characters should update profile successfully", async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { password: 'seven77' }; // 7 characters

        await updateProfileController(req, res);

        //check db to ensure password was updated
        const updatedUser = await User.findById(user._id);
        const isMatch = await comparePassword("seven77", updatedUser.password);
        expect(isMatch).toBe(true);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: expect.objectContaining({ name: user.name, phone: user.phone, address: user.address })
        }));
     });

    test("update profile throws error if phone is invalid and updateProfileController should not update profile", async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { phone: 'invalidphone' }; // Invalid phone number

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await updateProfileController(req, res);

        expect(res.json).toHaveBeenCalledWith({error: "Phone number should be numeric"});
        //check db to ensure profile was not updated
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.phone).toBe(user.phone); // Phone should remain unchanged

        consoleSpy.mockRestore();
     });

    test('updateProfileController keeps existing values if all fields are not provided', async () => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = {name: "", password: "", phone: "", address: ""}; // Empty values should not overwrite existing values

        await updateProfileController(req, res);

        //check db to ensure existing values were not overwritten
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe(user.name);
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
        expect(updatedUser.phone).toBe(user.phone);
        expect(updatedUser.address).toBe(user.address);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: expect.objectContaining({ name: user.name, phone: user.phone, address: user.address })
        }));
     });

    test('updateProfileController keeps existing values if some fields(partial updates) are not provided', async() => {
        const user = await createSampleUsers();
        req.user._id = user._id;
        req.body = { name: "Updated Name" }; // Only name is provided, other fields should remain unchanged

        await updateProfileController(req, res);

        //check db to ensure only name was updated and other values remain unchanged
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.name).toBe("Updated Name");
        const isMatch = await comparePassword("oldpassword", updatedUser.password);
        expect(isMatch).toBe(true);
        expect(updatedUser.phone).toBe(user.phone);
        expect(updatedUser.address).toBe(user.address);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: expect.objectContaining({ name: "Updated Name", phone: user.phone, address: user.address })
        }));
     });

    test("handles when user is not found and returns appropriate error message", async () => {
        req.user._id = new mongoose.Types.ObjectId(); // Use a valid ObjectId that doesn't exist in the database
        req.body = { name: 'New Name' };

        await updateProfileController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "User not found"
        }));
     });
});
