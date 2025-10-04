module.exports = (sequelize, DataTypes) => {
  const CronJobLog = sequelize.define(
    "CronJobLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      job_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("success", "warning", "failed"),
        allowNull: false,
      },
      duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      records_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      records_success: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      records_failed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "cron_job_logs",
      timestamps: false,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [{ fields: ["job_name"] }, { fields: ["status"] }, { fields: ["started_at"] }],
    }
  );

  return CronJobLog;
};
