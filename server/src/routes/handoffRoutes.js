const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { listHandoffs, claimHandoff, replyToHandoff, resolveHandoff } = require('../controllers/handoffController');

const router = express.Router();
router.use(requireStaffAuth);
router.get('/', listHandoffs);
router.post('/:id/claim', claimHandoff);
router.post('/:id/reply', replyToHandoff);
router.post('/:id/resolve', resolveHandoff);

module.exports = router;
