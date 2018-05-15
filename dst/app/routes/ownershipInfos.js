"use strict";
/**
 * 所有権ルーター
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
const http_status_1 = require("http-status");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ownershipInfosRouter = express_1.Router();
ownershipInfosRouter.use(authentication_1.default);
const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
/**
 * チケットトークンによるチェックイン
 */
ownershipInfosRouter.post('/:goodType/:ticketToken/actions/checkIn', permitScopes_1.default(['admin']), (_, __, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 所有権チェックアクション実行
        const action = yield kwskfs.service.authentication.checkInByTicketToken({
            agent: req.user,
            goodType: req.params.goodType,
            ticketToken: req.params.ticketToken
        })({
            action: actionRepo,
            ownershipInfo: ownershipInfoRepo
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 所有権に対するチェックインアクション検索
 */
ownershipInfosRouter.get('/:goodType/:ticketToken/actions/checkIn', permitScopes_1.default(['admin']), (_, __, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const actions = yield kwskfs.service.authentication.searchCheckInActions({
            goodType: req.params.goodType,
            ticketTokens: [req.params.ticketToken]
        })({
            action: actionRepo
        });
        res.json(actions);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ownershipInfosRouter;
