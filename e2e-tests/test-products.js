import dotenv from "dotenv";
import slugify from "slugify";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import { connectDB, disconnectDB } from "../config/db.js";

dotenv.config();

const products = [
    {
        name: "Textbook",
        slug: "textbook",
        description: "A comprehensive textbook",
        price: 79.99,
        quantity: 50,
        shipping: false,
        photo: '',
        categoryName: "Books"
    },
    {
        name: "Laptop",
        slug: "laptop",
        description: "A powerful laptop",
        price: 1499.99,
        quantity: 25,
        shipping: true,
        photo: '',
        categoryName: "Electronics"
    },
    {
        name: "Smartphone",
        slug: "smartphone",
        description: "A high-end smartphone",
        price: 999.99,
        quantity: 50,
        shipping: false,
        photo: '',
        categoryName: "Electronics"
    },
    {
        name: "Novel",
        slug: "novel",
        description: "A bestselling novel",
        price: 14.99,
        quantity: 100,
        shipping: true,
        photo: '',
        categoryName: "Books"
    },
    {
        name: "The Law of Contract in Singapore",
        slug: "the-law-of-contract-in-singapore",
        description: "A bestselling book in singapore",
        price: 54.99,
        quantity: 30,
        shipping: true,
        photo: '',
        categoryName: "Books"
    },
    {
        name: "NUS T-shirt",
        slug: "nus-t-shirt",
        description: "Plain NUS T-shirt for sale",
        price: 4.99,
        quantity: 200,
        shipping: true,
        photo: '',
        categoryName: "Clothing"
    }
];

async function createTestData() {
  console.log('Creating test data...');
  for (const product of products) {
    let category = await categoryModel.findOne({ name: product.categoryName });

    if (!category) {
      category = await categoryModel.create({
        name: product.categoryName,
        slug: slugify(product.categoryName),
      });
    }

    const existingProduct = await productModel.findOne({ slug: product.slug });
    if (existingProduct) {
      continue;
    }

    await productModel.create({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      shipping: product.shipping,
      category: category._id,
    });
  }
}

async function deleteTestData() {
  await connectDB();
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
  await disconnectDB();
};

export { products, createTestData, deleteTestData };