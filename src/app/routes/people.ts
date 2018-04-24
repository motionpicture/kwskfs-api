/**
 * people router
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import requireMember from '../middlewares/requireMember';
import validator from '../middlewares/validator';

const peopleRouter = Router();

const debug = createDebug('kwskfs-api:routes:people');

const pecorinoOAuth2client = new kwskfs.pecorinoapi.auth.OAuth2({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN
});

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
 * Pecorino残高照会
 */
peopleRouter.get(
    '/me/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // pecorino支払取引サービスクライアントを生成
            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const accountService = new kwskfs.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });

            const account = await accountService.findById({ id: 'me' });
            res.json(account);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Pecorino取引履歴検索
 */
peopleRouter.get(
    '/me/accounts/actions/trade',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts.actions.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // pecorino支払取引サービスクライアントを生成
            pecorinoOAuth2client.setCredentials({
                access_token: req.accessToken
            });
            const accountService = new kwskfs.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoOAuth2client
            });
            debug('finding account...', accountService);

            const tradeActions = await accountService.searchTransferActions({ accountId: 'me' });
            res.json(tradeActions);
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
