import dotenv from 'dotenv';
import { connectDB, disconnectDB } from "../config/db.js";
import userModel from '../models/userModel.js';
import { hashPassword } from '../helpers/authHelper.js';

dotenv.config();

const testUser = Object.freeze({
  name: 'uitest',
  email: 'uitest@email.com',
  password: 'password123',
  phone: '123456789',
  address: 'uitest address',
  answer: 'tennis',
  role: 0,
});

const createTestUser = async () => {
  console.log('Creating test user...');
  const hashedPassword = await hashPassword(testUser.password);
  if (await userModel.findOne({ email: testUser.email })) {
    await userModel.findOneAndUpdate({ email: testUser.email }, { ...testUser, password: hashedPassword });
  } else {
    await userModel.create({ ...testUser, password: hashedPassword });
  }
};

const deleteTestUser = async () => {
  await connectDB();
  await userModel.deleteOne({ email: testUser.email });
  await disconnectDB();
};

export {testUser, createTestUser, deleteTestUser};