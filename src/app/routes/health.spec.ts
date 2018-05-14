// tslint:disable:no-implicit-dependencies

/**
 * ヘルスチェックルーターテスト
 * @ignore
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
// import * as assert from 'assert';
// import * as httpStatus from 'http-status';
// import * as supertest from 'supertest';

// import * as app from '../../app/app';
import mongooseConnectionOptions from '../../mongooseConnectionOptions';

describe('ヘルスチェック', () => {
    beforeEach(async () => {
        await kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);
    });

    afterEach(async () => {
        await kwskfs.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions);
    });

    // it('mongodbとredisに接続済みであれば健康', async () => {
    //     await supertest(app)
    //         .get('/health')
    //         .set('Accept', 'application/json')
    //         .expect(httpStatus.OK)
    //         .then((response) => {
    //             assert.equal(typeof response.text, 'string');
    //         });
    // });

    // it('mongodb接続切断後アクセスすればBAD_REQUEST', async () => {
    //     // mongooseデフォルトコネクションを切断
    //     await kwskfs.mongoose.connection.close();
    //     await supertest(app)
    //         .get('/health')
    //         .set('Accept', 'application/json')
    //         .expect(httpStatus.INTERNAL_SERVER_ERROR)
    //         .then();
    // });
});
