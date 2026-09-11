const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { getOpsBrief } = require('../controllers/opsBriefController');

const router = express.Router();
router.get('/', requireStaffAuth, getOpsBrief);

module.exports = router;
