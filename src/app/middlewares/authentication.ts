/**
 * oauthミドルウェア
 * @module middlewares.authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */

import { cognitoAuth } from '@motionpicture/express-middleware';
import * as kwskfs from '@motionpicture/kwskfs-domain';
import { NextFunction, Request, Response } from 'express';

// 許可発行者リスト
const ISSUERS = (<string>process.env.TOKEN_ISSUERS).split(',');

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        await cognitoAuth({
            issuers: ISSUERS,
            authorizedHandler: async (user, token) => {
                req.user = user;
                req.accessToken = token;

                next();
            },
            unauthorizedHandler: (err) => {
                next(new kwskfs.factory.errors.Unauthorized(err.message));
            }
        })(req, res, next);
    } catch (error) {
        next(new kwskfs.factory.errors.Unauthorized(error.message));
    }
};
