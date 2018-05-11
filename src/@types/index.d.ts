/**
 * middlewares/authenticationにて、expressのrequestオブジェクトにAPIユーザー情報を追加している。
 * ユーザーの型をここで定義しています。
 * @ignore
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as express from 'express';

declare global {
    namespace Express {
        export type IUser = kwskfs.factory.clientUser.IClientUser;

        // tslint:disable-next-line:interface-name
        export interface Request {
            user: IUser;
            accessToken: string;
        }
    }
}
