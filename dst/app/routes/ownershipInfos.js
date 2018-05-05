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
ownershipInfosRouter.post('/:goodType/:ticketToken/actions/checkIn', permitScopes_1.default(['admin']), (req, __, next) => {
    req.checkBody('ticketToken', 'invalid ticketToken').notEmpty().withMessage('ticketToken is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 所有権チェックアクション実行
        const action = yield checkByTicketToken({
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
function checkByTicketToken(params) {
    // tslint:disable-next-line:max-func-body-length
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        // 所有権検索
        const doc = yield repos.ownershipInfo.ownershipInfoModel.findOne({
            'typeOfGood.typeOf': params.goodType,
            'typeOfGood.reservedTicket.ticketToken': {
                $exists: true,
                $eq: params.ticketToken
            }
        }).exec();
        if (doc === null) {
            throw new kwskfs.factory.errors.NotFound('OwnershipInfo');
        }
        const ownershipInfo = doc.toObject();
        // tslint:disable-next-line:no-suspicious-comment
        // TODO 所有期間チェック
        // アクション開始
        const actionAttributes = {
            typeOf: 'CheckInAction',
            agent: params.agent,
            object: ownershipInfo.typeOfGood
        };
        const action = yield repos.action.start(actionAttributes);
        try {
            // 何かする？
        }
        catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:no-single-line-block-comment
                const actionError = (error instanceof Error) ? Object.assign({}, error, { message: error.message }) : /* istanbul ignore next */ error;
                yield repos.action.giveUp(actionAttributes.typeOf, action.id, actionError);
            }
            catch (__) {
                // 失敗したら仕方ない
            }
            throw error;
        }
        // アクション完了
        const actionResult = {};
        return repos.action.complete(actionAttributes.typeOf, action.id, actionResult);
    });
}
/**
 * 所有権に対するチェックインアクション検索
 */
ownershipInfosRouter.get('/:goodType/:ticketToken/actions/checkIn', permitScopes_1.default(['admin']), (_, __, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // アクション検索
        const actions = yield actionRepo.actionModel.find({
            'object.typeOf': {
                $exists: true,
                $eq: req.params.goodType
            },
            'object.reservedTicket.ticketToken': {
                $exists: true,
                $eq: req.params.ticketToken
            }
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        res.json(actions);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ownershipInfosRouter;
