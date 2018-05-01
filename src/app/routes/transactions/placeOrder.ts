/**
 * 注文取引ルーター
 */
import * as middlewares from '@motionpicture/express-middleware';
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';
import * as ioredis from 'ioredis';
import * as moment from 'moment';
// import * as request from 'request-promise-native';

import * as redis from '../../../redis';

const placeOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const debug = createDebug('kwskfs-api:placeOrderTransactionsRouter');

const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
});

// tslint:disable-next-line:no-magic-numbers
const AGGREGATION_UNIT_IN_SECONDS = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_AGGREGATION_UNIT_IN_SECONDS, 10);
// tslint:disable-next-line:no-magic-numbers
const THRESHOLD = parseInt(<string>process.env.TRANSACTION_RATE_LIMIT_THRESHOLD, 10);
/**
 * 進行中取引の接続回数制限ミドルウェア
 * 取引IDを使用して動的にスコープを作成する
 * @const
 */
const rateLimit4transactionInProgress =
    middlewares.rateLimit({
        redisClient: new ioredis({
            host: <string>process.env.RATE_LIMIT_REDIS_HOST,
            // tslint:disable-next-line:no-magic-numbers
            port: parseInt(<string>process.env.RATE_LIMIT_REDIS_PORT, 10),
            password: <string>process.env.RATE_LIMIT_REDIS_KEY,
            tls: <any>{ servername: <string>process.env.RATE_LIMIT_REDIS_HOST }
        }),
        aggregationUnitInSeconds: AGGREGATION_UNIT_IN_SECONDS,
        threshold: THRESHOLD,
        // 制限超過時の動作をカスタマイズ
        limitExceededHandler: (__0, __1, res, next) => {
            res.setHeader('Retry-After', AGGREGATION_UNIT_IN_SECONDS);
            const message = `Retry after ${AGGREGATION_UNIT_IN_SECONDS} seconds for your transaction.`;
            next(new kwskfs.factory.errors.RateLimitExceeded(message));
        },
        // スコープ生成ロジックをカスタマイズ
        scopeGenerator: (req) => `placeOrderTransaction.${req.params.transactionId}`
    });

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        // expires is unix timestamp (in seconds)
        req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required');
        req.checkBody('sellerId', 'invalid sellerId').notEmpty().withMessage('sellerId is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const passportToken = req.body.passportToken;

            // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
            if (passportToken === undefined) {
                debug('getting passport from WAITER...');
                // const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
                // const seller = await organizationRepo.findById(req.body.sellerId);

                // try {
                //     passportToken = await request.post(
                //         `${process.env.WAITER_ENDPOINT}/passports`,
                //         {
                //             body: {
                //                 scope: `placeOrderTransaction.${seller.identifier}`
                //             },
                //             json: true
                //         }
                //     ).then((body) => body.token);
                // } catch (error) {
                //     if (error.statusCode === NOT_FOUND) {
                //         throw new kwskfs.factory.errors.NotFound('sellerId', 'Seller does not exist.');
                //     } else if (error.statusCode === TOO_MANY_REQUESTS) {
                //         throw new kwskfs.factory.errors.RateLimitExceeded('PlaceOrder transactions rate limit exceeded.');
                //     } else {
                //         throw new kwskfs.factory.errors.ServiceUnavailable('Waiter service temporarily unavailable.');
                //     }
                // }
            }

            // パラメーターの形式をunix timestampからISO 8601フォーマットに変更したため、互換性を維持するように期限をセット
            const expires = (/^\d+$/.test(req.body.expires))
                // tslint:disable-next-line:no-magic-numbers
                ? moment.unix(parseInt(req.body.expires, 10)).toDate()
                : moment(req.body.expires).toDate();
            const transaction = await kwskfs.service.transaction.placeOrderInProgress.start({
                expires: expires,
                agentId: req.user.sub,
                sellerId: req.body.sellerId,
                accessToken: req.accessToken,
                clientUser: req.user,
                passportToken: passportToken
            })({
                organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
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

/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put(
    '/:transactionId/customerContact',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        req.checkBody('familyName').notEmpty().withMessage('required');
        req.checkBody('givenName').notEmpty().withMessage('required');
        req.checkBody('telephone').notEmpty().withMessage('required');
        req.checkBody('email').notEmpty().withMessage('required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const contact = await kwskfs.service.transaction.placeOrderInProgress.setCustomerContact(
                req.user.sub,
                req.params.transactionId,
                {
                    familyName: req.body.familyName,
                    givenName: req.body.givenName,
                    email: req.body.email,
                    telephone: req.body.telephone
                }
            )({
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
            });

            res.status(CREATED).json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * イベントの座席予約承認
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/offer/eventReservation/seat',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, _, next) => {
        req.checkBody('eventType').notEmpty().withMessage('required');
        req.checkBody('eventIdentifier').notEmpty().withMessage('required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // tslint:disable-next-line:max-line-length
            const seatReservationAuthorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.seat;
            const action = await seatReservationAuthorizeActionService.create({
                agentId: req.user.sub,
                transactionId: req.params.transactionId,
                eventType: req.body.eventType,
                eventIdentifier: req.body.eventIdentifier,
                offerIdentifier: '',
                seatSection: '',
                seatNumber: ''
            })({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
                event: new kwskfs.repository.Event(kwskfs.mongoose.connection)
            });

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * イベントの座席予約承認削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/offer/eventReservation/seat/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // tslint:disable-next-line:max-line-length
            const seatReservationAuthorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.seat;
            await seatReservationAuthorizeActionService.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/creditCard',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __2, next) => {
        req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
        req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
        req.checkBody('method', 'invalid method').notEmpty().withMessage('gmo_order_id is required');
        req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('gmo_amount is required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // 会員IDを強制的にログイン中の人物IDに変更
            const creditCard: kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.ICreditCard4authorizeAction = {
                ...req.body.creditCard,
                ...{
                    memberId: (req.user.username !== undefined) ? req.user.sub : undefined
                }
            };
            debug('authorizing credit card...', creditCard);

            debug('authorizing credit card...', req.body.creditCard);
            const action = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
                req.user.sub,
                req.params.transactionId,
                req.body.orderId,
                req.body.amount,
                req.body.method,
                creditCard
            )({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
                organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection)
            });

            res.status(CREATED).json({
                id: action.id
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/creditCard/:actionId',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
            });

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座確保
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/pecorino',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    (req, __, next) => {
        req.checkBody('price', 'invalid price').notEmpty().withMessage('price is required').isInt();
        req.checkBody('fromAccountId', 'invalid fromAccountId').notEmpty().withMessage('fromAccountId is required');

        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            // pecorino支払取引サービスクライアントを生成
            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const payTransactionService = new kwskfs.pecorinoapi.service.transaction.Pay({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });

            const action = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.pecorino.create({
                transactionId: req.params.transactionId,
                price: req.body.price,
                fromAccountId: req.body.fromAccountId,
                notes: req.body.notes
            })({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
                payTransactionService: payTransactionService
            });

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * レストランメニューアイテム承認アクション
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/offer/eventReservation/menuItem',
    permitScopes(['transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const authorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.menuItem;
            const action = await authorizeActionService.create({
                agentId: req.user.sub,
                transactionId: req.params.transactionId,
                eventType: req.body.eventType,
                eventIdentifier: req.body.eventIdentifier,
                menuItemIdentifier: req.body.menuItemIdentifier,
                offerIdentifier: req.body.offerIdentifier,
                acceptedQuantity: req.body.acceptedQuantity,
                organizationIdentifier: req.body.organizationIdentifier
            })({
                organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
                event: new kwskfs.repository.Event(kwskfs.mongoose.connection),
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
            });

            res.status(CREATED).json(action);
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    rateLimit4transactionInProgress,
    async (req, res, next) => {
        try {
            const order = await kwskfs.service.transaction.placeOrderInProgress.confirm(
                req.user.sub,
                req.params.transactionId
            )({
                action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
                organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
                confirmationNumber: new kwskfs.repository.ConfirmationNumber(redis.getClient())
            });
            debug('transaction confirmed', order);

            res.status(CREATED).json(order);
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/tasks/sendEmailNotification',
    permitScopes(['aws.cognito.signin.user.admin', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            const task = await kwskfs.service.transaction.placeOrder.sendEmail(
                req.params.transactionId,
                {
                    sender: {
                        name: req.body.sender.name,
                        email: req.body.sender.email
                    },
                    toRecipient: {
                        name: req.body.toRecipient.name,
                        email: req.body.toRecipient.email
                    },
                    about: req.body.about,
                    text: req.body.text
                }
            )({
                task: new kwskfs.repository.Task(kwskfs.mongoose.connection),
                transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
            });

            res.status(CREATED).json(task);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
