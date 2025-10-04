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
      contact_whatsapp: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "WhatsApp number for client contact (display only)",
      },
      logo_url: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM("trial", "active", "overdue", "suspended"),
        defaultValue: "trial",
      },
      role: {
        type: DataTypes.ENUM("client", "admin", "super_admin"),
        defaultValue: "client",
        allowNull: false,
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
      billing_date: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 31,
        },
      },
      last_active_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
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
    Client.hasMany(models.PricingAdjustment, {
      foreignKey: "client_id",
      as: "pricing_adjustments",
    });
    Client.hasMany(models.ErrorLog, {
      foreignKey: "client_id",
      as: "error_logs",
    });
  };

  return Client;
};
