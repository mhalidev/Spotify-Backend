const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    revoked: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true }
);

const SessionModel = mongoose.model('sessions', sessionSchema);

module.exports = SessionModel;