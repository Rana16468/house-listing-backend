
## Backend API Service (Node.js, Express & MongoDB)
 
- **Live API:** https://house-listing-backend-3i16.onrender.com
- **GitHub Repository:** https://github.com/Rana16468/house-listing-backend
> The backend runs on Render's free tier, so the first request may take a few seconds to wake up.
 
### Run the backend locally (optional)
 
```bash
git clone https://github.com/Rana16468/house-listing-backend
cd house-listing-backend
npm install
npm run dev
```
 
### Backend environment variables
 
Create a `.env` file in the backend root (use `.env.example` as a reference):
 
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=your_mongodb_connection_string
DIRECT_URL=your_mongodb_connection_string
BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET=your_jwt_access_secret
EXPIRES_IN=10d
JWT_REFRESH_SECRET=your_jwt_refresh_secret
REFRESH_EXPIRES_IN=30d
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODEMAILER_EMAIL=your_email@domain.com
NODEMAILER_PASSWORD=your_email_password
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://localhost:6379
HOUSE_LISTING=5
```
 
| Variable | Description |
| --- | --- |
| `PORT` | Port the server listens on |
| `NODE_ENV` | Environment mode (`development` or `production`) |
| `DATABASE_URL` / `DIRECT_URL` | MongoDB connection string |
| `BCRYPT_SALT_ROUNDS` | Salt rounds used for password hashing |
| `JWT_ACCESS_SECRET` / `EXPIRES_IN` | Access token secret and its lifetime |
| `JWT_REFRESH_SECRET` / `REFRESH_EXPIRES_IN` | Refresh token secret and its lifetime |
| `CLOUDINARY_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for image uploads |
| `NODEMAILER_EMAIL` / `NODEMAILER_PASSWORD` | Email account used to send emails |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_URL` | Redis connection settings |
| `HOUSE_LISTING` | House listing limit setting |
 
> **Note:** Never commit real secrets. Keep `.env` in `.gitignore` and only share `.env.example` with placeholder values.

# 🏠 Room Rental Platform – Backend

> A simple backend for a room/house rental platform where users can list rooms, save favorites, and report suspicious listings.

**Language / ভাষা:** [English](#-english) | [বাংলা](#-বাংলা)

---

## 🇬🇧 English

### 📌 Overview

This is the backend of a room rental platform. Property owners can post room listings, other users can browse and save rooms, and anyone can report fake or misleading listings. The project focuses on a clean database design, data safety, and fast queries.

### 🛠 Tech Stack

| Layer      | Technology |
| ---------- | ---------- |
| Database   | MongoDB    |
| ORM        | Prisma     |
| Language   | TypeScript / Node.js |

### ✨ Features

**👤 User Management**
- User profiles with name, phone, email, city, and photo
- Role-based access: `ADMIN` and `USER`
- Account status: `ACTIVE` or `BLOCKED`
- Verification flag (`isVerify`) and online status (`isOnline`)
- Device information tracking (OS, browser, device, IP address)

**🏘 Room Listings**
- Create and manage room listings with address, area, neighborhood, description, and multiple photos
- Property categories: `Family`, `Bachelor`, `Sublet`, `Hostel`, `Office`
- Each listing belongs to a user (owner)
- View count and report count stored on each listing

**👁 Room View Tracking**
- Records every room view with the visitor's IP address
- Helps calculate view counts and avoid duplicate counting

**❤️ Saved Rooms (Favorites)**
- Logged-in users can save rooms to view later
- A unique constraint (`userId + listRoomId`) prevents saving the same room twice

**🚩 Report System**
- Users can report a listing for:
  - `Wrong_Number`
  - `Misleading_Photos`
  - `Scam_OR_Spam`
- Reports are linked to the room and the reporter's IP address

### 🧱 Database Design Highlights

- **Soft delete** – `isDeleted` flag on every model, so data is never lost by accident
- **Cascade delete** – deleting a user or room automatically removes related views, reports, and saved items
- **Indexes** – added on frequently searched fields (user, category, area, createdAt, IP) for better performance
- **Timestamps** – `createdAt` and `updatedAt` on all main models
- **Enums** – used for roles, status, property types, and report types to keep data consistent

### 🗂 Data Models

| Model        | Purpose                                  |
| ------------ | ---------------------------------------- |
| `User`       | Stores user accounts, roles, and status  |
| `ListRoom`   | Stores room listings                     |
| `RoomView`   | Tracks views of each listing             |
| `SaveRoom`   | Stores users' saved/favorite rooms       |
| `reportRoom` | Stores reports against listings          |

### 🔗 Relationships

```
User ──< ListRoom ──< RoomView
  │          │
  │          ├──< reportRoom
  │          │
  └──< SaveRoom >──┘
```

- One **User** has many **ListRooms** and many **SaveRooms**
- One **ListRoom** has many **RoomViews**, **reportRooms**, and can be saved by many users

### 🚀 Getting Started

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file and add:
# DATABASE_URL="your-mongodb-connection-string"

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to the database
npx prisma db push
```

### 📬 Contact

Feel free to reach out for questions or feedback.

---

## 🇧🇩 বাংলা

### 📌 পরিচিতি

এটি একটি রুম ভাড়া প্ল্যাটফর্মের ব্যাকএন্ড প্রজেক্ট। এখানে বাড়িওয়ালা বা মালিকরা রুমের বিজ্ঞাপন দিতে পারেন, অন্য ইউজাররা রুম দেখতে ও সংরক্ষণ করতে পারেন, এবং ভুয়া বা বিভ্রান্তিকর বিজ্ঞাপনের বিরুদ্ধে রিপোর্ট করতে পারেন। প্রজেক্টে মূলত পরিষ্কার ডাটাবেস ডিজাইন, ডেটা নিরাপত্তা ও দ্রুত কোয়েরির দিকে গুরুত্ব দেওয়া হয়েছে।

### 🛠 ব্যবহৃত প্রযুক্তি

| স্তর       | প্রযুক্তি |
| ---------- | ---------- |
| ডাটাবেস    | MongoDB    |
| ORM        | Prisma     |
| ভাষা       | TypeScript / Node.js |

### ✨ ফিচারসমূহ

**👤 ইউজার ম্যানেজমেন্ট**
- নাম, ফোন, ইমেইল, শহর ও ছবিসহ ইউজার প্রোফাইল
- রোলভিত্তিক অ্যাক্সেস: `ADMIN` ও `USER`
- অ্যাকাউন্টের অবস্থা: `ACTIVE` অথবা `BLOCKED`
- ভেরিফিকেশন (`isVerify`) ও অনলাইন স্ট্যাটাস (`isOnline`)
- ডিভাইসের তথ্য ট্র্যাকিং (OS, ব্রাউজার, ডিভাইস, IP অ্যাড্রেস)

**🏘 রুম লিস্টিং**
- ঠিকানা, এলাকা, পাড়া/মহল্লা, বিবরণ ও একাধিক ছবিসহ রুমের বিজ্ঞাপন তৈরি ও পরিচালনা
- প্রপার্টির ধরন: `Family`, `Bachelor`, `Sublet`, `Hostel`, `Office`
- প্রতিটি লিস্টিং একজন ইউজারের (মালিকের) অধীনে থাকে
- প্রতিটি লিস্টিংয়ে ভিউ কাউন্ট ও রিপোর্ট কাউন্ট সংরক্ষিত থাকে

**👁 রুম ভিউ ট্র্যাকিং**
- ভিজিটরের IP অ্যাড্রেস দিয়ে প্রতিটি ভিউ রেকর্ড করা হয়
- ভিউ গণনা করতে ও একই ভিজিটরের বারবার গণনা এড়াতে সাহায্য করে

**❤️ সংরক্ষিত রুম (Favorites)**
- লগইন করা ইউজাররা পরে দেখার জন্য রুম সেভ করতে পারেন
- ইউনিক কনস্ট্রেইন্ট (`userId + listRoomId`) একই রুম দুইবার সেভ হওয়া আটকায়

**🚩 রিপোর্ট সিস্টেম**
- ইউজাররা যেসব কারণে রিপোর্ট করতে পারেন:
  - `Wrong_Number` (ভুল নম্বর)
  - `Misleading_Photos` (বিভ্রান্তিকর ছবি)
  - `Scam_OR_Spam` (প্রতারণা বা স্প্যাম)
- রিপোর্ট সংশ্লিষ্ট রুম ও রিপোর্টারের IP অ্যাড্রেসের সাথে যুক্ত থাকে

### 🧱 ডাটাবেস ডিজাইনের বৈশিষ্ট্য

- **সফট ডিলিট** – প্রতিটি মডেলে `isDeleted` ফ্ল্যাগ থাকায় ভুলবশত ডেটা হারায় না
- **ক্যাসকেড ডিলিট** – ইউজার বা রুম ডিলিট করলে সংশ্লিষ্ট ভিউ, রিপোর্ট ও সেভ করা ডেটা স্বয়ংক্রিয়ভাবে মুছে যায়
- **ইনডেক্স** – বেশি ব্যবহৃত ফিল্ডে (ইউজার, ক্যাটাগরি, এলাকা, createdAt, IP) ইনডেক্স দেওয়া হয়েছে, ফলে কোয়েরি দ্রুত হয়
- **টাইমস্ট্যাম্প** – মূল মডেলগুলোতে `createdAt` ও `updatedAt` আছে
- **Enum** – রোল, স্ট্যাটাস, প্রপার্টির ধরন ও রিপোর্টের ধরনে Enum ব্যবহার করে ডেটার সামঞ্জস্য বজায় রাখা হয়েছে

### 🗂 ডেটা মডেল

| মডেল         | উদ্দেশ্য                                  |
| ------------ | ----------------------------------------- |
| `User`       | ইউজার অ্যাকাউন্ট, রোল ও স্ট্যাটাস সংরক্ষণ   |
| `ListRoom`   | রুমের লিস্টিং সংরক্ষণ                      |
| `RoomView`   | প্রতিটি লিস্টিংয়ের ভিউ ট্র্যাক করা          |
| `SaveRoom`   | ইউজারের সেভ করা/পছন্দের রুম                |
| `reportRoom` | লিস্টিংয়ের বিরুদ্ধে করা রিপোর্ট            |

### 🔗 সম্পর্কসমূহ

- একজন **User**-এর অনেকগুলো **ListRoom** ও **SaveRoom** থাকতে পারে
- একটি **ListRoom**-এর অনেকগুলো **RoomView**, **reportRoom** থাকতে পারে এবং অনেক ইউজার সেটি সেভ করতে পারে

### 🚀 শুরু করার নিয়ম

```bash
# ১. রিপোজিটরি ক্লোন করুন
git clone <your-repo-url>
cd <project-folder>

# ২. ডিপেন্ডেন্সি ইনস্টল করুন
npm install

# ৩. এনভায়রনমেন্ট ভেরিয়েবল সেট করুন
# .env ফাইল তৈরি করে যোগ করুন:
# DATABASE_URL="your-mongodb-connection-string"

# ৪. Prisma ক্লায়েন্ট জেনারেট করুন
npx prisma generate

# ৫. স্কিমা ডাটাবেসে পুশ করুন
npx prisma db push
```

### 📬 যোগাযোগ

কোনো প্রশ্ন বা মতামত থাকলে নির্দ্বিধায় যোগাযোগ করুন।


### docker build command 
 
1. docker-compose down
2. docker-compose up --build -d
3. docker-compose logs -f backend


 ### radis 

1. doker start ts_express_redis 
2. docker stop ts_express_redis

### Signup IP address

New accounts store the request IP address provided by Express, and the IP is
included in the authenticated profile response. A server cannot determine a
visitor's city, country, or coordinates from an IP address using only Node.js or
standard networking APIs; that requires a local geolocation database or an
external lookup service. This project only records the IP address and performs
no geolocation lookups.
