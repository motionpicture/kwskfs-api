/**
 * action router
 * アクションルーター
 * @module actionsRouter
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { Router } from 'express';
import { CREATED } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const actionsRouter = Router();
actionsRouter.use(authentication);

/**
 * チケット印刷アクション追加
 */
actionsRouter.post(
    '/print/ticket',
    permitScopes(['aws.cognito.signin.user.admin', 'actions']),
    validator,
    async (req, res, next) => {
        try {
            const ticket = {
                ticketToken: req.body.ticketToken
            };

            const action = await new kwskfs.repository.action.Print(kwskfs.mongoose.connection).printTicket(
                req.user.sub,
                ticket
            );

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    });

/**
 * チケット印刷アクション検索
 */
actionsRouter.get(
    '/print/ticket',
    permitScopes(['aws.cognito.signin.user.admin', 'actions', 'actions.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const actions = await new kwskfs.repository.action.Print(kwskfs.mongoose.connection).searchPrintTicket({
                agentId: req.user.sub,
                ticketToken: req.query.ticketToken
            });

            res.json(actions);
        } catch (error) {
            next(error);
        }
    });

export default actionsRouter;
