#!/bin/sh
set -e

echo "Running database migrations..."
npm run prisma:migrate:deploy

echo "Starting server..."
exec npm start
