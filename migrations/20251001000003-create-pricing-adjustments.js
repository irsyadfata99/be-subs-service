"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("pricing_adjustments", {
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
      old_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      new_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      adjusted_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "super_admin client_id who made the adjustment",
      },
      adjusted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
    });

    await queryInterface.addIndex("pricing_adjustments", ["client_id"]);

    console.log("✅ Created pricing_adjustments table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("pricing_adjustments");
    console.log("✅ Dropped pricing_adjustments table");
  },
};
