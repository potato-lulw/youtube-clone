import multer from "multer";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/temp");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now + "-" + Math.random(Math.random() * 1E9);
        cb(null, file.filename + "-" + uniqueSuffix);
    }
});

export const upload = multer({ storage: storage })