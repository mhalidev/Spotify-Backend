const config = require('../config/config');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else{}
});

const sendEmail = async (to, subject, text) => {
    const mailOptions = {
        from: config.GOOGLE_REDIRECT_URI,
        to,
        subject,
        text
    };
    await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };