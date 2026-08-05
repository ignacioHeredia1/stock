#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "Installing Frontend Dependencies and Building..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete."
