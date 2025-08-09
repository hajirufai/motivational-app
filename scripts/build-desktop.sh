#!/bin/bash

# Script to build desktop applications for all platforms

set -e

echo "Building desktop applications..."

# Navigate to desktop directory
cd "$(dirname "$0")/../desktop"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build for all platforms
echo "Building for Windows, macOS, and Linux..."
npm run build

# Create a directory for the installers in the web app's public folder
MKDIR_CMD="mkdir -p ../web/public/downloads"
echo "Creating downloads directory: $MKDIR_CMD"
eval $MKDIR_CMD

# Copy installers to the web app's public folder
CP_CMD="cp -r build/installers/* ../web/public/downloads/"
echo "Copying installers: $CP_CMD"
eval $CP_CMD

echo "Desktop applications built successfully!"
echo "Installers are available in web/public/downloads/"