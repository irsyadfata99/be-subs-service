import bcrypt from "bcryptjs";
const db = require("./models");

(async () => {
  const { Client } = db;

  console.log("Fixing password for testweek2@test.com...\n");

  const newHash = await bcrypt.hash("Test123!@#", 10);
  console.log("Generated hash:", newHash);

  const [updated] = await Client.update(
    { password: newHash },
    { where: { email: "testweek2@test.com" } }
  );

  if (updated > 0) {
    console.log("\n✅ Password fixed!");
    console.log("Try login now:");
    console.log("  Email: testweek2@test.com");
    console.log("  Password: Test123!@#");
  } else {
    console.log("\n❌ Email not found in database");
  }

  process.exit(0);
})();
