const express = require('express');
const multer = require('multer');
const { requireStaffAuth } = require('../middleware/auth');
const { uploadDocument, listDocuments, getDocument, reviewUploadedDocument } = require('../controllers/documentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = express.Router();

router.use(requireStaffAuth);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.post('/', upload.single('file'), uploadDocument);
router.patch('/:id/review', reviewUploadedDocument);

module.exports = router;
