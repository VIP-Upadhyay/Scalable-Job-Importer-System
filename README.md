# 🚀 Scalable Job Importer System

A comprehensive job import system that fetches job data from external APIs, processes them through Redis queues, stores them in MongoDB, and provides a modern web interface for monitoring and management.

###  Online Links

```bash

- **Frontend**: https://scalable-job-importer-system.vercel.app
- **Backend API**: https://scalable-job-importer-system-api.onrender.com
- **Health Check**: https://scalable-job-importer-system-api.onrender.com/health
```

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🚀 Quick Start](#-quick-start)
- [🐳 Docker Setup](#-docker-setup)
- [⚙️ Configuration](#️-configuration)
- [📊 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📈 Monitoring](#-monitoring)
- [🤝 Contributing](#-contributing)

## 🌟 Features

### Core Functionality
- **Multi-source Job Fetching** - Imports jobs from multiple RSS/XML APIs
- **Queue-based Processing** - Uses Redis + BullMQ for scalable background processing
- **Real-time Monitoring** - Live dashboard showing import status and statistics
- **Duplicate Prevention** - Smart upsert logic to avoid duplicate entries
- **Error Handling** - Comprehensive error tracking and retry mechanisms
- **Historical Tracking** - Detailed logs of all import operations

### Technical Features
- **Microservice Ready** - Clean architecture that can evolve to microservices
- **Docker Support** - Complete containerization for development and production
- **Health Monitoring** - Built-in health checks and system monitoring
- **Responsive UI** - Modern Next.js dashboard with real-time updates
- **Production Ready** - Comprehensive logging, error handling, and deployment configs

## 🏗️ Architecture Overview

```mermaid
graph TB
    A[External APIs<br/>RSS/XML Feeds] --> B[API Fetcher Service]
    B --> C[Redis Queue<br/>BullMQ]
    C --> D[Worker Process]
    D --> E[MongoDB<br/>Jobs & Logs]
    
    F[Next.js Frontend] --> G[Express API Server]
    G --> E
    G --> C
    
    H[Cron Scheduler] --> B
    I[Admin Dashboard] --> F
    
    style A fill:#e1f5fe
    style E fill:#f3e5f5
    style C fill:#fff3e0
    style F fill:#e8f5e8
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Docker & Docker Compose**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/VIP-Upadhyay/Scalable-Job-Importer-System.git
cd Scalable-Job-Importer-System
```

### 2. Environment Setup

```bash
# Backend environment
cp server/.env.example server/.env
# Edit server/.env with your configurations

# Frontend environment  
cp client/.env.example client/.env.local
# Edit client/.env.local with your API URL
```

### 3. Quick Start with Docker

```bash
# Start all services
docker-compose up --build

- **Frontend**: http://localhost:3000/
- **Backend API**: http://localhost:5000/api/v1
- **Health Check**: http://localhost:5000/health
```

### 4. Manual Setup (Without Docker)

#### Backend Setup
```bash
cd server
npm install

# Start MongoDB and Redis
# Using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest

# Start the server
npm run dev
```

#### Frontend Setup
```bash
cd client
npm install
npm run dev
```

## 🐳 Docker Setup

### Development Environment

```bash
# Start all services
docker-compose up --build

# Start specific services
docker-compose up mongodb redis backend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Clean reset (removes all data)
docker-compose down -v
```

<!-- ### Production Environment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d
``` -->

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js React application |
| Backend | 5000 | Express.js API server |
| MongoDB | 27017 | Database for jobs and logs |
| Redis | 6379 | Queue and caching |

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/job-importer?authSource=admin
REDIS_URL=redis://:password@localhost:6379

# API Configuration
CORS_ORIGIN=http://localhost:3000

# Queue Configuration
JOB_CONCURRENCY=5
CRON_SCHEDULE=0 */1 * * *
CRON_ENABLED=true

# Logging
LOG_LEVEL=info
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NODE_ENV=development
```

### Job Sources Configuration

The system fetches from these APIs by default:

```javascript
const jobSources = [
  'https://jobicy.com/?feed=job_feed',
  'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
  'https://jobicy.com/?feed=job_feed&job_categories=data-science',
  'https://www.higheredjobs.com/rss/articleFeed.cfm'
];
```

## 📊 API Documentation

### Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://scalable-job-importer-system-api.onrender.com/api/v1`

### Core Endpoints

#### Jobs API
```bash
# Get all jobs with pagination
GET /api/v1/jobs?page=1&limit=20&category=smm

# Get job statistics
GET /api/v1/jobs/stats

# Search jobs
GET /api/v1/jobs/search?q=developer

# Get filter options
GET /api/v1/jobs/filter-options
```

#### Import Management
```bash
# Get import history
GET /api/v1/imports/history?page=1&limit=10

# Trigger manual import
POST /api/v1/imports/trigger
{
  "urls": ["https://jobicy.com/?feed=job_feed"]
}

# Get import statistics
GET /api/v1/imports/stats
```

#### Queue Management
```bash
# Get queue statistics
GET /api/v1/queue/stats

# Clear queue
POST /api/v1/queue/clear

# Get job details
GET /api/v1/queue/jobs/{jobId}
```

#### Health & Monitoring
```bash
# Basic health check
GET /health

# Detailed health check
GET /health/detailed

# System metrics
GET /api/v1/system/metrics
```

### Request/Response Examples

#### Trigger Import
```bash
curl -X POST https://scalable-job-importer-system-api.onrender.com/api/v1/imports/trigger \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time"]}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Queued 1 import jobs",
    "jobIds": ["51"],
    "importLogIds": ["674a1b2c3d4e5f6789012345"],
    "urls": ["https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time"]
  }
}
```

#### Get Job Statistics
```bash
curl https://scalable-job-importer-system-api.onrender.com/api/v1/jobs/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalJobs": 1250,
    "recentJobs": 45,
    "sourceStats": [
      {
        "_id": "jobicy.com",
        "count": 850,
        "categories": ["smm", "data-science", "business"],
        "jobTypes": ["full-time", "part-time"]
      }
    ]
  }
}
```

#### Test Import Process
```bash
# 1. Trigger import
curl -X POST https://scalable-job-importer-system-api.onrender.com/api/v1/imports/trigger \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://jobicy.com/?feed=job_feed"]}'

# 2. Check import status
curl https://scalable-job-importer-system-api.onrender.com/api/v1/imports/history

# 3. Verify jobs were created
curl https://scalable-job-importer-system-api.onrender.com/api/v1/jobs/stats
```

#### Test Queue System
```bash
# Check queue stats
curl https://scalable-job-importer-system-api.onrender.com/api/v1/queue/stats

# Clear queue if needed
curl -X POST https://scalable-job-importer-system-api.onrender.com/api/v1/queue/clear
```

## 🚀 Deployment

### Production Deployment Options

#### Option 1: Render + Vercel (Recommended)

**Backend (Render):**
1. Connect GitHub repository to Render
2. Create Web Service with:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment variables from production config

**Frontend (Vercel):**
```bash
# Deploy to Vercel
cd client
npx vercel --prod
```

<!-- #### Option 2: Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to your server
docker-compose -f docker-compose.prod.yml up -d
``` -->

### Database Setup

#### MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create cluster and database
3. Get connection string
4. Update `MONGODB_URI` environment variable

#### Redis Cloud
1. Create account at [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create database
3. Get connection details
4. Update `REDIS_URL` environment variable

### Environment Variables for Production

```bash
# Backend (.env.production)
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/job-importer
REDIS_URL=redis://user:pass@hostname:port
```bash
CORS_ORIGIN=https://scalable-job-importer-system.vercel.app
LOG_LEVEL=warn
JOB_CONCURRENCY=5

# Frontend
```bash
NEXT_PUBLIC_API_URL=https://scalable-job-importer-system-api.onrender.com/api/v1
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] Health checks responding
- [ ] CORS origins updated
- [ ] Error monitoring setup
- [ ] Backup strategy implemented
- [ ] SSL certificates configured
- [ ] Performance monitoring enabled

## 📈 Monitoring

### Health Checks

```bash
# System health
curl http://localhost:5000/health

# Detailed diagnostics
curl http://localhost:5000/health/detailed
```

### Logs

```bash
# View application logs
docker-compose logs -f backend

# View specific log files
tail -f server/logs/combined.log
tail -f server/logs/error.log
```

### Metrics

The system tracks:
- Import success/failure rates
- Processing times
- Queue depth and processing speed
- API response times
- Database performance
- Memory and CPU usage

### Performance Optimization

<!-- #### Database Optimization
```javascript
// Indexes are automatically created for:
db.jobs.createIndex({ "externalId": 1, "source": 1 }, { unique: true })
db.jobs.createIndex({ "category": 1 })
db.jobs.createIndex({ "jobType": 1 })
db.jobs.createIndex({ "createdAt": -1 })
``` -->

#### Queue Optimization
- Configure concurrency based on system resources
- Use job priorities for critical imports
- Implement circuit breaker for external APIs

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check connection string
echo $MONGODB_URI

# Test connection manually
docker exec -it job-importer-mongodb mongosh
```

#### Redis Connection Failed
```bash
# Check Redis status
docker ps | grep redis

# Test Redis connection
docker exec -it job-importer-redis redis-cli ping
```

#### Import Jobs Failing
```bash
# Check import logs
curl http://localhost:5000/api/v1/imports/history

# Check queue status
curl http://localhost:5000/api/v1/queue/stats

# View detailed logs
docker-compose logs -f backend
```

#### Frontend Not Loading
```bash
# Check if API is accessible
curl http://localhost:5000/health

# Verify environment variables
cat client/.env.local

# Check Next.js logs
docker-compose logs -f frontend
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start with debug output
npm run dev
```

### Performance Issues

```bash
# Check system resources
docker stats

# Monitor queue processing
curl http://localhost:5000/api/v1/queue/stats

# Check database performance
curl http://localhost:5000/health/detailed
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Set up development environment:
   ```bash
   docker-compose up --build
   ```
4. Make your changes
5. Add tests for new functionality
6. Run tests: `npm test`
7. Commit changes: `git commit -m 'Add amazing feature'`
8. Push to branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Code Style

- Use ESLint configuration
- Follow conventional commits
- Add JSDoc comments for functions
- Write tests for new features
- Update documentation

### Pull Request Process

1. Ensure tests pass
2. Update documentation
3. Add screenshots for UI changes
4. Describe changes in PR description
5. Wait for review and approval

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/VIP-Upadhyay/Scalable-Job-Importer-System/issues)
- **Discussions**: [GitHub Discussions](https://github.com/VIP-Upadhyay/Scalable-Job-Importer-System/discussions)
- **Documentation**: [Architecture Guide](docs/architecture.md)

### Useful Commands

```bash
# Quick health check
curl http://localhost:5000/health | jq

# View recent logs
docker-compose logs --tail=50 backend

# Restart specific service
docker-compose restart backend

# Clean everything and start fresh
docker-compose down -v && docker-compose up --build
```

---

<div align="center">

**Built with ❤️ using Node.js, Next.js, MongoDB, and Redis**

[⬆ Back to top](#-scalable-job-importer-system)

</div>