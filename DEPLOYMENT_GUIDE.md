# Motivational Quotes Application - Deployment Guide

This guide provides step-by-step instructions for deploying the Motivational Quotes Application, including the web application, server, and desktop client.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [AWS Deployment](#aws-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Desktop Application](#desktop-application)
6. [Admin Setup](#admin-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the application, ensure you have the following:

- Node.js (v14 or later)
- npm (v6 or later)
- MongoDB Atlas account or local MongoDB instance
- AWS account with appropriate permissions
- Docker and Docker Compose (for Docker deployment)
- Domain name (optional, for production deployment)

## Local Development Setup

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

4. Start the server:
   ```bash
   npm run dev
   ```

### Web Application Setup

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

4. Start the web application:
   ```bash
   npm start
   ```

## AWS Deployment

The application can be deployed to AWS using the provided deployment script.

### Prerequisites for AWS Deployment

- AWS CLI installed and configured with appropriate credentials
- S3 bucket for hosting the web application
- ECR repository for the server Docker image
- ECS cluster for running the server container

### Deployment Steps

1. Make the deployment script executable:
   ```bash
   chmod +x scripts/deploy-aws.sh
   ```

2. Run the deployment script:
   ```bash
   ./scripts/deploy-aws.sh
   ```

3. The script will:
   - Build the web application
   - Upload the build to S3
   - Create or update a CloudFront distribution
   - Build and push the server Docker image to ECR
   - Deploy the server to ECS

## Docker Deployment

The application can also be deployed using Docker Compose for local or server deployment.

1. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

2. The application will be available at:
   - Web: http://localhost:3000
   - Server: http://localhost:5001

## Desktop Application

### Building the Desktop Application

1. Make the build script executable:
   ```bash
   chmod +x scripts/build-desktop.sh
   ```

2. Run the build script:
   ```bash
   ./scripts/build-desktop.sh
   ```

3. The script will:
   - Build the desktop application for Windows, macOS, and Linux
   - Copy the installers to the web application's public folder

### Downloading the Desktop Application

Users can download the desktop application from the Downloads page of the web application.

## Admin Setup

### Creating an Admin User

1. Navigate to the project root directory.

2. Run the admin creation script:
   ```bash
   cd server
   node ../scripts/create-admin.js
   ```

3. Follow the prompts to enter the admin email, password, and name.

4. Alternatively, provide the details as command-line arguments:
   ```bash
   node ../scripts/create-admin.js admin@example.com password "Admin User"
   ```

### Accessing the Admin Interface

1. Open the web application in a browser.

2. Navigate to the login page and enter the admin credentials.

3. After logging in, admin users will have access to the admin dashboard.

## Troubleshooting

### Common Issues

#### MongoDB Connection Error

If you encounter a MongoDB connection error:

1. Check that your MongoDB URI is correct in the server's `.env` file.
2. Ensure that your IP address is whitelisted in MongoDB Atlas.
3. Verify that the MongoDB service is running if using a local instance.

#### AWS Deployment Issues

If you encounter issues with AWS deployment:

1. Check that your AWS CLI is properly configured with the correct credentials.
2. Ensure that you have the necessary permissions for S3, CloudFront, ECR, and ECS.
3. Verify that the subnet and security group IDs in the deployment script are correct.

#### Docker Deployment Issues

If you encounter issues with Docker deployment:

1. Ensure that Docker and Docker Compose are installed and running.
2. Check that the ports specified in the `docker-compose.yml` file are not already in use.
3. Verify that the environment variables in the Docker Compose file are correctly set.

### Getting Help

If you continue to experience issues, please:

1. Check the application logs for error messages.
2. Consult the documentation in the `docs` directory.
3. Contact the development team for assistance.