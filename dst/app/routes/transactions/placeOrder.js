"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーター
 */
const middlewares = require("@motionpicture/express-middleware");
const kwskfs = require("@motionpicture/kwskfs-domain");
const createDebug = require("debug");
const express_1 = require("express");
const http_status_1 = require("http-status");
const ioredis = require("ioredis");
const moment = require("moment");
// import * as request from 'request-promise-native';
const redis = require("../../../redis");
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const debug = createDebug('kwskfs-api:placeOrderTransactionsRouter');
// tslint:disable-next-line:no-magic-numbers
const AGGREGATION_UNIT_IN_SECONDS = parseInt(process.env.TRANSACTION_RATE_LIMIT_AGGREGATION_UNIT_IN_SECONDS, 10);
// tslint:disable-next-line:no-magic-numbers
const THRESHOLD = parseInt(process.env.TRANSACTION_RATE_LIMIT_THRESHOLD, 10);
/**
 * 進行中取引の接続回数制限ミドルウェア
 * 取引IDを使用して動的にスコープを作成する
 * @const
 */
const rateLimit4transactionInProgress = middlewares.rateLimit({
    redisClient: new ioredis({
        host: process.env.RATE_LIMIT_REDIS_HOST,
        // tslint:disable-next-line:no-magic-numbers
        port: parseInt(process.env.RATE_LIMIT_REDIS_PORT, 10),
        password: process.env.RATE_LIMIT_REDIS_KEY,
        tls: { servername: process.env.RATE_LIMIT_REDIS_HOST }
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
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, _, next) => {
    // expires is unix timestamp (in seconds)
    req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required');
    req.checkBody('sellerId', 'invalid sellerId').notEmpty().withMessage('sellerId is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
        const transaction = yield kwskfs.service.transaction.placeOrderInProgress.start({
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
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, _, next) => {
    req.checkBody('familyName').notEmpty().withMessage('required');
    req.checkBody('givenName').notEmpty().withMessage('required');
    req.checkBody('telephone').notEmpty().withMessage('required');
    req.checkBody('email').notEmpty().withMessage('required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const contact = yield kwskfs.service.transaction.placeOrderInProgress.setCustomerContact(req.user.sub, req.params.transactionId, {
            familyName: req.body.familyName,
            givenName: req.body.givenName,
            email: req.body.email,
            telephone: req.body.telephone
        })({
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(contact);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * イベントの座席予約承認
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/offer/eventReservation/seat', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, _, next) => {
    req.checkBody('eventType').notEmpty().withMessage('required');
    req.checkBody('eventIdentifier').notEmpty().withMessage('required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // tslint:disable-next-line:max-line-length
        const seatReservationAuthorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.seat;
        const action = yield seatReservationAuthorizeActionService.create({
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
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * イベントの座席予約承認削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/offer/eventReservation/seat/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // tslint:disable-next-line:max-line-length
        const seatReservationAuthorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.seat;
        yield seatReservationAuthorizeActionService.cancel(req.user.sub, req.params.transactionId, req.params.actionId)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/creditCard', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, __2, next) => {
    req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
    req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
    req.checkBody('method', 'invalid method').notEmpty().withMessage('gmo_order_id is required');
    req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('gmo_amount is required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 会員IDを強制的にログイン中の人物IDに変更
        const creditCard = Object.assign({}, req.body.creditCard, {
            memberId: (req.user.username !== undefined) ? req.user.sub : undefined
        });
        debug('authorizing credit card...', creditCard);
        debug('authorizing credit card...', req.body.creditCard);
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(req.user.sub, req.params.transactionId, req.body.orderId, req.body.amount, req.body.method, creditCard)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.CREATED).json({
            id: action.id
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/creditCard/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(req.user.sub, req.params.transactionId, req.params.actionId)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino口座確保
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/pecorino', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (req, __, next) => {
    req.checkBody('price', 'invalid price').notEmpty().withMessage('price is required').isInt();
    req.checkBody('fromAccountId', 'invalid fromAccountId').notEmpty().withMessage('fromAccountId is required');
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // pecorino支払取引サービスクライアントを生成
        const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
            domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
        });
        pecorinoOAuth2client.setCredentials({
            access_token: req.accessToken
        });
        const transferTransactionService = new kwskfs.pecorinoapi.service.transaction.Transfer({
            endpoint: process.env.PECORINO_API_ENDPOINT,
            auth: pecorinoOAuth2client
        });
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.pecorino.create({
            transactionId: req.params.transactionId,
            price: req.body.price,
            fromAccountId: req.body.fromAccountId,
            notes: req.body.notes
        })({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            transferTransactionService: transferTransactionService
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * レストランメニューアイテム承認アクション
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/offer/eventReservation/menuItem', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const authorizeActionService = kwskfs.service.transaction.placeOrderInProgress.action.authorize.offer.eventReservation.menuItem;
        const action = yield authorizeActionService.create({
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
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = yield kwskfs.service.transaction.placeOrderInProgress.confirm(req.user.sub, req.params.transactionId)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection),
            confirmationNumber: new kwskfs.repository.ConfirmationNumber(redis.getClient()),
            orderNumber: new kwskfs.repository.OrderNumber(redis.getClient())
        });
        debug('transaction confirmed', order);
        res.status(http_status_1.CREATED).json(order);
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/cancel', permitScopes_1.default(['admin', 'aws.cognito.signin.user.admin', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        yield transactionRepo.cancel(kwskfs.factory.transactionType.PlaceOrder, req.params.transactionId);
        debug('transaction canceled.');
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
