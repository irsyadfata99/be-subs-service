module.exports = (sequelize, DataTypes) => {
  const PlatformInvoice = sequelize.define(
    "PlatformInvoice",
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
      invoice_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      period_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      period_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_users: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price_per_user: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 3000.0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "overdue", "expired", "cancelled"),
        defaultValue: "pending",
      },
      tripay_reference: {
        type: DataTypes.STRING(100),
      },
      tripay_merchant_ref: {
        type: DataTypes.STRING(100),
      },
      payment_method: {
        type: DataTypes.STRING(50),
      },
      payment_method_selected: {
        type: DataTypes.ENUM("BCA_VA", "QRIS"),
        allowNull: true,
      },
      tripay_payment_url: {
        type: DataTypes.TEXT,
      },
      tripay_qr_url: {
        type: DataTypes.TEXT,
      },
      qr_string: {
        type: DataTypes.TEXT,
      },
      tripay_va_number: {
        type: DataTypes.STRING(100),
      },
      total_fee: {
        type: DataTypes.DECIMAL(10, 2),
      },
      amount_received: {
        type: DataTypes.DECIMAL(10, 2),
      },
      paid_at: {
        type: DataTypes.DATE,
      },
      tripay_expired_time: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "platform_invoices",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "idx_client_status",
          fields: ["client_id", "status"],
        },
        {
          name: "idx_tripay_ref",
          fields: ["tripay_merchant_ref"],
        },
      ],
    }
  );

  PlatformInvoice.associate = (models) => {
    PlatformInvoice.belongsTo(models.Client, {
      foreignKey: "client_id",
      as: "client",
    });
  };

  return PlatformInvoice;
};
