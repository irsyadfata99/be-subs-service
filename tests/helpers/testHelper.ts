import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../../models";

const { Client, EndUser } = db;

// Generate JWT token for testing
export const generateTestToken = (clientId: number, email: string): string => {
  const secret = process.env.JWT_SECRET || "default_secret";
  return jwt.sign({ id: clientId, email }, secret, { expiresIn: "1h" });
};

// Create test client
export const createTestClient = async (overrides: any = {}) => {
  const timestamp = Date.now();
  const hashedPassword = await bcrypt.hash("Test123!@#", 10);

  const client = await Client.create({
    business_name: overrides.business_name || `Test Business ${timestamp}`,
    business_type: overrides.business_type || "Gym",
    email: overrides.email || `test${timestamp}@test.com`,
    password: hashedPassword,
    phone: overrides.phone || `628${Math.floor(100000000 + Math.random() * 900000000)}`,
    status: overrides.status || "active",
    total_users: overrides.total_users || 0,
    monthly_bill: overrides.monthly_bill || 0,
    ...overrides,
  });

  // Reload to ensure we have the ID
  await client.reload();
  return client;
};

// Create test end user
export const createTestEndUser = async (clientId: number, overrides: any = {}) => {
  const timestamp = Date.now();

  const endUser = await EndUser.create({
    client_id: clientId,
    name: overrides.name || `Test User ${timestamp}`,
    phone: overrides.phone || `628${Math.floor(100000000 + Math.random() * 900000000)}`,
    package_name: overrides.package_name || "Premium Package",
    package_price: overrides.package_price || 100000,
    billing_cycle: overrides.billing_cycle || "monthly",
    due_date: overrides.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: overrides.status || "active",
    ...overrides,
  });

  return endUser;
};

// Create multiple test end users
export const createMultipleTestEndUsers = async (clientId: number, count: number): Promise<any[]> => {
  const users: any[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestEndUser(clientId, {
      name: `Test User ${Date.now()}-${i}`,
      phone: `628${Math.floor(100000000 + Math.random() * 900000000)}`,
    });
    users.push(user);
  }
  return users;
};

// Clean up test data
export const cleanupTestData = async (clientId?: number) => {
  try {
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    if (clientId) {
      await EndUser.destroy({ where: { client_id: clientId }, force: true });
      await Client.destroy({ where: { id: clientId }, force: true });
    } else {
      // Clean all test data
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await EndUser.destroy({
        where: { created_at: { [db.Sequelize.Op.gte]: oneHourAgo } },
        force: true,
      });
      await Client.destroy({
        where: {
          created_at: { [db.Sequelize.Op.gte]: oneHourAgo },
          email: { [db.Sequelize.Op.like]: "test%@test.com" },
        },
        force: true,
      });
    }

    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};

// Add months helper
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};
