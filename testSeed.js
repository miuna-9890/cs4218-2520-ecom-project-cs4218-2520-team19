import { connectDB, disconnectDB } from "./config/db.js";
import { createTestUser } from "./e2e-tests/test-user.js";
import { createTestData } from "./e2e-tests/test-products.js";

const seed = async () => {
  await connectDB();
  await createTestUser();
  await createTestData();
  await disconnectDB();
};

seed()
  .then(() => {
    console.log("Seeding complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });