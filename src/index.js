
import dotenv from "dotenv"
dotenv.config({ path: '.env' });
import express from "express";
const app = express();
import { connectDB } from "./db/db.js";



connectDB().then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is listening on port ${process.env.PORT}`);
    });
  
    app.on("error", (error) => {
      console.log("Error starting the server: ", error);
      throw error;
    });
  }).catch((err) => {
    console.error(`Failed to connect to MongoDB: ${err}`);
  });
/*
!First Approach
const connectDB = async () => {
    try {
       
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log("Listen on port " + process.env.PORT);
        })
    }catch(e) {
        console.error(`Error connecting to MongoDB: ${e}`);
        throw e
    }
}

connectDB();

*/


