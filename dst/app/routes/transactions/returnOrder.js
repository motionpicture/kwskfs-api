"use strict";
/**
 * 注文返品取引ルーター
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
const createDebug = require("debug");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const returnOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const debug = createDebug('kwskfs-api:returnOrderTransactionsRouter');
const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
returnOrderTransactionsRouter.use(authentication_1.default);
returnOrderTransactionsRouter.post('/start', permitScopes_1.default(['admin']), (req, _, next) => {
    req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required').isISO8601();
    req.checkBody('transactionId', 'invalid transactionId').notEmpty().withMessage('transactionId is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transaction = yield kwskfs.service.transaction.returnOrder.start({
            expires: moment(req.body.expires).toDate(),
            agentId: req.user.sub,
            transactionId: req.body.transactionId,
            clientUser: req.user,
            cancellationFee: 0,
            forcibly: true,
            reason: kwskfs.factory.transaction.returnOrder.Reason.Seller
        })({
            action: actionRepo,
            transaction: transactionRepo,
            order: orderRepo
        });
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
        res.json(transaction);
    }
    catch (error) {
        next(error);
    }
}));
returnOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionResult = yield kwskfs.service.transaction.returnOrder.confirm(req.user.sub, req.params.transactionId)({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        });
        debug('transaction confirmed', transactionResult);
        res.status(http_status_1.CREATED).json(transactionResult);
    }
    catch (error) {
        next(error);
    }
}));
returnOrderTransactionsRouter.post('/:transactionId/cancel', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield transactionRepo.cancel(kwskfs.factory.transactionType.ReturnOrder, req.params.transactionId);
        debug('transaction canceled.');
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = returnOrderTransactionsRouter;
