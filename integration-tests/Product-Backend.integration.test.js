// Thanakorn Pawirunsiri, A0266315E

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import productRoutes from "../routes/productRoutes.js";
import userModel from "../models/userModel.js";
import JWT from "jsonwebtoken";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
let token;
let mongoServer;

const app = express();
app.use(express.json());
app.use("/api/v1/product", productRoutes);

// Mock data
const mockCategory = {
  _id: new mongoose.Types.ObjectId(),
  name: "Electronics",
  slug: "electronics",
};

const mockProduct = {
  description: "A powerful test laptop",
  price: 1500,
  category: mockCategory._id.toString(),
  quantity: 10,
  shipping: true,
};

const mockRelatedProduct = {
  description: "A high resolution monitor",
  price: 800,
  category: mockCategory._id.toString(),
  quantity: 5,
  shipping: true,
};

// Setup / Teardown
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await mongoose.connection.collection("categories").insertOne({
    _id: mockCategory._id,
    name: mockCategory.name,
    slug: mockCategory.slug,
  });

  const adminUser = await userModel.create({
    name: "Admin",
    email: "admin@test.com",
    password: "hashedpassword",
    phone: "12345678",
    address: { street: "123 Test St" },
    answer: "test answer",
    role: 1,
  });

  token = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
});

afterEach(async () => {
  await mongoose.connection.collection("products").deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Helper
const createProduct = (overrides = {}) =>
  request(app)
    .post("/api/v1/product/create-product")
    .set("Authorization", token)
    .field("name", overrides.name || `Test Laptop ${Date.now()}`)
    .field("description", overrides.description || mockProduct.description)
    .field("price", String(overrides.price ?? mockProduct.price))
    .field("category", String(overrides.category || mockProduct.category))
    .field("quantity", String(overrides.quantity ?? mockProduct.quantity))
    .field("shipping", String(overrides.shipping ?? mockProduct.shipping));

// Tests
describe("Product Controller Integration Tests", () => {
  it("should create a product and retrieve it via get all and get single", async () => {
    const createRes = await createProduct({ name: "Test Laptop" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    const slug = createRes.body.products.slug;

    const getAllRes = await request(app).get("/api/v1/product/get-product");
    expect(getAllRes.status).toBe(200);
    expect(getAllRes.body.products.map((p) => p.name)).toContain("Test Laptop");

    const getSingleRes = await request(app).get(
      `/api/v1/product/get-product/${slug}`,
    );
    expect(getSingleRes.status).toBe(200);
    expect(getSingleRes.body.product.name).toBe("Test Laptop");
    expect(getSingleRes.body.product.price).toBe(1500);
  });

  it("should create a product and have it appear in filtered results", async () => {
    const createRes = await createProduct({ name: "Filter Test Laptop" });
    expect(createRes.status).toBe(201);

    const filterRes = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [mockCategory._id.toString()],
        radio: [0, 2000],
      });
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.success).toBe(true);
    expect(filterRes.body.products.map((p) => p.name)).toContain(
      "Filter Test Laptop",
    );
  });

  it("should create a product and see the product count increment", async () => {
    const beforeRes = await request(app).get("/api/v1/product/product-count");
    const before = beforeRes.body.total;

    await createProduct({ name: "Count Test Laptop" });

    const afterRes = await request(app).get("/api/v1/product/product-count");
    expect(afterRes.body.total).toBe(before + 1);
  });

  it("should update a product and reflect changes in get single product", async () => {
    const createRes = await createProduct({ name: "Original Laptop" });
    const productId = createRes.body.products._id;

    const updateRes = await request(app)
      .put(`/api/v1/product/update-product/${productId}`)
      .set("Authorization", token)
      .field("name", "Updated Laptop")
      .field("description", mockProduct.description)
      .field("price", "1200")
      .field("category", mockProduct.category)
      .field("quantity", String(mockProduct.quantity))
      .field("shipping", String(mockProduct.shipping));

    expect(updateRes.status).toBe(201);
    expect(updateRes.body.success).toBe(true);

    const updatedSlug = updateRes.body.products.slug;

    const getRes = await request(app).get(
      `/api/v1/product/get-product/${updatedSlug}`,
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.product.name).toBe("Updated Laptop");
    expect(getRes.body.product.price).toBe(1200);
  });

  it("should delete a product and have it absent from get all products", async () => {
    const createRes = await createProduct({ name: "Delete Me Laptop" });
    const productId = createRes.body.products._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/product/delete-product/${productId}`)
      .set("Authorization", token);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const getRes = await request(app).get("/api/v1/product/get-product");
    expect(getRes.status).toBe(200);
    expect(getRes.body.products.map((p) => p.name)).not.toContain(
      "Delete Me Laptop",
    );
  });

  it("should delete a product and have it absent from filtered results", async () => {
    const createRes = await createProduct({ name: "Delete Filter Laptop" });
    const productId = createRes.body.products._id;

    await request(app)
      .delete(`/api/v1/product/delete-product/${productId}`)
      .set("Authorization", token);

    const filterRes = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [mockCategory._id.toString()],
        radio: [0, 2000],
      });
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.products.map((p) => p.name)).not.toContain(
      "Delete Filter Laptop",
    );
  });

  it("should delete a product and see the product count decrement", async () => {
    const createRes = await createProduct({ name: "Soon Deleted Laptop" });
    const productId = createRes.body.products._id;

    const beforeRes = await request(app).get("/api/v1/product/product-count");
    const before = beforeRes.body.total;

    await request(app)
      .delete(`/api/v1/product/delete-product/${productId}`)
      .set("Authorization", token);

    const afterRes = await request(app).get("/api/v1/product/product-count");
    expect(afterRes.body.total).toBe(before - 1);
  });

  it("should create a product and find it via search by name keyword", async () => {
    const createRes = await createProduct({ name: "Searchable Gaming Laptop" });
    expect(createRes.status).toBe(201);

    const searchRes = await request(app).get("/api/v1/product/search/Gaming");
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.map((p) => p.name)).toContain(
      "Searchable Gaming Laptop",
    );
  });

  it("should create two products in the same category and have one appear as related to the other", async () => {
    const firstRes = await createProduct({ name: "Primary Laptop" });
    const firstId = firstRes.body.products._id;

    await createProduct({
      ...mockRelatedProduct,
      name: "Related Monitor",
    });

    const relatedRes = await request(app).get(
      `/api/v1/product/related-product/${firstId}/${mockCategory._id}`,
    );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.body.success).toBe(true);

    const names = relatedRes.body.products.map((p) => p.name);
    expect(names).toContain("Related Monitor");
    expect(names).not.toContain("Primary Laptop");
  });

  it("should create a product and retrieve it via product category route", async () => {
    const createRes = await createProduct({ name: "Category Test Laptop" });
    expect(createRes.status).toBe(201);

    const catRes = await request(app).get(
      `/api/v1/product/product-category/${mockCategory.slug}`,
    );
    expect(catRes.status).toBe(200);
    expect(catRes.body.success).toBe(true);
    expect(catRes.body.category.slug).toBe("electronics");
    expect(catRes.body.products.map((p) => p.name)).toContain(
      "Category Test Laptop",
    );
  });
});
