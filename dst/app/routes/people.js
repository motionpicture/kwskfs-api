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
 * people router
 */
const kwskfs = require("@motionpicture/kwskfs-domain");
const AWS = require("aws-sdk");
const createDebug = require("debug");
const express_1 = require("express");
const http_status_1 = require("http-status");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const requireMember_1 = require("../middlewares/requireMember");
const validator_1 = require("../middlewares/validator");
const peopleRouter = express_1.Router();
const debug = createDebug('kwskfs-api:routes:people');
const CUSTOM_ATTRIBUTE_NAME = process.env.COGNITO_ATTRIBUTE_NAME_ACCOUNT_ID;
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new AWS.Credentials({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new kwskfs.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_API_CLIENT_ID,
    clientSecret: process.env.PECORINO_API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
peopleRouter.use(authentication_1.default);
peopleRouter.use(requireMember_1.default);
/**
 * retrieve contacts from Amazon Cognito
 */
peopleRouter.get('/me/contacts', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.contacts', 'people.contacts.read-only']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const contact = yield kwskfs.service.person.contact.retrieve(req.accessToken)();
        res.json(contact);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員プロフィール更新
 */
peopleRouter.put('/me/contacts', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.contacts']), (__1, __2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield kwskfs.service.person.contact.update(req.accessToken, {
            givenName: req.body.givenName,
            familyName: req.body.familyName,
            email: req.body.email,
            telephone: req.body.telephone
        })();
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員クレジットカード取得
 */
peopleRouter.get('/me/creditCards', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.creditCards', 'people.creditCards.read-only']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const searchCardResults = yield kwskfs.service.person.creditCard.find(req.user.sub, req.user.username)();
        debug('searchCardResults:', searchCardResults);
        res.json(searchCardResults);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員クレジットカード追加
 */
peopleRouter.post('/me/creditCards', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.creditCards']), (__1, __2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const creditCard = yield kwskfs.service.person.creditCard.save(req.user.sub, req.user.username, req.body)();
        res.status(http_status_1.CREATED).json(creditCard);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 会員クレジットカード削除
 */
peopleRouter.delete('/me/creditCards/:cardSeq', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.creditCards']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield kwskfs.service.person.creditCard.unsubscribe(req.user.sub, req.params.cardSeq)();
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino口座開設
 */
peopleRouter.post('/me/accounts', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.accounts']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const accountService = new kwskfs.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_API_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const account = yield accountService.open({
            name: req.body.name,
            initialBalance: (req.body.initialBalance !== undefined) ? parseInt(req.body.initialBalance, 10) : 0
        });
        yield addPecorinoAccountId(req.user.username, account.id);
        res.status(http_status_1.CREATED).json(account);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino残高照会
 */
peopleRouter.get('/me/accounts', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.accounts.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (req.user.username === undefined) {
            throw new kwskfs.factory.errors.Forbidden('Login required');
        }
        const accountService = new kwskfs.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_API_ENDPOINT,
            auth: pecorinoAuthClient
        });
        let accounts = [];
        const accountIds = yield getAccountIds(req.user.username);
        if (accountIds.length > 0) {
            accounts = yield accountService.search({
                ids: accountIds,
                statuses: [],
                limit: 100
            });
        }
        res.json(accounts);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * Pecorino取引履歴検索
 */
peopleRouter.get('/me/accounts/:accountId/actions/moneyTransfer', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.accounts.actions.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const accountService = new kwskfs.pecorinoapi.service.Account({
            endpoint: process.env.PECORINO_API_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const actions = yield accountService.searchMoneyTransferActions({ accountId: req.params.accountId });
        res.json(actions);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * find user's ownershipInfos
 */
peopleRouter.get('/me/ownershipInfos/:goodType', permitScopes_1.default(['aws.cognito.signin.user.admin', 'people.ownershipInfos', 'people.ownershipInfos.read-only']), (_1, _2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repository = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
        const ownershipInfos = yield repository.search({
            goodType: req.params.goodType,
            ownedBy: req.user.sub,
            ownedAt: new Date()
        });
        res.json(ownershipInfos);
    }
    catch (error) {
        next(error);
    }
}));
function addPecorinoAccountId(username, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountIds = yield getAccountIds(username);
        debug('currently accountIds are', accountIds);
        accountIds.push(accountId);
        yield new Promise((resolve, reject) => {
            cognitoIdentityServiceProvider.adminUpdateUserAttributes({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: username,
                UserAttributes: [
                    {
                        Name: `custom:${CUSTOM_ATTRIBUTE_NAME}`,
                        Value: JSON.stringify(accountIds)
                    }
                ]
            }, (err) => {
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        debug('accountIds adde.', accountIds);
    });
}
function getAccountIds(username) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            cognitoIdentityServiceProvider.adminGetUser({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: username
            }, (err, data) => {
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    if (data.UserAttributes === undefined) {
                        reject(new Error('UserAttributes not found.'));
                    }
                    else {
                        const attribute = data.UserAttributes.find((a) => a.Name === `custom:${CUSTOM_ATTRIBUTE_NAME}`);
                        resolve((attribute !== undefined && attribute.Value !== undefined) ? JSON.parse(attribute.Value) : []);
                    }
                }
            });
        });
    });
}
exports.default = peopleRouter;
