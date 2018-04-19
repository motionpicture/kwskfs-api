// tslint:disable:no-implicit-dependencies

/**
 * ヘルスチェックルーターテスト
 * @ignore
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../../app/app';
import mongooseConnectionOptions from '../../mongooseConnectionOptions';
import * as redis from '../../redis';

const MONGOOSE_CONNECTION_READY_STATE_CONNECTED = 1;
const INTERVALS_CHECK_CONNECTION = 2000;

describe('ヘルスチェック', () => {
    beforeEach(async () => {
        kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);
    });

    afterEach(async () => {
        kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);
    });

    it('mongodbとredisに接続済みであれば健康', async () => {
        await new Promise((resolve, reject) => {
            const timer = setInterval(
                async () => {
                    if (
                        kwskfs.mongoose.connection.readyState !== MONGOOSE_CONNECTION_READY_STATE_CONNECTED
                        || !redis.getClient().connected
                    ) {
                        return;
                    }

                    clearInterval(timer);

                    try {
                        await supertest(app)
                            .get('/health')
                            .set('Accept', 'application/json')
                            .expect(httpStatus.OK)
                            .then((response) => {
                                assert.equal(typeof response.text, 'string');
                            });

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                },
                INTERVALS_CHECK_CONNECTION
            );
        });
    });

    it('mongodb接続切断後アクセスすればBAD_REQUEST', async () => {
        await new Promise((resolve, reject) => {
            const timer = setInterval(
                async () => {
                    if (
                        kwskfs.mongoose.connection.readyState !== MONGOOSE_CONNECTION_READY_STATE_CONNECTED
                        || !redis.getClient().connected
                    ) {
                        return;
                    }

                    clearInterval(timer);

                    try {
                        // mongooseデフォルトコネクションを切断
                        await kwskfs.mongoose.connection.close();

                        await supertest(app)
                            .get('/health')
                            .set('Accept', 'application/json')
                            .expect(httpStatus.INTERNAL_SERVER_ERROR)
                            .then();

                        // mongodb接続しなおす
                        kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions, (err: any) => {
                            if (err instanceof Error) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                INTERVALS_CHECK_CONNECTION
            );
        });
    });
});
