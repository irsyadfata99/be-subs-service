"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("end_users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "clients",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      package_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      package_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      billing_cycle: {
        type: Sequelize.STRING(50),
        defaultValue: "monthly",
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("active", "overdue", "inactive"),
        defaultValue: "active",
      },
      last_reminder_sent: {
        type: Sequelize.DATE,
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

    // Add indexes
    await queryInterface.addIndex("end_users", ["client_id", "status"], {
      name: "idx_client_status",
    });
    await queryInterface.addIndex("end_users", ["due_date"], {
      name: "idx_due_date",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("end_users");
  },
};
