import dotenv from "dotenv";
import path from "path";
import db from "../../models";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log("✅ Test database connected");

    // Sync database (force: false to keep existing data structure)
    await db.sequelize.sync({ force: false });
    console.log("✅ Database synced");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Clean up all test data at the very end
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    await db.Reminder?.destroy({
      where: {
        created_at: { [db.Sequelize.Op.gte]: oneHourAgo },
      },
      force: true,
    });

    await db.EndUser?.destroy({
      where: {
        created_at: { [db.Sequelize.Op.gte]: oneHourAgo },
      },
      force: true,
    });

    await db.Client?.destroy({
      where: {
        created_at: { [db.Sequelize.Op.gte]: oneHourAgo },
        email: { [db.Sequelize.Op.like]: "test%@test.com" },
      },
      force: true,
    });

    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    // Close database connection
    await db.sequelize.close();
    console.log("✅ Test database connection closed");
  } catch (error) {
    console.error("❌ Error closing database:", error);
  }
});
