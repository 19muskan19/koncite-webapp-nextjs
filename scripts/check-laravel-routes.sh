#!/bin/bash
# Script to check Laravel routes
# Usage: Run this from your Laravel project directory

echo "🔍 Checking Laravel API Routes..."
echo ""

# Check if Laravel is running
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "✅ Laravel server is running on http://localhost:8000"
else
    echo "❌ Laravel server is NOT running!"
    echo "   Start it with: php artisan serve"
    exit 1
fi

echo ""
echo "📋 Listing all API routes:"
echo ""

# Try to get routes
php artisan route:list --path=api 2>/dev/null || echo "Could not list routes. Make sure you're in the Laravel project directory."
