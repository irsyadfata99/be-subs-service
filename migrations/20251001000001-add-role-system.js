"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add role column
    await queryInterface.addColumn("clients", "role", {
      type: Sequelize.ENUM("client", "admin", "super_admin"),
      defaultValue: "client",
      allowNull: false,
      after: "status",
    });

    // Add last_active_at for inactive tracking
    await queryInterface.addColumn("clients", "last_active_at", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    });

    console.log("✅ Added role and last_active_at columns to clients table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("clients", "role");
    await queryInterface.removeColumn("clients", "last_active_at");
    console.log("✅ Removed role and last_active_at columns from clients table");
  },
};
