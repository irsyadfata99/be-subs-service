"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("platform_invoices", {
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
      invoice_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      period_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      period_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_users: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price_per_user: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 3000.0,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "paid", "overdue", "expired", "cancelled"),
        defaultValue: "pending",
      },
      tripay_reference: {
        type: Sequelize.STRING(100),
      },
      tripay_merchant_ref: {
        type: Sequelize.STRING(100),
      },
      payment_method: {
        type: Sequelize.STRING(50),
      },
      tripay_payment_url: {
        // dulu: checkout_url
        type: Sequelize.TEXT,
      },
      tripay_va_number: {
        // dulu: pay_code
        type: Sequelize.STRING(100),
      },
      total_fee: {
        type: Sequelize.DECIMAL(10, 2),
      },
      amount_received: {
        type: Sequelize.DECIMAL(10, 2),
      },
      paid_at: {
        type: Sequelize.DATE,
      },
      tripay_expired_time: {
        // dulu: expired_at
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("platform_invoices", ["client_id", "status"], {
      name: "idx_client_status",
    });
    await queryInterface.addIndex("platform_invoices", ["tripay_merchant_ref"], {
      name: "idx_tripay_ref",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("platform_invoices");
  },
};
