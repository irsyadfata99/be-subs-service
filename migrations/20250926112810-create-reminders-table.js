"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reminders", {
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
      end_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "end_users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("before_3days", "before_1day", "overdue"),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("sent", "failed"),
        allowNull: false,
      },
      response: {
        type: Sequelize.JSON,
      },
      sent_at: {
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
    await queryInterface.addIndex("reminders", ["client_id", "created_at"], {
      name: "idx_client_date",
    });
    await queryInterface.addIndex("reminders", ["status"], {
      name: "idx_status",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("reminders");
  },
};
