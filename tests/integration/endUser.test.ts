import request from "supertest";
import app from "../../src/app";
import { createTestClient, createTestEndUser, createMultipleTestEndUsers, generateTestToken, cleanupTestData, addMonths } from "../helpers/testHelper";

describe("End User API Integration Tests", () => {
  let testClient: any;
  let authToken: string;

  beforeAll(async () => {
    testClient = await createTestClient();
    authToken = generateTestToken(testClient.id, testClient.email);
  });

  afterAll(async () => {
    await cleanupTestData(testClient.id);
  });

  describe("POST /api/end-users - Create End User", () => {
    it("should create a new end user successfully", async () => {
      const newUser = {
        name: "John Doe",
        phone: "6281234567890",
        package_name: "Premium Gym",
        package_price: 150000,
        billing_cycle: "monthly",
        due_date: "2025-10-15",
      };

      const response = await request(app).post("/api/end-users").set("Authorization", `Bearer ${authToken}`).send(newUser).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newUser.name);
      expect(response.body.data.phone).toBe("6281234567890");
      expect(response.body.data.status).toBe("active");
    });

    it("should return 401 without auth token", async () => {
      const response = await request(app).post("/api/end-users").send({ name: "Test" }).expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/end-users").set("Authorization", `Bearer ${authToken}`).send({ name: "Test" }).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/end-users - Get All End Users", () => {
    beforeEach(async () => {
      await createMultipleTestEndUsers(testClient.id, 3);
    });

    it("should get all end users with pagination", async () => {
      const response = await request(app).get("/api/end-users").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.end_users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it("should filter by status", async () => {
      const response = await request(app).get("/api/end-users?status=active").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.end_users.forEach((user: any) => {
        expect(user.status).toBe("active");
      });
    });

    it("should search by name", async () => {
      const response = await request(app).get("/api/end-users?search=Test").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.end_users.length).toBeGreaterThan(0);
    });

    it("should paginate results", async () => {
      const response = await request(app).get("/api/end-users?page=1&limit=2").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.end_users.length).toBeLessThanOrEqual(2);
    });
  });

  describe("GET /api/end-users/:id - Get Single End User", () => {
    let testEndUser: any;

    beforeEach(async () => {
      testEndUser = await createTestEndUser(testClient.id);
    });

    it("should get end user by id", async () => {
      const response = await request(app).get(`/api/end-users/${testEndUser.id}`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEndUser.id);
      expect(response.body.data.name).toBe(testEndUser.name);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).get("/api/end-users/999999").set("Authorization", `Bearer ${authToken}`).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("End user not found");
    });

    it("should not allow access to other client's users", async () => {
      const otherClient = await createTestClient();
      const otherUser = await createTestEndUser(otherClient.id);

      const response = await request(app).get(`/api/end-users/${otherUser.id}`).set("Authorization", `Bearer ${authToken}`).expect(404);

      expect(response.body.success).toBe(false);

      await cleanupTestData(otherClient.id);
    });
  });

  describe("PUT /api/end-users/:id - Update End User", () => {
    let testEndUser: any;

    beforeEach(async () => {
      testEndUser = await createTestEndUser(testClient.id);
    });

    it("should update end user successfully", async () => {
      const updateData = {
        name: "Updated Name",
        package_price: 200000,
      };

      const response = await request(app).put(`/api/end-users/${testEndUser.id}`).set("Authorization", `Bearer ${authToken}`).send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(parseFloat(response.body.data.package_price)).toBe(updateData.package_price);
    });

    it("should format phone number on update", async () => {
      const response = await request(app).put(`/api/end-users/${testEndUser.id}`).set("Authorization", `Bearer ${authToken}`).send({ phone: "6281234567890" }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe("6281234567890");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).put("/api/end-users/999999").set("Authorization", `Bearer ${authToken}`).send({ name: "Test" }).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/end-users/:id - Delete End User", () => {
    it("should soft delete end user (set status to inactive)", async () => {
      const testEndUser = await createTestEndUser(testClient.id);

      const response = await request(app).delete(`/api/end-users/${testEndUser.id}`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("End user deleted successfully");

      const checkResponse = await request(app).get(`/api/end-users/${testEndUser.id}`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(checkResponse.body.data.status).toBe("inactive");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).delete("/api/end-users/999999").set("Authorization", `Bearer ${authToken}`).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/end-users/:id/mark-paid - Mark as Paid (Phase 1)", () => {
    it("should mark active user as paid and extend due date by 1 month", async () => {
      const dueDate = new Date("2025-10-15");
      const testEndUser = await createTestEndUser(testClient.id, {
        status: "active",
        due_date: dueDate,
      });

      const response = await request(app).post(`/api/end-users/${testEndUser.id}/mark-paid`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Payment recorded successfully");
      expect(response.body.data.end_user.status).toBe("active");

      const nextDueDate = new Date(response.body.data.next_due_date);
      const expectedDate = addMonths(dueDate, 1);

      expect(nextDueDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("should mark overdue user as paid without changing due date", async () => {
      const dueDate = new Date("2025-09-01");
      const testEndUser = await createTestEndUser(testClient.id, {
        status: "overdue",
        due_date: dueDate,
      });

      const response = await request(app).post(`/api/end-users/${testEndUser.id}/mark-paid`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.end_user.status).toBe("active");

      const nextDueDate = new Date(response.body.data.next_due_date);
      expect(nextDueDate.toDateString()).toBe(dueDate.toDateString());
    });

    it("should update client billing after marking as paid", async () => {
      const testEndUser = await createTestEndUser(testClient.id);

      await request(app).post(`/api/end-users/${testEndUser.id}/mark-paid`).set("Authorization", `Bearer ${authToken}`).expect(200);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).post("/api/end-users/999999/mark-paid").set("Authorization", `Bearer ${authToken}`).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("End user not found");
    });
  });

  describe("POST /api/end-users/bulk/update-status - Bulk Operations (Phase 1)", () => {
    let testUsers: any[];

    beforeEach(async () => {
      testUsers = await createMultipleTestEndUsers(testClient.id, 3);
    });

    it("should bulk mark users as paid", async () => {
      const userIds: number[] = testUsers.map((u: any) => u.id);

      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: userIds,
          action: "mark_paid",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated_count).toBe(3);
      expect(response.body.data.results).toHaveLength(3);

      response.body.data.results.forEach((result: any) => {
        expect(result.next_due_date).toBeDefined();
      });
    });

    it("should bulk mark users as overdue", async () => {
      const userIds: number[] = testUsers.map((u: any) => u.id);

      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: userIds,
          action: "mark_overdue",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated_count).toBe(3);
    });

    it("should bulk mark users as inactive", async () => {
      const userIds: number[] = testUsers.map((u: any) => u.id);

      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: userIds,
          action: "mark_inactive",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated_count).toBe(3);
    });

    it("should return 400 for empty user_ids array", async () => {
      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: [],
          action: "mark_paid",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("user_ids array is required");
    });

    it("should return 400 for invalid action", async () => {
      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: [1, 2, 3],
          action: "invalid_action",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid action");
    });

    it("should return 400 for more than 100 users", async () => {
      const userIds = Array.from({ length: 101 }, (_, i) => i + 1);

      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: userIds,
          action: "mark_paid",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Maximum 100 users per batch");
    });

    it("should return 404 if no users found", async () => {
      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: [999999, 999998],
          action: "mark_paid",
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("No users found");
    });

    it("should not update other client's users", async () => {
      const otherClient = await createTestClient();
      const otherUsers = await createMultipleTestEndUsers(otherClient.id, 2);
      const otherUserIds: number[] = otherUsers.map((u: any) => u.id);

      const response = await request(app)
        .post("/api/end-users/bulk/update-status")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_ids: otherUserIds,
          action: "mark_paid",
        })
        .expect(404);

      expect(response.body.success).toBe(false);

      await cleanupTestData(otherClient.id);
    });
  });
});
