const fs = require("fs");
const path = require("path");

const controllersDir = path.join(__dirname, "../src/controllers");

// Files to update
const files = [
  "adminController.ts",
  "authController.ts",
  "billingController.ts",
  "dashboardController.ts",
  "endUserController.ts",
  "reminderController.ts",
  "webhookController.ts",
];

files.forEach((file) => {
  const filePath = path.join(controllersDir, file);

  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");

    // Replace logger.error patterns
    content = content.replace(
      /logger\.error\("(.+?)", \{ error: error\.message \}\);/g,
      'logger.error("$1", { requestId: req.id, error: error.message });'
    );

    // Replace logger.info patterns
    content = content.replace(
      /logger\.info\("(.+?)", \{/g,
      'logger.info("$1", {\n  requestId: req.id,'
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⚠️  Not found: ${file}`);
  }
});

console.log("\n✅ All controllers updated!");
