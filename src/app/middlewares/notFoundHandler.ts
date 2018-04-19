/**
 * 404ハンドラーミドルウェア
 * @module middlewares.notFoundHandler
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { NextFunction, Request, Response } from 'express';

export default (req: Request, __: Response, next: NextFunction) => {
    next(new kwskfs.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
