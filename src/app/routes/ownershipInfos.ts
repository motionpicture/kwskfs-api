/**
 * 所有権ルーター
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import { CREATED } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const ownershipInfosRouter = Router();
ownershipInfosRouter.use(authentication);

const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);

/**
 * チケットトークンによるチェックイン
 */
ownershipInfosRouter.post(
    '/:goodType/:ticketToken/actions/checkIn',
    permitScopes(['admin']),
    (req, __, next) => {
        req.checkBody('ticketToken', 'invalid ticketToken').notEmpty().withMessage('ticketToken is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // 所有権チェックアクション実行
            const action = await checkByTicketToken({
                agent: req.user,
                goodType: req.params.goodType,
                ticketToken: req.params.ticketToken
            })({
                action: actionRepo,
                ownershipInfo: ownershipInfoRepo
            });
            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

function checkByTicketToken<T extends kwskfs.factory.ownershipInfo.IGoodType>(params: {
    agent: any;
    goodType: T;
    ticketToken: string;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: kwskfs.repository.Action;
        ownershipInfo: kwskfs.repository.OwnershipInfo;
    }) => {
        // 所有権検索
        const doc = await repos.ownershipInfo.ownershipInfoModel.findOne({
            'typeOfGood.typeOf': params.goodType,
            'typeOfGood.reservedTicket.ticketToken': {
                $exists: true,
                $eq: params.ticketToken
            }
        }).exec();

        if (doc === null) {
            throw new kwskfs.factory.errors.NotFound('OwnershipInfo');
        }
        const ownershipInfo: kwskfs.factory.ownershipInfo.IOwnershipInfo<T> = doc.toObject();

        // tslint:disable-next-line:no-suspicious-comment
        // TODO 所有期間チェック

        // アクション開始
        const actionAttributes = <any>{
            typeOf: 'CheckInAction',
            agent: params.agent,
            object: ownershipInfo.typeOfGood
        };
        const action = await repos.action.start(actionAttributes);

        try {
            // 何かする？
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, message: error.message } : /* istanbul ignore next */ error;
                await repos.action.giveUp(actionAttributes.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: any = {};

        return repos.action.complete(actionAttributes.typeOf, action.id, actionResult);
    };
}

/**
 * 所有権に対するチェックインアクション検索
 */
ownershipInfosRouter.get(
    '/:goodType/:ticketToken/actions/checkIn',
    permitScopes(['admin']),
    (_, __, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // アクション検索
            const actions = await actionRepo.actionModel.find({
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
        } catch (error) {
            next(error);
        }
    }
);

export default ownershipInfosRouter;
