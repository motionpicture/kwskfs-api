/**
 * people router
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, FORBIDDEN, NO_CONTENT, NOT_FOUND, UNAUTHORIZED } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import requireMember from '../middlewares/requireMember';
import validator from '../middlewares/validator';

const peopleRouter = Router();

const debug = createDebug('kwskfs-api:routes:people');

peopleRouter.use(authentication);
peopleRouter.use(requireMember);

/**
 * retrieve contacts from Amazon Cognito
 */
peopleRouter.get(
    '/me/contacts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.contacts', 'people.contacts.read-only']),
    async (req, res, next) => {
        try {
            const contact = await kwskfs.service.person.contact.retrieve(req.accessToken)();
            res.json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員プロフィール更新
 */
peopleRouter.put(
    '/me/contacts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.contacts']),
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            await kwskfs.service.person.contact.update(
                req.accessToken,
                {
                    givenName: req.body.givenName,
                    familyName: req.body.familyName,
                    email: req.body.email,
                    telephone: req.body.telephone
                }
            )();

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード取得
 */
peopleRouter.get(
    '/me/creditCards',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards', 'people.creditCards.read-only']),
    async (req, res, next) => {
        try {
            const searchCardResults = await kwskfs.service.person.creditCard.find(req.user.sub, <string>req.user.username)();
            debug('searchCardResults:', searchCardResults);

            res.json(searchCardResults);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード追加
 */
peopleRouter.post(
    '/me/creditCards',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards']),
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const creditCard = await kwskfs.service.person.creditCard.save(
                req.user.sub,
                <string>req.user.username,
                req.body
            )();

            res.status(CREATED).json(creditCard);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員クレジットカード削除
 */
peopleRouter.delete(
    '/me/creditCards/:cardSeq',
    permitScopes(['aws.cognito.signin.user.admin', 'people.creditCards']),
    validator,
    async (req, res, next) => {
        try {
            await kwskfs.service.person.creditCard.unsubscribe(req.user.sub, req.params.cardSeq)();

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino口座開設
 */
peopleRouter.post(
    '/me/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts']),
    validator,
    async (req, res, next) => {
        try {
            const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
                domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
            });

            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const userService = new kwskfs.pecorinoapi.service.User({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });

            const account = await userService.openAccount({
                name: req.body.name,
                initialBalance: (req.body.initialBalance !== undefined) ? parseInt(req.body.initialBalance, 10) : 0
            });
            res.status(CREATED).json(account);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino残高照会
 */
peopleRouter.get(
    '/me/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
                domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
            });

            // pecorino支払取引サービスクライアントを生成
            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const userService = new kwskfs.pecorinoapi.service.User({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });

            const accounts = await userService.findAccounts({});
            res.json(accounts);
        } catch (error) {
            // Pecorino APIのステータスコード4xxをハンドリング
            switch (error.code) {
                case UNAUTHORIZED:
                    next(new kwskfs.factory.errors.Unauthorized(error.message));
                    break;
                case FORBIDDEN:
                    next(new kwskfs.factory.errors.Forbidden(error.message));
                    break;
                case NOT_FOUND:
                    next(new kwskfs.factory.errors.NotFound(error.message));
                    break;

                default:
                    next(error);
            }
        }
    }
);

/**
 * Pecorino取引履歴検索
 */
peopleRouter.get(
    '/me/accounts/:accountId/actions/moneyTransfer',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.actions.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
                domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
            });
            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const userService = new kwskfs.pecorinoapi.service.User({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });
            debug('finding account...', userService);

            const actions = await userService.searchMoneyTransferActions({ accountId: req.params.accountId });
            res.json(actions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * find user's ownershipInfos
 */
peopleRouter.get(
    '/me/ownershipInfos/:goodType',
    permitScopes(['aws.cognito.signin.user.admin', 'people.ownershipInfos', 'people.ownershipInfos.read-only']),
    (_1, _2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const repository = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
            const ownershipInfos = await repository.search({
                goodType: req.params.goodType,
                ownedBy: req.user.sub,
                ownedAt: new Date()
            });

            res.json(ownershipInfos);
        } catch (error) {
            next(error);
        }
    }
);

export default peopleRouter;
