module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("end_users", "payment_date", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("end_users", "payment_date");
  },
};
