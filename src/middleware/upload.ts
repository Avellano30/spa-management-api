import multer from "multer";
import path from "path";


const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowedExt.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)!"));
    }
};

export const upload = multer({
    dest: "uploads/",
    fileFilter,
    limits: {fileSize: 5 * 1024 * 1024}, // 5MB max
});
