FROM node:22-alpine

WORKDIR /app

# Package files কপি করা
COPY package*.json ./

# Prisma থাকলে Prisma Schema কপি করা
COPY prisma ./prisma/

# DevDependencies সহ সব Packages ইন্সটল করা
RUN npm install

# Prisma Client জেনারেট করা (যদি Prisma ব্যবহার করেন)
RUN npx prisma generate

# প্রজেক্ট ফাইল কপি করা
COPY . .

# Port Expose করা
EXPOSE 5000

# Docker-এ ডেভেলপমেন্ট মোডে রান করার কমান্ড
CMD ["npm", "run", "dev"]