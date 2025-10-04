const request = require("supertest");
const db = require("../models");
const bcrypt = require("bcrypt");

let app;
let testClient;
let testToken;

beforeAll(async () => {
  // Import app after models loaded
  app = require("../src/app").default;

  // Sync database
  await db.sequelize.sync({ force: true });

  // Create test client
  testClient = await db.Client.create({
    business_name: "Test Gym",
    email: "test@gym.com",
    password: await bcrypt.hash("Test123456", 10),
    business_type: "Fitness",
    status: "active",
    role: "client",
  });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("API Tests", () => {
  test("GET /health - Should return OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("POST /api/auth/login - Success", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "test@gym.com",
      password: "Test123456",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();

    // Save token untuk test berikutnya
    testToken = res.body.data.token;
  });

  test("GET /api/auth/me - Valid Token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("test@gym.com");
  });

  test("GET /api/end-users - List End Users", async () => {
    const res = await request(app).get("/api/end-users").set("Authorization", `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
