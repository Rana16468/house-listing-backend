import { v2 as cloudinary } from "cloudinary";

const deleteFileFromCloudinary = async (imageUrl: string) => {
  try {
    if (!imageUrl) return;

    // Example URL:
    // https://res.cloudinary.com/demo/image/upload/v1752345/user-files/photo-123.jpg

    const parts = imageUrl.split("/upload/");

    if (parts.length < 2) return;

    const publicPath = parts[1]
      .replace(/^v\d+\//, "") // remove version
      .replace(/\.[^/.]+$/, ""); // remove extension

    await cloudinary.uploader.destroy(publicPath, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};
export default deleteFileFromCloudinary