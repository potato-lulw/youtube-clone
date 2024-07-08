import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    // gettin user data from frontend
    const {fullName, email, username, password} = await req.body;
    
    // validating user data - not empty
    if([fullName, email, username, password].some((field) => field.trim() === "")) throw new ApiError(400, "Fields cannot be empty")
    
    // check if user already exists
    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser) throw new ApiError(409, "User already exists");

    

    // check for images

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required")

    

    // upload them to cloudinary
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatarResponse) throw new ApiError(400, "Couldnt upload avatar")

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        email,
        username : username.toLowerCase(),
        password,
        avatar: avatarResponse.secure_url,
        coverImage: coverImageResponse?.secure_url || "",
        refreshToken: "" 
    })


    // remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // check for user creation
    if(!createdUser) throw new ApiError(500, "Something went wrong while creating a user");

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    res.status(200).json({ message: "ok" });
});

export { registerUser, loginUser }