# 🚀 Production Deployment Checklist

## Pre-Deployment

### Environment Setup

- [ ] `.env` file created with all production values
- [ ] `NODE_ENV=production` set
- [ ] Database credentials verified and tested
- [ ] WhatsApp API credentials obtained and tested
- [ ] Tripay production API keys configured
- [ ] Frontend URL configured correctly
- [ ] Admin WhatsApp numbers configured
- [ ] JWT_SECRET is strong (32+ characters, random)

### Security

- [ ] All API keys are production keys (not sandbox)
- [ ] Database password is strong
- [ ] Rate limiting tested
- [ ] CORS origins configured correctly
- [ ] Helmet middleware enabled
- [ ] Stack traces disabled in production
- [ ] Sensitive data masking working

### Database

- [ ] Production database created
- [ ] Database backup created
- [ ] Migrations tested in staging
- [ ] Database indexes verified
- [ ] Connection pool configured
- [ ] Database user permissions set correctly

### Testing

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] WhatsApp message sending tested
- [ ] Payment flow tested end-to-end
- [ ] Cron jobs tested manually
- [ ] Error notifications tested

### Infrastructure

- [ ] Server has sufficient resources (2GB+ RAM, 2+ CPU cores)
- [ ] Node.js v18+ installed
- [ ] PM2 installed globally
- [ ] MySQL/MariaDB running
- [ ] SSL certificate configured (for HTTPS)
- [ ] Domain name configured
- [ ] Firewall rules configured (allow port 5000)

### Monitoring

- [ ] Health endpoint accessible
- [ ] Logs directory created (`mkdir -p logs`)
- [ ] Log rotation working
- [ ] Sentry configured (optional)
- [ ] Admin notifications tested

## Deployment Steps

1. **Backup Current State**

```bash
   ./scripts/backup-database.sh
```
