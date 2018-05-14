/**
 * people router
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import requireMember from '../middlewares/requireMember';
import validator from '../middlewares/validator';

const peopleRouter = Router();

const debug = createDebug('kwskfs-api:routes:people');
const CUSTOM_ATTRIBUTE_NAME = <string>process.env.COGNITO_ATTRIBUTE_NAME_ACCOUNT_ID;
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new AWS.Credentials({
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    })
});
const pecorinoAuthClient = new kwskfs.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_API_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_API_CLIENT_SECRET,
    scopes: [],
    state: ''
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
 * Pecorino口座開設
 */
peopleRouter.post(
    '/me/accounts',
    permitScopes(['aws.cognito.signin.user.admin', 'people.accounts']),
    validator,
    async (req, res, next) => {
        try {
            const accountService = new kwskfs.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const account = await accountService.open({
                name: req.body.name,
                initialBalance: (req.body.initialBalance !== undefined) ? parseInt(req.body.initialBalance, 10) : 0
            });
            await addPecorinoAccountId(<string>req.user.username, account.id);

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
            if (req.user.username === undefined) {
                throw new kwskfs.factory.errors.Forbidden('Login required');
            }

            const accountService = new kwskfs.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            let accounts: kwskfs.factory.pecorino.account.IAccount[] = [];
            const accountIds = await getAccountIds(req.user.username);
            if (accountIds.length > 0) {
                accounts = await accountService.search({
                    ids: accountIds,
                    statuses: [],
                    limit: 100
                });
            }
            res.json(accounts);
        } catch (error) {
            next(error);
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
            const accountService = new kwskfs.pecorinoapi.service.Account({
                endpoint: <string>process.env.PECORINO_API_ENDPOINT,
                auth: pecorinoAuthClient
            });
            const actions = await accountService.searchMoneyTransferActions({ accountId: req.params.accountId });
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

async function addPecorinoAccountId(username: string, accountId: string) {
    const accountIds = await getAccountIds(username);
    debug('currently accountIds are', accountIds);

    accountIds.push(accountId);

    await new Promise((resolve, reject) => {
        cognitoIdentityServiceProvider.adminUpdateUserAttributes(
            {
                UserPoolId: <string>process.env.COGNITO_USER_POOL_ID,
                Username: username,
                UserAttributes: [
                    {
                        Name: `custom:${CUSTOM_ATTRIBUTE_NAME}`,
                        Value: JSON.stringify(accountIds)
                    }
                ]
            },
            (err) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
    debug('accountIds adde.', accountIds);
}

async function getAccountIds(username: string) {
    return new Promise<string[]>((resolve, reject) => {
        cognitoIdentityServiceProvider.adminGetUser(
            {
                UserPoolId: <string>process.env.COGNITO_USER_POOL_ID,
                Username: username
            },
            (err, data) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.UserAttributes === undefined) {
                        reject(new Error('UserAttributes not found.'));
                    } else {
                        const attribute = data.UserAttributes.find((a) => a.Name === `custom:${CUSTOM_ATTRIBUTE_NAME}`);
                        resolve((attribute !== undefined && attribute.Value !== undefined) ? JSON.parse(attribute.Value) : []);
                    }
                }
            });
    });
}

export default peopleRouter;
