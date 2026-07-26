const dotenv = require('dotenv');

dotenv.config();

const config = {
    DB_KEY: process.env.DB_KEY,
    JWT_SECRET_ACCESS: process.env.JWT_SECRET_ACCESS,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    JWT_SECRET_REFRESH: process.env.JWT_SECRET_REFRESH
};

module.exports = config;