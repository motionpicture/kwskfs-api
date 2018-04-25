"use strict";
/**
 * event router
 * イベントルーター
 * @module eventsRouter
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
// import * as moment from 'moment';
// import * as redis from '../../redis';
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const eventsRouter = express_1.Router();
eventsRouter.use(authentication_1.default);
eventsRouter.get('/:eventType', permitScopes_1.default(['aws.cognito.signin.user.admin', 'events', 'events.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
// eventsRouter.get(
//     '/individualScreeningEvent',
//     permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
//     (req, __, next) => {
//         req.checkQuery('startFrom').optional().isISO8601().withMessage('startFrom must be ISO8601 timestamp');
//         req.checkQuery('startThrough').optional().isISO8601().withMessage('startThrough must be ISO8601 timestamp');
//         req.checkQuery('endFrom').optional().isISO8601().withMessage('endFrom must be ISO8601 timestamp');
//         req.checkQuery('endThrough').optional().isISO8601().withMessage('endThrough must be ISO8601 timestamp');
//         next();
//     },
//     validator,
//     async (req, res, next) => {
//         try {
//             // dayとtheaterを削除する
//             const events = await kwskfs.service.offer.searchIndividualScreeningEvents(<any>{
//                 day: req.query.day,
//                 theater: req.query.theater,
//                 name: req.query.name,
//                 startFrom: (req.query.startFrom !== undefined) ? moment(req.query.startFrom).toDate() : undefined,
//                 startThrough: (req.query.startThrough !== undefined) ? moment(req.query.startThrough).toDate() : undefined,
//                 endFrom: (req.query.endFrom !== undefined) ? moment(req.query.endFrom).toDate() : undefined,
//                 endThrough: (req.query.endThrough !== undefined) ? moment(req.query.endThrough).toDate() : undefined,
//                 eventStatuses: (Array.isArray(req.query.eventStatuses)) ? req.query.eventStatuses : undefined,
//                 superEventLocationIdentifiers:
//                     (Array.isArray(req.query.superEventLocationIdentifiers)) ? req.query.superEventLocationIdentifiers : undefined,
//                 workPerformedIdentifiers:
//                     (Array.isArray(req.query.workPerformedIdentifiers)) ? req.query.workPerformedIdentifiers : undefined
//             })({
//                 event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
//                 itemAvailability: new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.getClient())
//             });
//             res.json(events);
//         } catch (error) {
//             next(error);
//         }
//     }
// );
exports.default = eventsRouter;
