"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, matchController_1.createMatch);
router.patch('/:id', auth_1.authenticate, matchController_1.updateMatch);
router.get('/', auth_1.optionalAuthenticate, matchController_1.getMatches);
// Live Match Routes
router.post('/live', auth_1.authenticate, matchController_1.startLiveMatchController);
router.delete('/live', auth_1.authenticate, matchController_1.stopLiveMatchController);
exports.default = router;
