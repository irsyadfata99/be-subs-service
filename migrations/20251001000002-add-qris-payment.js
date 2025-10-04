"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add payment method selected
    await queryInterface.addColumn("platform_invoices", "payment_method_selected", {
      type: Sequelize.ENUM("BCA_VA", "QRIS"),
      allowNull: true,
      after: "payment_method",
    });

    // Add QR URL
    await queryInterface.addColumn("platform_invoices", "tripay_qr_url", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "tripay_payment_url",
    });

    // Add QR String (raw data)
    await queryInterface.addColumn("platform_invoices", "qr_string", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "tripay_qr_url",
    });

    console.log("✅ Added QRIS payment fields to platform_invoices table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("platform_invoices", "payment_method_selected");
    await queryInterface.removeColumn("platform_invoices", "tripay_qr_url");
    await queryInterface.removeColumn("platform_invoices", "qr_string");
    console.log("✅ Removed QRIS payment fields from platform_invoices table");
  },
};
