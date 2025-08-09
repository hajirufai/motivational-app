# Deployment Guide

## Motivational Quotes Application

This document provides comprehensive instructions for deploying the Motivational Quotes Application to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Web Application Deployment](#web-application-deployment)
4. [Desktop Application Distribution](#desktop-application-distribution)
5. [Server Deployment](#server-deployment)
6. [Database Setup](#database-setup)
7. [Continuous Integration/Continuous Deployment](#continuous-integrationcontinuous-deployment)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Security Considerations](#security-considerations)

## Prerequisites

Before deploying, ensure you have the following:

- AWS account with appropriate permissions
- Docker and Docker Compose installed
- Node.js and npm installed
- MongoDB Atlas account or self-hosted MongoDB
- Firebase project set up
- Domain name (for web application)
- SSL certificates

## Environment Setup

### Production Environment Variables

Create secure environment variables for each component:

#### Server Environment Variables

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<your-jwt-secret>
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_PRIVATE_KEY=<your-firebase-private-key>
FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>
REDIS_URL=redis://<redis-host>:<redis-port>
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=<your-aws-region>
```

#### Web Application Environment Variables

```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_FIREBASE_API_KEY=<your-firebase-api-key>
REACT_APP_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
REACT_APP_FIREBASE_PROJECT_ID=<your-firebase-project-id>
REACT_APP_FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
REACT_APP_FIREBASE_APP_ID=<your-firebase-app-id>
```

## Web Application Deployment

### Option 1: AWS S3 and CloudFront

1. Build the web application:

```bash
cd web
npm run build
```

2. Create an S3 bucket:

```bash
aws s3 mb s3://your-app-bucket-name
```

3. Configure the bucket for static website hosting:

```bash
aws s3 website s3://your-app-bucket-name --index-document index.html --error-document index.html
```

4. Upload the build files:

```bash
aws s3 sync build/ s3://your-app-bucket-name --acl public-read
```

5. Create a CloudFront distribution pointing to the S3 bucket

6. Configure your domain with Route 53 and set up SSL with ACM

### Option 2: Docker Deployment

1. Create a Dockerfile in the web directory:

```dockerfile
FROM node:14-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Create an nginx.conf file:

```
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Build and push the Docker image:

```bash
docker build -t your-registry/motivational-app-web:latest .
docker push your-registry/motivational-app-web:latest
```

4. Deploy to your container orchestration platform (Kubernetes, ECS, etc.)

## Desktop Application Distribution

1. Build the desktop application for all platforms:

```bash
cd desktop
npm run build
```

2. This will create installers in the `desktop/build` directory for:
   - Windows (.exe, .msi)
   - macOS (.dmg)
   - Linux (.AppImage, .deb, .rpm)

3. Upload the installers to your distribution platform:

```bash
aws s3 sync build/installers/ s3://your-app-downloads-bucket --acl public-read
```

4. Create download links on your website pointing to:
   - `https://downloads.yourdomain.com/MotivationalApp-Setup-x.y.z.exe` (Windows)
   - `https://downloads.yourdomain.com/MotivationalApp-x.y.z.dmg` (macOS)
   - `https://downloads.yourdomain.com/MotivationalApp-x.y.z.AppImage` (Linux)

5. Consider implementing auto-updates using Electron's built-in update mechanism

## Server Deployment

### Option 1: Docker Deployment

1. Create a Dockerfile in the server directory:

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

2. Create a docker-compose.yml file for local testing:

```yaml
version: '3'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    env_file: .env
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

3. Build and push the Docker image:

```bash
docker build -t your-registry/motivational-app-server:latest .
docker push your-registry/motivational-app-server:latest
```

### Option 2: AWS Elastic Beanstalk

1. Install the EB CLI:

```bash
pip install awsebcli
```

2. Initialize EB in the server directory:

```bash
eb init
```

3. Create an environment:

```bash
eb create production
```

4. Deploy the application:

```bash
eb deploy
```

## Database Setup

### MongoDB Atlas

1. Create a MongoDB Atlas cluster
2. Configure network access to allow connections from your server
3. Create a database user with appropriate permissions
4. Get the connection string and add it to your server's environment variables

### Self-hosted MongoDB

1. Set up MongoDB with replica set for high availability
2. Configure authentication and network security
3. Create necessary users and databases
4. Set up regular backups

## Continuous Integration/Continuous Deployment

### GitHub Actions

Create a workflow file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v1
        with:
          node-version: '14.x'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v1
        with:
          node-version: '14.x'
      - name: Install dependencies
        run: cd web && npm ci
      - name: Build
        run: cd web && npm run build
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl public-read --delete
        env:
          AWS_S3_BUCKET: your-app-bucket-name
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: web/build

  deploy-server:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
      - name: Login to DockerHub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: ./server
          push: true
          tags: your-registry/motivational-app-server:latest
```

## Monitoring and Logging

### CloudWatch Setup

1. Configure the AWS SDK in your server application
2. Set up CloudWatch Logs for centralized logging
3. Create CloudWatch Alarms for critical metrics

### ELK Stack (Alternative)

1. Set up Elasticsearch, Logstash, and Kibana
2. Configure your application to send logs to Logstash
3. Create Kibana dashboards for log visualization

## Backup and Recovery

### Database Backups

1. Set up automated MongoDB backups:

```bash
# For MongoDB Atlas, backups are automatic
# For self-hosted MongoDB, set up a cron job
0 0 * * * mongodump --uri="mongodb://username:password@host:port/database" --out=/backup/$(date +\%Y-\%m-\%d)
```

2. Configure backup retention policies

3. Test restoration procedures regularly

## Security Considerations

### SSL/TLS

1. Obtain SSL certificates for your domains
2. Configure HTTPS for all services
3. Set up HTTP to HTTPS redirection

### Firewall Configuration

1. Configure AWS security groups to restrict access
2. Allow only necessary ports and IP ranges

### Regular Updates

1. Set up automated security updates for the server
2. Regularly update dependencies for all components

### Secrets Management

1. Use AWS Secrets Manager or similar service for storing secrets
2. Never commit secrets to the repository
3. Rotate credentials regularly

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check network connectivity
   - Verify security group settings
   - Ensure correct environment variables

2. **Authentication Problems**
   - Verify Firebase configuration
   - Check JWT token validation

3. **Performance Issues**
   - Monitor resource utilization
   - Check database query performance
   - Consider scaling resources

## Maintenance Procedures

### Scheduled Maintenance

1. Plan maintenance windows during low-traffic periods
2. Notify users in advance
3. Have rollback procedures ready

### Version Updates

1. Follow semantic versioning
2. Maintain a changelog
3. Test thoroughly before deploying updates