module.exports = (sequelize, DataTypes) => {
  const PricingAdjustment = sequelize.define(
    "PricingAdjustment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "clients",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      old_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      new_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      adjusted_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      adjusted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "pricing_adjustments",
      timestamps: false,
    }
  );

  PricingAdjustment.associate = (models) => {
    PricingAdjustment.belongsTo(models.Client, {
      foreignKey: "client_id",
      as: "client",
    });
  };

  return PricingAdjustment;
};
