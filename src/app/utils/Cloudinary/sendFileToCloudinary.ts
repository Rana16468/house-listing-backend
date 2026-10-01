import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import config from "../../config";
import streamifier from 'streamifier'
import AppError from "../../errors/AppError";
import status from "http-status";
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});


export const sendFileToCloudinary = (
  fileName: string,
  filePath: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase();

    let resourceType: "image" | "video" | "raw" = "raw";

    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      resourceType = "image";
    } else if ([".mp4", ".mov", ".avi"].includes(ext)) {
      resourceType = "video";
    }

    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: resourceType,
        folder: "user-files",
        public_id: fileName,
      },
      (error, result) => {
      
        fs.unlink(filePath, () => {});

        if (error) return reject(error);
        resolve(result as UploadApiResponse);
      }
    );
  });
};

/**
 * Single File Stream Upload to Cloudinary
 */
const uploadSingleBufferToCloudinary = (
  fileBuffer: Buffer,
  folderName: string = 'room-photos'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
        // অপশনাল: পারফরম্যান্স ও লোডিং স্পিড বাড়াতে অটো ফর্মেটিং ও কম্প্রেশন
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed'));
        resolve(result);
      }
    );

    // Buffer stream এ কনভার্ট করে পাঠানোর ব্যবস্থা
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};


export const sendMultipleFilesToCloudinary = async (
  filePaths: string[],
  folderName: string = 'room-listings'
): Promise<string[]> => {
  try {
    if (!filePaths || filePaths.length === 0) return [];

    // সমান্তরালভাবে (Parallel) আপলোডের ব্যবস্থা
    const uploadPromises = filePaths.map((filePath) =>
      cloudinary.uploader.upload(filePath, {
        folder: folderName,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      })
    );

    const uploadResults = await Promise.all(uploadPromises);

    // আপলোড শেষে লোকাল ফাইল মুছে দেওয়া (Cleanup)
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    });

    return uploadResults.map((result) => result.secure_url);
  } catch (error) {
    // এরর হলেও টেম্পোরারি লোকাল ফাইলগুলো মুছে দেওয়া
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    });

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      'Failed to upload images to Cloudinary'
    );
  }
};

