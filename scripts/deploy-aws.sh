#!/bin/bash

# Script to deploy the Motivational Quotes Application to AWS

set -e

echo "Deploying Motivational Quotes Application to AWS..."

# Navigate to project root directory
cd "$(dirname "$0")/.."

# Build the web application
echo "Building web application..."
cd web
npm install
npm run build

# Create S3 bucket if it doesn't exist
BUCKET_NAME="motivational-quotes-app-hajirufai-$(date +%Y%m%d%H%M%S)"
echo "Checking if S3 bucket exists: $BUCKET_NAME"
aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null || {
  echo "Creating S3 bucket: $BUCKET_NAME"
  aws s3 mb s3://$BUCKET_NAME --region eu-west-1
  
  # Configure bucket for static website hosting
  echo "Configuring bucket for static website hosting"
  aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
  
  # Configure bucket ownership to allow public access
  echo "Configuring bucket ownership"
  aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
  
  # Set bucket policy to allow public read access
  echo "Setting bucket policy"
  aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicReadGetObject\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET_NAME/*\"}]}"
}

# Upload web build to S3
echo "Uploading web build to S3"
aws s3 sync build/ s3://$BUCKET_NAME

# Create CloudFront distribution if it doesn't exist
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.amazonaws.com'].Id" --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Creating CloudFront distribution"
  # This is a simplified version. In a real scenario, you would use a CloudFormation template
  # or a more complex command to create the distribution with all the necessary settings.
  DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --origin-domain-name $BUCKET_NAME.s3.amazonaws.com \
    --default-root-object index.html \
    --query "Distribution.Id" --output text)
  
  echo "CloudFront distribution created: $DISTRIBUTION_ID"
else
  echo "CloudFront distribution already exists: $DISTRIBUTION_ID"
  
  # Invalidate CloudFront cache
  echo "Invalidating CloudFront cache"
  aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
fi

# Build and deploy the server
cd ../server

# Build Docker image
echo "Building server Docker image"
docker build -t motivational-quotes-server .

# Tag the image for ECR
ECR_REPOSITORY="motivational-quotes-server"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION=$(aws configure get region)
ECR_REPOSITORY_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

# Check if ECR repository exists, create if it doesn't
aws ecr describe-repositories --repository-names $ECR_REPOSITORY 2>/dev/null || {
  echo "Creating ECR repository: $ECR_REPOSITORY"
  aws ecr create-repository --repository-name $ECR_REPOSITORY
}

# Login to ECR
echo "Logging in to ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push the image
echo "Tagging and pushing image to ECR"
docker tag motivational-quotes-server:latest $ECR_REPOSITORY_URI:latest
docker push $ECR_REPOSITORY_URI:latest

# Check if ECS cluster exists, create if it doesn't
CLUSTER_NAME="motivational-quotes-cluster"
aws ecs describe-clusters --clusters $CLUSTER_NAME --query "clusters[0].clusterName" --output text 2>/dev/null || {
  echo "Creating ECS cluster: $CLUSTER_NAME"
  aws ecs create-cluster --cluster-name $CLUSTER_NAME
}

# Update the ECS service or create if it doesn't exist
SERVICE_NAME="motivational-quotes-service"
TASK_DEFINITION_NAME="motivational-quotes-task"

# Check if task definition exists
TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition $TASK_DEFINITION_NAME 2>/dev/null || echo "")

if [ -z "$TASK_DEFINITION" ]; then
  echo "Creating new task definition: $TASK_DEFINITION_NAME"
  # This is a simplified version. In a real scenario, you would use a JSON file for the task definition.
  aws ecs register-task-definition \
    --family $TASK_DEFINITION_NAME \
    --container-definitions "[{\"name\":\"$ECR_REPOSITORY\",\"image\":\"$ECR_REPOSITORY_URI:latest\",\"essential\":true,\"portMappings\":[{\"containerPort\":5001,\"hostPort\":5001}],\"environment\":[{\"name\":\"NODE_ENV\",\"value\":\"production\"}]}]" \
    --requires-compatibilities FARGATE \
    --network-mode awsvpc \
    --cpu 256 \
    --memory 512
else
  echo "Updating task definition: $TASK_DEFINITION_NAME"
  aws ecs register-task-definition \
    --family $TASK_DEFINITION_NAME \
    --container-definitions "[{\"name\":\"$ECR_REPOSITORY\",\"image\":\"$ECR_REPOSITORY_URI:latest\",\"essential\":true,\"portMappings\":[{\"containerPort\":5001,\"hostPort\":5001}],\"environment\":[{\"name\":\"NODE_ENV\",\"value\":\"production\"}]}]" \
    --requires-compatibilities FARGATE \
    --network-mode awsvpc \
    --cpu 256 \
    --memory 512
fi

# Check if service exists
SERVICE=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query "services[0].serviceName" --output text 2>/dev/null || echo "")

if [ "$SERVICE" == "$SERVICE_NAME" ]; then
  echo "Updating ECS service: $SERVICE_NAME"
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_NAME \
    --force-new-deployment
else
  echo "Creating ECS service: $SERVICE_NAME"
  # This is a simplified version. In a real scenario, you would need to specify subnets, security groups, etc.
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_NAME \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-05e5dbd1b761f0b99,subnet-04d593a016d14be84,subnet-0a5eda9623de8f5a5],securityGroups=[sg-08cfc46c901b151a0],assignPublicIp=ENABLED}"
fi

echo "Deployment completed successfully!"
echo "Web application: https://$DISTRIBUTION_ID.cloudfront.net"
echo "API server: http://<ECS_SERVICE_URL>:5001"