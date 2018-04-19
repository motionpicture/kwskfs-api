"use strict";
/**
 * orders router
 * @module ordersRouter
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
const google_libphonenumber_1 = require("google-libphonenumber");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ordersRouter = express_1.Router();
ordersRouter.use(authentication_1.default);
/**
 * make inquiry of an order
 */
ordersRouter.post('/findByOrderInquiryKey', permitScopes_1.default(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']), (req, _, next) => {
    req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
    req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
    req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const phoneUtil = google_libphonenumber_1.PhoneNumberUtil.getInstance();
        const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
        // kwskfs-domain@v22のデータとの互換性維持のため、いったんコメントアウト
        // tslint:disable-next-line:no-suspicious-comment
        // TODO v22のデータが全て上映終了すれば元に戻してよい
        // if (!phoneUtil.isValidNumber(phoneNumber)) {
        //     next(new Error('invalid phone number format'));
        //     return;
        // }
        const key = {
            theaterCode: req.body.theaterCode,
            confirmationNumber: req.body.confirmationNumber,
            telephone: phoneUtil.format(phoneNumber, google_libphonenumber_1.PhoneNumberFormat.E164)
        };
        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);
        yield repository.findByOrderInquiryKey(key).then((order) => {
            res.json(order);
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ordersRouter;
