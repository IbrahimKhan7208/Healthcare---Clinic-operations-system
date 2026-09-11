const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { listPipeline } = require('../controllers/pipelineController');

const router = express.Router();
router.get('/', requireStaffAuth, listPipeline);

module.exports = router;
