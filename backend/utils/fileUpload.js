const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * File Upload Utility
 * Handles file uploads with validation and storage
 */

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/jpg'],
    documents: ['application/pdf', 'image/jpeg', 'image/png'],
    all: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

/**
 * Ensures upload directory exists
 */
async function ensureUploadDir(subDir = '') {
    const targetDir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
    try {
        await fs.mkdir(targetDir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
    return targetDir;
}

/**
 * Generates a unique filename
 * @param {String} originalName - Original filename
 * @returns {String} - Unique filename
 */
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomHash}${ext}`;
}

/**
 * Validates file type and size
 * @param {Object} file - Multer file object
 * @param {String} category - File category (images, documents, all)
 * @returns {Boolean} - True if valid
 */
function validateFile(file, category = 'all') {
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
    
    const allowedTypes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.all;
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return true;
}

/**
 * Saves a file to the upload directory
 * @param {Object} file - Multer file object
 * @param {String} subDir - Subdirectory (e.g., 'students', 'results')
 * @param {String} category - File category for validation
 * @returns {String} - Relative file path
 */
async function saveFile(file, subDir = '', category = 'all') {
    validateFile(file, category);
    
    const uploadDir = await ensureUploadDir(subDir);
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Move file from temp location
    await fs.writeFile(filePath, file.buffer);
    
    // Return relative path for DB storage
    const relativePath = path.join('uploads', subDir, uniqueFilename).replace(/\\/g, '/');
    return relativePath;
}

/**
 * Deletes a file from storage
 * @param {String} relativePath - Relative file path from DB
 */
async function deleteFile(relativePath) {
    if (!relativePath) return;
    
    const fullPath = path.join(__dirname, '..', relativePath);
    try {
        await fs.unlink(fullPath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error deleting file:', err);
        }
    }
}

/**
 * Gets the full URL for a file
 * @param {String} relativePath - Relative file path
 * @param {String} baseUrl - Base URL (from req)
 * @returns {String} - Full URL
 */
function getFileUrl(relativePath, baseUrl) {
    if (!relativePath) return null;
    return `${baseUrl}/${relativePath}`;
}

module.exports = {
    ensureUploadDir,
    generateUniqueFilename,
    validateFile,
    saveFile,
    deleteFile,
    getFileUrl,
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES
};
