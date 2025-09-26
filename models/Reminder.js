module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define(
    "Reminder",
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
      end_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "end_users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("before_3days", "before_1day", "overdue"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("sent", "failed"),
        allowNull: false,
      },
      response: {
        type: DataTypes.JSON,
      },
      sent_at: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "reminders",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_client_date",
          fields: ["client_id", "created_at"],
        },
        {
          name: "idx_status",
          fields: ["status"],
        },
      ],
    }
  );

  Reminder.associate = (models) => {
    Reminder.belongsTo(models.Client, {
      foreignKey: "client_id",
      as: "client",
    });
    Reminder.belongsTo(models.EndUser, {
      foreignKey: "end_user_id",
      as: "end_user",
    });
  };

  return Reminder;
};
