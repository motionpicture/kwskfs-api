"use strict";
/**
 * 組織ルーター
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const kwskfs = require("@motionpicture/kwskfs-domain");
const express_1 = require("express");
const organizationsRouter = express_1.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
organizationsRouter.use(authentication_1.default);
/**
 * 組織検索
 */
organizationsRouter.get('/:organizationType', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const organizations = yield organizationRepo.search({
            typeOf: req.params.organizationType,
            identifiers: (Array.isArray(req.query.identifiers)) ? req.query.identifiers : [],
            limit: parseInt(req.query.limit, 10)
        });
        res.json(organizations);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = organizationsRouter;
