module.exports = (sequelize, DataTypes) => {
  const ErrorLog = sequelize.define(
    "ErrorLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      level: {
        type: DataTypes.ENUM("error", "warning", "info"),
        allowNull: false,
        defaultValue: "error",
      },
      service: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      stack_trace: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "error_logs",
      timestamps: false,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["level"] }, { fields: ["service"] }, { fields: ["client_id"] }, { fields: ["created_at"] }],
    }
  );

  ErrorLog.associate = (models) => {
    ErrorLog.belongsTo(models.Client, {
      foreignKey: "client_id",
      as: "client",
    });
  };

  return ErrorLog;
};
