const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const router = express.Router();

router.post('/register', validationMiddleware.validateRegistration, authController.register);
router.post('/login', validationMiddleware.validateLogin, authController.login);
router.post('/logout', authMiddleware.authuserMiddleware, authController.logout);
router.post('/refresh', authController.refresh);

module.exports = router;