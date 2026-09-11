const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { chat, confirmTool, rejectToolProposal, getSession } = require('../controllers/agentController');

const router = express.Router();

router.post('/chat', requireStaffAuth, chat);
router.get('/session', requireStaffAuth, getSession);
router.post('/confirm', requireStaffAuth, confirmTool);
router.post('/reject', requireStaffAuth, rejectToolProposal);

module.exports = router;
