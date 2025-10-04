module.exports = {
  apps: [
    {
      name: "payment-reminder-api",
      script: "./dist/server.js",
      instances: "1", // Use all CPU cores
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_memory_restart: "500M",
      autorestart: true,
      watch: false,
      ignore_watch: ["node_modules", "logs", "*.log"],
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
