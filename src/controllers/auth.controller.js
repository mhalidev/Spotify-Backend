const usermodel = require('../models/auth.model');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const bcrypt = require('bcryptjs');

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

        const access_token = await jwt.sign({
            id: newUser._id,
            role: newUser.role,
        }, config.JWT_SECRET_ACCESS,{
            expiresIn: '1m',
        });

        const refresh_token = await jwt.sign({
            id: newUser._id,
            role: newUser._id,
        }, config.JWT_SECRET_REFRESH,{
            expiresIn: '7d',
        })

        res.cookie("reftoken", refresh_token);
        res.cookie("acctoken", access_token);

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

        const access_token = await jwt.sign({
            id: verifyuser._id,
            role: verifyuser.role,
        }, config.JWT_SECRET_ACCESS, {
            expiresIn: "1m",
        });

        const refresh_token = await jwt.sign({
            id: verifyuser._id,
            role: verifyuser._id,
        }, config.JWT_SECRET_REFRESH, {
            expiresIn: "7d",
        })

        res.cookie("reftoken", refresh_token);
        res.cookie("acctoken", access_token);

        res.status(200).json({ message: 'Login successful', username: verifyuser.username, email: verifyuser.email, role: verifyuser.role });
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
}

async function logout(req, res) {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
}

async function refresh(req, res){
    const refresh_token = req.cookies.reftoken;

    if(!refresh_token){
        return res.status(400).json({message: "no refresh token"});
    }

    const decode = jwt.verify(refresh_token, config.JWT_SECRET_REFRESH);

    const access_token = jwt.sign({
        id : decode._id
    }, config.JWT_SECRET_ACCESS,{
        expiresIn: '1m',
    });

    res.cookie("acctoken", access_token);

    res.status(201).json({
        access_token,
    });
}

module.exports = { register, login, logout, refresh };