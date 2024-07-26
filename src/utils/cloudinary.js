import { v2 as cloudinary } from "cloudinary";
import fs from "fs";




const uploadOnCloudinary = async (filePath) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    try {
        if (!filePath) throw new Error("File path is required");

        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        });

        console.log("File upload successful:", response);
        fs.unlinkSync(filePath)
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);

        // Remove the local file if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Local file deleted due to upload failure");
        }

        return null;
    }
};


const deleteFromCloudinary = async (public_id) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!public_id) {
        throw new Error("Public id is required");
    }

    try {
        if (!public_id) throw new Error("Public ID is required");

        const result = await cloudinary.uploader.destroy(public_id);

        if (result) {
            console.log("File deleted successfully from Cloudinary: ", result);
            return result;
        }
    } catch (error) {
        console.error("Couldn't delete from cloudinary: " + error.message);
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };
