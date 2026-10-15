FROM node:22-alpine

WORKDIR /app

# প্যাকেজ ফাইল কপি ও ইন্সটল
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Prisma জেনারেট করা
RUN npx prisma generate

# বাকি সব ফাইল কপি করা
COPY . .

# প্রজেক্ট বিল্ড করা (যদি টাইপস্ক্রিপ্ট প্রোডাকশনে বিল্ড করতে হয়)
RUN npm run build

# পোর্ট এক্সপোজ
EXPOSE 5000

# Start the compiled server directly so it receives container signals.
CMD ["node", "dist/server.js"]