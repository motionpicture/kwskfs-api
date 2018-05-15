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
    (_, __, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // 所有権チェックアクション実行
            const action = await kwskfs.service.authentication.checkInByTicketToken({
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
            const actions = await kwskfs.service.authentication.searchCheckInActions({
                goodType: req.params.goodType,
                ticketTokens: [req.params.ticketToken]
            })({
                action: actionRepo
            });
            res.json(actions);
        } catch (error) {
            next(error);
        }
    }
);

export default ownershipInfosRouter;
