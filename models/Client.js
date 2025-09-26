module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define(
    "Client",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      business_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      business_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      logo_url: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM("trial", "active", "suspended"),
        defaultValue: "trial",
      },
      trial_ends_at: {
        type: DataTypes.DATE,
      },
      total_users: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      monthly_bill: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
    },
    {
      tableName: "clients",
      timestamps: true,
      underscored: true,
    }
  );

  Client.associate = (models) => {
    Client.hasMany(models.EndUser, {
      foreignKey: "client_id",
      as: "end_users",
    });
    Client.hasMany(models.Reminder, {
      foreignKey: "client_id",
      as: "reminders",
    });
    Client.hasMany(models.PlatformInvoice, {
      foreignKey: "client_id",
      as: "invoices",
    });
  };

  return Client;
};
