const { Router } = require('express');
const controller = require('../controllers/claimsController');
const validate   = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  createClaimRules,
  listClaimsRules,
  updateStatusRules,
  claimIdParamRules,
} = require('../validators/claimValidators');

const router = Router();

router.use(requireAuth);

router.get('/',              listClaimsRules,   validate, controller.listClaims);
router.get('/:id',           claimIdParamRules, validate, controller.getClaimById);
router.post('/',             createClaimRules,  validate, controller.createClaim);
router.patch('/:id/status',  updateStatusRules, validate, controller.updateClaimStatus);

module.exports = router;
