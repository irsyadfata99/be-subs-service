"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE clients 
      MODIFY COLUMN status ENUM('trial', 'active', 'overdue', 'suspended') 
      DEFAULT 'trial'
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE clients 
      MODIFY COLUMN status ENUM('trial', 'active', 'suspended') 
      DEFAULT 'trial'
    `);
  },
};
