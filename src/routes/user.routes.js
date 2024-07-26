import { Router } from "express";
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrectPassword, 
    getCurrectUser, 
    updateUserAvatar, 
    updateUserCoverImage 
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 }, 
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrectPassword);
router.route("/get-current-user").post(verifyJWT, getCurrectUser);
router.route("/update-avatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/update-coverImage").post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
