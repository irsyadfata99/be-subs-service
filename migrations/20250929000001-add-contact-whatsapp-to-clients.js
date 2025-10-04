"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add contact_whatsapp column
    await queryInterface.addColumn("clients", "contact_whatsapp", {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: "WhatsApp number for client contact (display only, not for sending)",
    });

    console.log("✅ Added contact_whatsapp column to clients table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("clients", "contact_whatsapp");
    console.log("✅ Removed contact_whatsapp column from clients table");
  },
};
