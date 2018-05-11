"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * イベントルーター
 */
const kwskfs = require("@motionpicture/kwskfs-domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const redis = require("../../redis");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const eventsRouter = express_1.Router();
eventsRouter.use(authentication_1.default);
/**
 * イベントタイプでイベント検索
 */
eventsRouter.get('/:eventType', permitScopes_1.default(['admin', 'aws.cognito.signin.user.admin', 'events', 'events.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
        const events = yield eventRepo.search({
            typeOf: req.params.eventType,
            identifiers: (Array.isArray(req.query.identifiers)) ? req.query.identifiers : [],
            limit: parseInt(req.query.limit, 10)
        });
        res.json(events);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * イベントの販売情報取得
 */
eventsRouter.get('/:eventType/:eventIdentifier/offers', permitScopes_1.default(['admin', 'aws.cognito.signin.user.admin', 'events', 'events.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const offers = yield kwskfs.service.offer.searchEventOffers({
            eventType: req.params.eventType,
            eventIdentifier: req.params.eventIdentifier
        })({
            event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
            organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
            offerItemAvailability: new kwskfs.repository.itemAvailability.Offer(redis.getClient())
        });
        res.json(offers);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * イベント販売情報の在庫状況変更
 */
eventsRouter.put('/:eventType/:eventIdentifier/offers/:organizationId/menuItem/:menuItemIdentifier/:offerIdentifier/availability/:availability', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
        const itemAvailabilityRepo = new kwskfs.repository.itemAvailability.Offer(redis.getClient());
        // イベント終了日時まで値が保管されるように
        const event = yield eventRepo.findByIdentifier(req.params.eventType, req.params.eventIdentifier);
        const now = moment();
        const ttl = moment(event.endDate).add(1, 'day').diff(now, 'seconds');
        yield itemAvailabilityRepo.storeByMenuItemOfferIdentifier(req.params.organizationId, req.params.menuItemIdentifier, req.params.offerIdentifier, req.params.availability, ttl);
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = eventsRouter;
