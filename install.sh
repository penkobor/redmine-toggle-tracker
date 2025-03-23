#!/bin/bash

# Script for automating the global installation of the project

echo "🚀 Starting project installation..."

echo "📦 Installing dependencies..."
npm install || { echo "❌ Error: Failed to install dependencies"; exit 1; }

echo "🔧 Generating API clients..."
npx @hey-api/openapi-ts -i https://raw.githubusercontent.com/d-yoshi/redmine-openapi/refs/heads/main/openapi.yml -o src/api-redmine -c @hey-api/client-fetch
npx @hey-api/openapi-ts -i ./toggl-api-v9.json -o src/api-toggl -c @hey-api/client-fetch

echo "🔨 Building the project..."
npm run build || { echo "❌ Error: Failed to build the project"; exit 1; }

echo "⚙️ Making the script executable..."
chmod +x dist/index.js || { echo "❌ Error: Failed to make the file executable"; exit 1; }

echo "🌐 Installing the project globally..."
npm install -g . || { echo "❌ Error: Failed to install the project globally"; exit 1; }

echo "🎉 Installation complete! The 'redmine' command is now available globally."