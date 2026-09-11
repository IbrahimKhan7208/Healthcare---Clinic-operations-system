const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { listPendingConfirmations, approveConfirmation, rejectConfirmation } = require('../controllers/confirmationController');

const router = express.Router();

router.get('/', requireStaffAuth, listPendingConfirmations);
router.post('/:id/approve', requireStaffAuth, approveConfirmation);
router.post('/:id/reject', requireStaffAuth, rejectConfirmation);

module.exports = router;
