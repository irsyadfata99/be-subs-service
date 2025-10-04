const request = require("supertest");
const app = require("../src/app"); // Export app dari app.ts
const db = require("../models");

describe("Health Check", () => {
  test("GET /health - Should return OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });
});

describe("Authentication", () => {
  const testUser = {
    business_name: "Test Gym",
    email: "test@gym.com",
    password: "Test123456",
    business_type: "Fitness",
  };

  test("POST /api/auth/register - Success", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/auth/login - Success", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test("POST /api/auth/login - Wrong Password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });
});
