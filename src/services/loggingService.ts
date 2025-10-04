import db from "../../models";
import logger from "../utils/logger";

const { ErrorLog, CronJobLog } = db;

export class LoggingService {
  // Log error to database
  static async logError(service: string, message: string, level: "error" | "warning" | "info" = "error", clientId?: number, stackTrace?: string, metadata?: any): Promise<void> {
    try {
      await ErrorLog.create({
        level,
        service,
        message,
        stack_trace: stackTrace,
        client_id: clientId,
        metadata,
      });
    } catch (error: any) {
      logger.error("Failed to log error to database", { error: error.message });
    }
  }

  // Start cron job log
  static async startCronJob(jobName: string): Promise<any> {
    try {
      const log = await CronJobLog.create({
        job_name: jobName,
        status: "success",
        started_at: new Date(),
      });
      return log;
    } catch (error: any) {
      logger.error("Failed to create cron job log", { error: error.message });
      return null;
    }
  }

  // Complete cron job log
  static async completeCronJob(
    logId: number,
    status: "success" | "warning" | "failed",
    stats: {
      records_processed?: number;
      records_success?: number;
      records_failed?: number;
      error_message?: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      const log = await CronJobLog.findByPk(logId);
      if (log) {
        const duration = Date.now() - new Date(log.started_at).getTime();
        await log.update({
          status,
          duration_ms: duration,
          completed_at: new Date(),
          ...stats,
        });
      }
    } catch (error: any) {
      logger.error("Failed to complete cron job log", { error: error.message });
    }
  }
}
