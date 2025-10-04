"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cron_job_logs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      job_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: "Name of the cron job",
      },
      status: {
        type: Sequelize.ENUM("success", "warning", "failed"),
        allowNull: false,
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Execution duration in milliseconds",
      },
      records_processed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: "Number of records processed",
      },
      records_success: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      records_failed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional job execution details",
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("cron_job_logs", ["job_name"]);
    await queryInterface.addIndex("cron_job_logs", ["status"]);
    await queryInterface.addIndex("cron_job_logs", ["started_at"]);

    console.log("✅ Created cron_job_logs table");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("cron_job_logs");
    console.log("✅ Dropped cron_job_logs table");
  },
};
