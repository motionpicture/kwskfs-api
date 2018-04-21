"use strict";
/**
 * 注文取引ルーター
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
const middlewares = require("@motionpicture/express-middleware");
const kwskfs = require("@motionpicture/kwskfs-domain");
const createDebug = require("debug");
const express_1 = require("express");
const fs = require("fs");
const http_status_1 = require("http-status");
const redis = require("ioredis");
const moment = require("moment");
const request = require("request-promise-native");
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const restaurants = JSON.parse(fs.readFileSync(`${__dirname}/../../../../data/organizations/restaurant.json`, 'utf8'));
const debug = createDebug('kwskfs-api:placeOrderTransactionsRouter');
const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
});
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
    redisClient: new redis({
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
        let passportToken = req.body.passportToken;
        // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
        if (passportToken === undefined) {
            const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
            const seller = yield organizationRepo.findMovieTheaterById(req.body.sellerId);
            try {
                passportToken = yield request.post(`${process.env.WAITER_ENDPOINT}/passports`, {
                    body: {
                        scope: `placeOrderTransaction.${seller.identifier}`
                    },
                    json: true
                }).then((body) => body.token);
            }
            catch (error) {
                if (error.statusCode === http_status_1.NOT_FOUND) {
                    throw new kwskfs.factory.errors.NotFound('sellerId', 'Seller does not exist.');
                }
                else if (error.statusCode === http_status_1.TOO_MANY_REQUESTS) {
                    throw new kwskfs.factory.errors.RateLimitExceeded('PlaceOrder transactions rate limit exceeded.');
                }
                else {
                    throw new kwskfs.factory.errors.ServiceUnavailable('Waiter service temporarily unavailable.');
                }
            }
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
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(req.user.sub, req.params.transactionId, req.body.eventIdentifier, req.body.offers)({
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
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(req.user.sub, req.params.transactionId, req.params.actionId)({
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
 * 座席仮予へ変更(券種変更)
 */
placeOrderTransactionsRouter.patch('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.seatReservation.changeOffers(req.user.sub, req.params.transactionId, req.params.actionId, req.body.eventIdentifier, req.body.offers)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            event: new kwskfs.repository.Event(kwskfs.mongoose.connection)
        });
        res.json(action);
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
 * ムビチケ追加
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/mvtk', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const authorizeObject = {
            typeOf: kwskfs.factory.action.authorize.mvtk.ObjectType.Mvtk,
            // tslint:disable-next-line:no-magic-numbers
            price: parseInt(req.body.price, 10),
            transactionId: req.params.transactionId,
            seatInfoSyncIn: {
                kgygishCd: req.body.seatInfoSyncIn.kgygishCd,
                yykDvcTyp: req.body.seatInfoSyncIn.yykDvcTyp,
                trkshFlg: req.body.seatInfoSyncIn.trkshFlg,
                kgygishSstmZskyykNo: req.body.seatInfoSyncIn.kgygishSstmZskyykNo,
                kgygishUsrZskyykNo: req.body.seatInfoSyncIn.kgygishUsrZskyykNo,
                jeiDt: req.body.seatInfoSyncIn.jeiDt,
                kijYmd: req.body.seatInfoSyncIn.kijYmd,
                stCd: req.body.seatInfoSyncIn.stCd,
                screnCd: req.body.seatInfoSyncIn.screnCd,
                knyknrNoInfo: req.body.seatInfoSyncIn.knyknrNoInfo,
                zskInfo: req.body.seatInfoSyncIn.zskInfo,
                skhnCd: req.body.seatInfoSyncIn.skhnCd
            }
        };
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(req.user.sub, req.params.transactionId, authorizeObject)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
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
 * ムビチケ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/mvtk/:actionId', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.cancel(req.user.sub, req.params.transactionId, req.params.actionId)({
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
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // pecorino支払取引サービスクライアントを生成
        pecorinoOAuth2client.setCredentials({
            access_token: req.accessToken
        });
        const payTransactionService = new kwskfs.pecorinoapi.service.transaction.Pay({
            endpoint: process.env.PECORINO_API_ENDPOINT,
            auth: pecorinoOAuth2client
        });
        const action = yield kwskfs.service.transaction.placeOrderInProgress.action.authorize.pecorino.create(req.user.sub, req.params.transactionId, req.body.price)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            payTransactionService: payTransactionService
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
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/menuItem', permitScopes_1.default(['transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const action = yield authorizeMenuItem(req.user.sub, req.params.transactionId, req.body.menuItemIdentifier, req.body.offerIdentifier, req.body.acceptedQuantity)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(action);
    }
    catch (error) {
        next(error);
    }
}));
function authorizeMenuItem(agentId, transactionId, menuItemIdentifier, offerIdentifier, acceptedQuantity) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const transaction = yield repos.transaction.findPlaceOrderInProgressById(transactionId);
        if (transaction.agent.id !== agentId) {
            throw new kwskfs.factory.errors.Forbidden('A specified transaction is not yours.');
        }
        // メニューアイテムリストをマージ
        debug('merge menu items from restaurants...', restaurants);
        const menuItems = [];
        restaurants.forEach((restaurant) => {
            restaurant.hasMenu.forEach((menu) => {
                menu.hasMenuSection.forEach((menuSection) => {
                    menuItems.push(...menuSection.hasMenuItem.map((i) => {
                        return Object.assign({}, i, { offers: i.offers.map((o) => {
                                return Object.assign({}, o, { offeredBy: restaurant });
                            }) });
                    }));
                });
            });
        });
        throw new kwskfs.factory.errors.NotImplemented('menu items merged.');
        // メニューアイテムの存在確認
        debug('finding menu item...', menuItemIdentifier);
        const menuItem = menuItems.find((i) => i.identifier === menuItemIdentifier);
        if (menuItem === undefined) {
            throw new kwskfs.factory.errors.NotFound('MenuItem');
        }
        // 販売情報の存在確認
        debug('finding offer...', offerIdentifier);
        const acceptedOffer = menuItem.offers.find((o) => o.identifier === offerIdentifier);
        if (acceptedOffer === undefined) {
            throw new kwskfs.factory.errors.NotFound('Offer');
        }
        // 承認アクションを開始
        debug('starting authorize action of menuItem...', menuItemIdentifier, offerIdentifier);
        const actionAttributes = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            object: Object.assign({}, acceptedOffer, { acceptedQuantity: acceptedQuantity, itemOffered: menuItem }),
            agent: transaction.seller,
            recipient: transaction.agent,
            purpose: transaction
        };
        const action = yield repos.action.start(actionAttributes);
        try {
            // 在庫確保？
        }
        catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? Object.assign({}, error, { message: error.message }) : error;
                yield repos.action.giveUp(action.typeOf, action.id, actionError);
            }
            catch (__) {
                // 失敗したら仕方ない
            }
            throw new kwskfs.factory.errors.ServiceUnavailable('Unexepected error occurred.');
        }
        // アクションを完了
        debug('ending authorize action...');
        const result = {
            price: acceptedOffer.price * acceptedQuantity,
            priceCurrency: acceptedOffer.priceCurrency
        };
        return repos.action.complete(action.typeOf, action.id, result);
    });
}
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, rateLimit4transactionInProgress, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = yield kwskfs.service.transaction.placeOrderInProgress.confirm(req.user.sub, req.params.transactionId)({
            action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
            organization: new kwskfs.repository.Organization(kwskfs.mongoose.connection)
        });
        debug('transaction confirmed', order);
        res.status(http_status_1.CREATED).json(order);
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['aws.cognito.signin.user.admin', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const task = yield kwskfs.service.transaction.placeOrder.sendEmail(req.params.transactionId, {
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
        })({
            task: new kwskfs.repository.Task(kwskfs.mongoose.connection),
            transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
        });
        res.status(http_status_1.CREATED).json(task);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
