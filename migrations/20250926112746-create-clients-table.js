"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("clients", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      business_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      business_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
      },
      logo_url: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM("trial", "active", "suspended"),
        defaultValue: "trial",
      },
      trial_ends_at: {
        type: Sequelize.DATE,
      },
      total_users: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      monthly_bill: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("clients");
  },
};
