const db = require("../models");

// Setup: Sebelum semua test
beforeAll(async () => {
  // Sync database (test mode)
  await db.sequelize.sync({ force: true });
  console.log("✅ Test database synced");
});

// Teardown: Setelah semua test
afterAll(async () => {
  await db.sequelize.close();
  console.log("✅ Test database closed");
});

// Cleanup: Setelah tiap test
afterEach(async () => {
  // Clear test data jika perlu
});
