const usermodel = require('../models/auth.model');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const bcrypt = require('bcryptjs');
const SessionModel = require('../models/session.model');
const crypto = require('crypto');

async function register(req, res) {
    try {
        const { username, email, password, role } = req.body;

        const isuseralreadycreated = await usermodel.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        });

        if (isuseralreadycreated) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const HashedPassword = await bcrypt.hash(password, 10); 

        const newUser = await usermodel.create({
            username,
            email,
            password: HashedPassword,
            role
        });

        const refresh_token = await jwt.sign({
            id: newUser._id,
            role: newUser._id,
        }, config.JWT_SECRET_REFRESH, {
            expiresIn: '7d',
        })

        const hashedRefreshToken = await crypto.createHash('sha256').update(refresh_token).digest('hex');

        const session = await SessionModel.create({
            userId: newUser._id,
            refreshToken: hashedRefreshToken,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        const access_token = await jwt.sign({
            id: newUser._id,
            role: newUser.role,
            sessionId: session._id,
        }, config.JWT_SECRET_ACCESS, {
            expiresIn: '15m',
        });


        res.cookie("reftoken", refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie("acctoken", access_token, {    
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
        });

        res.status(201).json({ message: 'User registered successfully', username, email, role });
    }
    catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
}

async function login(req, res) {
    try {
        const { username, email, password } = req.body;

        const verifyuser = await usermodel.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        });

        if (!verifyuser) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, verifyuser.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Password' });
        }

        const refresh_token = await jwt.sign({
            id: verifyuser._id,
            role: verifyuser._id,
        }, config.JWT_SECRET_REFRESH, {
            expiresIn: "7d",
        })
        const hashedRefreshToken = await crypto.createHash('sha256').update(refresh_token).digest('hex');

        const session = await SessionModel.create({
            userId: verifyuser._id,
            refreshToken: hashedRefreshToken,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        const access_token = await jwt.sign({
            id: verifyuser._id,
            role: verifyuser.role,
        }, config.JWT_SECRET_ACCESS, {
            expiresIn: "15m",
        });

        res.cookie("reftoken", refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie("acctoken", access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
        });

        res.status(200).json({ message: 'Login successful', username: verifyuser.username, email: verifyuser.email, role: verifyuser.role });
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
}

async function logout(req, res) {
    const refresh_token = req.cookies.reftoken;
    if (!refresh_token) {
        return res.status(400).json({ message: "no refresh token" });
    }
    const hashedRefreshToken = await crypto.createHash('sha256').update(refresh_token).digest('hex');
    const session = await SessionModel.findOne({
        refreshToken: hashedRefreshToken,
        revoked: false,
    });
    if (!session) {
        return res.status(400).json({ message: "invalid refresh token" });
    }
    session.revoked = true;
    await session.save();
    // res.clearCookie();
    res.status(200).json({ message: 'Logged out successfully' });
}

async function refresh(req, res) {
    const refresh_token = req.cookies.reftoken;

    if (!refresh_token) {
        return res.status(400).json({ message: "no refresh token" });
    }

    const decode = jwt.verify(refresh_token, config.JWT_SECRET_REFRESH);

    const hashedRefreshToken = await crypto.createHash('sha256').update(refresh_token).digest('hex');

    const session = await SessionModel.findOne({
        refreshToken: hashedRefreshToken,
        revoked: false,
    });
    if (!session) {
        return res.status(400).json({ message: "invalid refresh token" });
    }

    const access_token = jwt.sign({
        id: decode._id,
        role: decode.role,
        sessionId: session._id,
    }, config.JWT_SECRET_ACCESS, {
        expiresIn: '1m',
    });

    const new_refresh_token = await jwt.sign({
        id: decode._id,
        role: decode.role,
    }, config.JWT_SECRET_REFRESH, {
        expiresIn: '7d',
    });

    res.cookie("reftoken", new_refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("acctoken", access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
    });

    const hashedNewRefreshToken = await crypto.createHash('sha256').update(new_refresh_token).digest('hex');
    session.refreshToken = hashedNewRefreshToken;
    await session.save();

    res.status(201).json({
        access_token,
    });
}

async function allLogout(req, res) {
    const refresh_token = req.cookies.reftoken;
    if (!refresh_token) {
        return res.status(400).json({ message: "no refresh token" });
    }
    decode = jwt.verify(refresh_token, config.JWT_SECRET_REFRESH);
    await SessionModel.updateMany({
        userId: decode.id,
        revoked: false,
    },{
        revoked: true,
    });
    res.clearCookie("reftoken");
    res.clearCookie("acctoken");
    res.status(200).json({ message: 'All logged out successfully' });
}

module.exports = { register, login, logout, refresh, allLogout };