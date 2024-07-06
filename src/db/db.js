import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dotenv from "dotenv"
// dotenv.config();

export const connectDB = async () => {

    try {
        const connection =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB connected successfully to ${DB_NAME}, ${connection.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}