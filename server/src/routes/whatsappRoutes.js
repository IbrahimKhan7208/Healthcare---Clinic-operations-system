const express = require('express');
const { receiveMessage } = require('../controllers/whatsappController');
const { verifyTwilioSignature } = require('../middleware/twilioSignature');

const router = express.Router();

router.post('/webhook', express.urlencoded({ extended: false }), verifyTwilioSignature, receiveMessage);

module.exports = router;