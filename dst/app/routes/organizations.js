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
const fs = require("fs");
const organizationsRouter = express_1.Router();
const restaurants = JSON.parse(fs.readFileSync(`${__dirname}/../../../data/organizations/restaurant.json`, 'utf8'));
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
organizationsRouter.use(authentication_1.default);
organizationsRouter.get('/movieTheater/:branchCode', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        yield repository.findMovieTheaterByBranchCode(req.params.branchCode).then((movieTheater) => {
            res.json(movieTheater);
        });
    }
    catch (error) {
        next(error);
    }
}));
organizationsRouter.get('/movieTheater', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (__, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        yield repository.searchMovieTheaters({}).then((movieTheaters) => {
            res.json(movieTheaters);
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * レストラン検索
 */
organizationsRouter.get('/restaurant', permitScopes_1.default(['aws.cognito.signin.user.admin', 'organizations', 'organizations.read-only']), validator_1.default, (__, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        res.json(restaurants);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * レストランに対する注文検索
 */
organizationsRouter.get('/restaurant/:identifier/orders', permitScopes_1.default(['organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
        const orders = yield orderRepo.orderModel.find({
            'acceptedOffers.itemOffered.provider.typeOf': 'Restaurant',
            'acceptedOffers.itemOffered.provider.identifier': req.params.identifier
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = organizationsRouter;
