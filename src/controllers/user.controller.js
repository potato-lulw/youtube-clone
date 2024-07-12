import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens.", error)
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //! gettin user data from frontend
    const { fullname, email, username, password } = await req.body;
    console.log(fullname, email, username, password);
    //! validating user data - not empty
    const fields = [fullname, email, username, password];

    if (fields.some((field) => field == null || field.trim() === "")) {
        throw new ApiError(400, "Fields cannot be empty");
    }

    //! check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) throw new ApiError(409, "User already exists");

    //! check for images

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    // console.log("avatarLocalPath: ", avatarLocalPath);
    // console.log("coverImageLocalPath: ", coverImageLocalPath);
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required")



    //! upload them to cloudinary
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatarResponse) throw new ApiError(400, "Couldnt upload avatar")

    //! create user object - create entry in db
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatarResponse.secure_url,
        coverImage: coverImageResponse?.secure_url || "",
        refreshToken: ""
    })


    //! remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    //! check for user creation
    if (!createdUser) throw new ApiError(500, "Something went wrong while creating a user");

    console.log("Req.files", req.files);
    console.log("Cloudinary: ", avatarResponse)

    //! return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {


    //! get user data from frontend
    const { email, username, password } = await req.body;

    //! validate user data
    if (!username && !email) throw new ApiError(400, "Username or Email is required");
    //! check if user exists in db

    const createdUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!createdUser) throw new ApiError(404, "Such user does not exist");

    //! password
    const isPasswordCorrect = await createdUser.isPasswordCorrect(password);

    if (!isPasswordCorrect) throw new ApiError(401, "Incorrect password");
    //! generate access and refresh tokens? 

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(createdUser._id);


    //! send cookie
    const updatedUser = await User.findById(createdUser._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: updatedUser, accessToken, refreshToken
            }
                , "User logged in successfully")
        )

});

const logoutUser = asyncHandler(async (req, res) => {
    //! get user
    User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined,
        },
    },
        {
            new: true,
        }
    )


    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out successfully."));

    //! clear cookies

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    console.log("refreshToken: " + req.cookies.refreshToken);
    const incomingRefreshToken = await req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log(decodedToken);
        const user = await User.findOne({ _id: decodedToken?._id });
        if (!user) throw new ApiError(401, "Invalid refresh token");

        if (user?.refreshToken !== incomingRefreshToken) throw new ApiError(401, "Refresh Token is expired or used");

        const options = {
            httpOnly: true,
            secure: true,
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
            new ApiResponse(200, {
                user: user, accessToken, refreshToken: newRefreshToken
            }, "Access token refreshed successfully")
        );
    } catch (error) {
        throw new ApiError(401, "Invalid Refresh Token  " + error);
    }
})

const changeCurrectPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confPassword } = await req.body;

    if (newPassword !== confPassword) {
        throw new ApiError(400, "New password and Confirm password should be same");
    }

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) throw new ApiError(401, "Incorrect current password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
})

const getCurrectUser = asyncHandler(async (req, res) => {
    const user = req.user;
    return res.status(200).json(new ApiResponse(200, user, "User details"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = await req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "Full name and Email are required");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            fullName,
            email: email.toLowerCase(),
        },
    }, {
        new: true,
    }).select("-password");
    return res.status(200).json(new ApiResponse(200, user, "User details updated successfully"));


});


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required")

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) throw new ApiError(400, "Couldnt update avatar")
    const user = await User.findByIdAndUpdate(req.user._id, {$set: {avatar: avatar.secure_url}}, {new: true}).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Updated avatar successfully" ));

});
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) throw new ApiError(400, "Cover Image file is required")

    const cover = await uploadOnCloudinary(coverImageLocalPath);
    if (!cover) throw new ApiError(400, "Couldnt update cover image")
    const user = await User.findByIdAndUpdate(req.user._id, {$set: {coverImage: cover.secure_url}}, {new: true}).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Updated cover image successfully" ));
});


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrectPassword, getCurrectUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}