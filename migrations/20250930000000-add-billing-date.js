"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("clients", "billing_date", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Day of month for billing (1-31)",
    });

    // Set existing clients to their registration date
    await queryInterface.sequelize.query(`
      UPDATE clients 
      SET billing_date = DAY(created_at)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("clients", "billing_date");
  },
};
