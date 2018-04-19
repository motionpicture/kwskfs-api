/**
 * 注文返品取引ルーター
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED } from 'http-status';
import * as moment from 'moment';

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const debug = createDebug('kwskfs-api:returnOrderTransactionsRouter');
const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);

returnOrderTransactionsRouter.use(authentication);

returnOrderTransactionsRouter.post(
    '/start',
    permitScopes(['admin']),
    (req, _, next) => {
        req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required').isISO8601();
        req.checkBody('transactionId', 'invalid transactionId').notEmpty().withMessage('transactionId is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const transaction = await kwskfs.service.transaction.returnOrder.start({
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
        } catch (error) {
            next(error);
        }
    }
);

returnOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const transactionResult = await kwskfs.service.transaction.returnOrder.confirm(
                req.user.sub,
                req.params.transactionId
            )({
                action: actionRepo,
                transaction: transactionRepo,
                organization: organizationRepo
            });
            debug('transaction confirmed', transactionResult);

            res.status(CREATED).json(transactionResult);
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
