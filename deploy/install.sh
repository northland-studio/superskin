#!/bin/bash
cd /var/www/superskin
npm install --legacy-peer-deps
npx prisma generate
npm run build
npx prisma migrate deploy
echo "Build completed"
