const dotenv = require('dotenv');

dotenv.config();

const config = {
    DB_KEY: process.env.DB_KEY,
    JWT_SECRET_ACCESS: process.env.JWT_SECRET_ACCESS,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    JWT_SECRET_REFRESH: process.env.JWT_SECRET_REFRESH,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_USER: process.env.GOOGLE_USER
};

module.exports = config;