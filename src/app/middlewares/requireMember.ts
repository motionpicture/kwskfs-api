/**
 * 会員必須ミドルウェア
 * @module middlewares.requireMember
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';

const debug = createDebug('kwskfs-api:middlewares:requireMember');

export default (req: Request, __: Response, next: NextFunction) => {
    // 会員としてログイン済みであればOK
    if (isMember(req.user)) {
        debug('logged in as', req.user.sub);
        next();
    } else {
        next(new kwskfs.factory.errors.Forbidden('login required'));
    }
};

function isMember(user: Express.IUser) {
    return (user.username !== undefined);
}
