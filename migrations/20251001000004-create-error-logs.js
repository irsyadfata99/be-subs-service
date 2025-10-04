"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("error_logs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      level: {
        type: Sequelize.ENUM("error", "warning", "info"),
        allowNull: false,
        defaultValue: "error",
      },
      service: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: "Service name (e.g., cronService, billingService)",
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      stack_trace: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "clients",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional error context",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("error_logs", ["level"]);
    await queryInterface.addIndex("error_logs", ["service"]);
    await queryInterface.addIndex("error_logs", ["client_id"]);
    await queryInterface.addIndex("error_logs", ["created_at"]);

    console.log("✅ Created error_logs table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("error_logs");
    console.log("✅ Dropped error_logs table");
  },
};
