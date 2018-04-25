"use strict";
/**
 * orders router
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
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ordersRouter = express_1.Router();
ordersRouter.use(authentication_1.default);
/**
 * make inquiry of an order
 */
// ordersRouter.post(
//     '/findByOrderInquiryKey',
//     permitScopes(['aws.cognito.signin.user.admin', 'orders', 'orders.read-only']),
//     (req, _, next) => {
//         req.checkBody('theaterCode', 'invalid theaterCode').notEmpty().withMessage('theaterCode is required');
//         req.checkBody('confirmationNumber', 'invalid confirmationNumber').notEmpty().withMessage('confirmationNumber is required');
//         req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');
//         next();
//     },
//     validator,
//     async (req, res, next) => {
//         try {
//             const phoneUtil = PhoneNumberUtil.getInstance();
//             const phoneNumber = phoneUtil.parse(req.body.telephone, 'JP');
//             const key = {
//                 theaterCode: req.body.theaterCode,
//                 confirmationNumber: req.body.confirmationNumber,
//                 telephone: phoneUtil.format(phoneNumber, PhoneNumberFormat.E164)
//             };
//             const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);
//             await repository.findByOrderInquiryKey(key).then((order) => {
//                 res.json(order);
//             });
//         } catch (error) {
//             next(error);
//         }
//     }
// );
/**
 * 注文検索
 */
ordersRouter.get('', permitScopes_1.default(['admin']), (__1, __2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
        const orders = yield orderRepo.search({
            sellerId: req.query.sellerId,
            customerId: req.query.customerId,
            orderNumber: req.query.orderNumber,
            orderStatus: req.query.orderStatus
        });
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ordersRouter;
