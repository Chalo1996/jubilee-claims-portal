const { Router } = require('express');
const controller = require('../controllers/claimsController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);
router.get('/', controller.listPolicies);

module.exports = router;
