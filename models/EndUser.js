module.exports = (sequelize, DataTypes) => {
  const EndUser = sequelize.define(
    "EndUser",
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      package_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      package_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      billing_cycle: {
        type: DataTypes.STRING(50),
        defaultValue: "monthly",
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "overdue", "inactive"),
        defaultValue: "active",
      },
      last_reminder_sent: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "end_users",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_client_status",
          fields: ["client_id", "status"],
        },
        {
          name: "idx_due_date",
          fields: ["due_date"],
        },
      ],
    }
  );

  EndUser.associate = (models) => {
    EndUser.belongsTo(models.Client, {
      foreignKey: "client_id",
      as: "client",
    });
    EndUser.hasMany(models.Reminder, {
      foreignKey: "end_user_id",
      as: "reminders",
    });
  };

  return EndUser;
};
