const admin = require('firebase-admin');

// In production, load the service account from an environment variable containing the JSON string
try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : require('./service-account.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized Successfully');
} catch (error) {
    console.warn('Firebase Admin Initialization Warning: Missing or invalid credentials. Ensure FIREBASE_SERVICE_ACCOUNT is set or service-account.json exists in root.');
}

module.exports = admin;
