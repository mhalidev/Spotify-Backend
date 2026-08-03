const jwt = require("jsonwebtoken");
const config = require("../config/config");

const authartistMiddleware = (req, res, next) => {
    const token = req.cookies.acctoken;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET_ACCESS);
        if (decode.role !== "artist") {
            return res.status(403).json({ message: 'you are not an artist' });
        }
        req.user = decode;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

const authuserMiddleware = (req, res, next) => {
    const token = req.cookies.acctoken;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decode = jwt.verify(token, config.JWT_SECRET_ACCESS);
        req.user = decode;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
};

module.exports = { authartistMiddleware, authuserMiddleware };