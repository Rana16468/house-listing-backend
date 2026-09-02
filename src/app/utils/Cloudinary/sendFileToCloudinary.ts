import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import config from "../../config";


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


  
 
  