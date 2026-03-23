const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Ensures the target directory exists and returns a configured multer instance
 */
const createUploader = (folderName) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', folderName);

    // Create folder structure if it doesn't exist natively
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Append base file name for searchability but ensure uniqueness
            const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_\+]/g, '_');
            cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only image/jpeg, image/png, and application/pdf are allowed.'), false);
        }
    };

    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB Upload Limit
        }
    });
};

/**
 * Standardized success response middleware
 */
const formatUploadResponse = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded or file rejected by filter.' });
    }

    // Safely extract the target folder name from the destination string since req.file.destination holds the absolute path
    const folderName = path.basename(req.file.destination);

    // Construct the web-accessible URL
    const fileUrl = `/uploads/${folderName}/${req.file.filename}`;

    return res.status(200).json({
        success: true,
        fileUrl: fileUrl
    });
};

module.exports = {
    // Expose ready-to-use middleware for the specific folders requested
    uploadStudentPhoto: createUploader('student_photos'),
    uploadStudentDocument: createUploader('student_documents'),
    uploadResultFile: createUploader('results'),
    uploadODFile: createUploader('od_files'),
    uploadHierarchyFile: createUploader('hierarchy_files'),

    // Export raw components just in case something manual is required
    createUploader,
    formatUploadResponse
};
