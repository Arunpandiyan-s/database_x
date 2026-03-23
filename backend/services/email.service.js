const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

class EmailService {
    static async sendOTP(toEmail, otp) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('SMTP credentials missing. Logging OTP to console instead:', otp);
            return true;
        }

        try {
            const info = await transporter.sendMail({
                from: `"Institution ERP" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: 'Your ERP Verification Code',
                text: `Your ERP verification code is: ${otp}`,
                html: `<p>Your ERP verification code is: <b>${otp}</b></p><p>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.</p>`,
            });

            console.log('OTP Email sent: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new Error('Failed to send email verification');
        }
    }
    static async sendAdmissionCredentials(toEmail, name, tempPassword) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('SMTP credentials missing. Logging credentials to console instead:', tempPassword);
            return true;
        }

        try {
            const info = await transporter.sendMail({
                from: `"Institution ERP" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: 'Welcome to the Institute - Your Login Credentials',
                text: `Dear ${name},\n\nYour student profile has been created.\nLogin URL: http://localhost:8080/login\nEmail: ${toEmail}\nTemporary Password: ${tempPassword}\n\nPlease login and change your password immediately.`,
                html: `<p>Dear ${name},</p><p>Your student profile has been created.</p><p><b>Login URL:</b> <a href="http://localhost:8080/login">http://localhost:8080/login</a><br/><b>Email:</b> ${toEmail}<br/><b>Temporary Password:</b> ${tempPassword}</p><p>Please login and change your password immediately.</p>`,
            });

            console.log('Admission Credentials Email sent: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending credentials email:', error);
            throw new Error('Failed to send credentials email');
        }
    }

    static async sendPasswordReset(toEmail, resetLink) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('SMTP credentials missing. Logging reset link to console instead:', resetLink);
            return true;
        }

        try {
            const info = await transporter.sendMail({
                from: `"Institution ERP" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: 'Password Reset Request',
                text: `You requested a password reset. Click the following link to reset it:\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
                html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
            });

            console.log('Password Reset Email sent: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending reset email:', error);
            throw new Error('Failed to send reset email');
        }
    }
}

module.exports = EmailService;
