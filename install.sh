#!/bin/bash

# Script for automating the global installation of the project

echo "🚀 Starting project installation..."

# 1. Installing dependencies
echo "📦 Installing dependencies..."
ink install || { echo "❌ Error: Failed to install dependencies"; exit 1; }

# 2. Building the project
echo "🔨 Building the project..."
ink build || { echo "❌ Error: Failed to build the project"; exit 1; }

# 3. Making the script executable
echo "⚙️ Making the script executable..."
chmod +x dist/index.js || { echo "❌ Error: Failed to make the file executable"; exit 1; }

# 4. Installing the project globally
echo "🌐 Installing the project globally..."
ink install -g . || { echo "❌ Error: Failed to install the project globally"; exit 1; }

echo "🎉 Installation complete! The 'redmine' command is now available globally."
