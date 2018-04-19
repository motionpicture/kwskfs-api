/**
 * redis cacheクライアント
 *
 * @module
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';

const debug = createDebug('kwskfs-api:redis');
const CONNECT_TIMEOUT_IN_MILLISECONDS = 3600000;
const MAX_ATTEMPTS = 10;

let client: kwskfs.redis.RedisClient | undefined;

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
function createClient() {
    const c = kwskfs.redis.createClient({
        host: <string>process.env.REDIS_HOST,
        // tslint:disable-next-line:no-magic-numbers
        port: parseInt(<string>process.env.REDIS_PORT, 10),
        password: <string>process.env.REDIS_KEY,
        tls: { servername: <string>process.env.REDIS_HOST },
        // If you return a number from this function, the retry will happen exactly after that time in milliseconds.
        // If you return a non-number, no further retry will happen and all offline commands are flushed with errors.
        // Return an error to return that specific error to all offline commands.
        retry_strategy: (options) => {
            debug('retrying...', options);
            if (options.error instanceof Error && (<any>options.error).code === 'ECONNREFUSED') {
                console.error(options.error);
                // redisClient = redisClient.duplicate();

                // End reconnecting on a specific error and flush all commands with a individual error
                // return new Error('The server refused the connection');
            }

            if (options.total_retry_time > CONNECT_TIMEOUT_IN_MILLISECONDS) {
                resetClient();

                // End reconnecting after a specific timeout and flush all commands with a individual error
                return new Error('Retry time exhausted');
            }

            if (MAX_ATTEMPTS > 0 && options.attempt > MAX_ATTEMPTS) {
                resetClient();

                return new Error('Retry attempts exhausted');
            }

            // reconnect after
            // tslint:disable-next-line:no-magic-numbers
            return Math.min(options.attempt * 100, 3000);
        }
    });

    // redisClient.on('ready', () => {
    //     debug('ready');
    // });

    // redisClient.on('connect', () => {
    //     debug('connected');
    // });

    // redisClient.on('reconnecting', () => {
    //     debug('reconnecting...');
    // });

    c.on('error', (err: any) => {
        console.error(err);
    });

    // c.on('end', () => {
    //     debug('end');
    // });

    return c;
}

/**
 * 接続クライアントをリセットする
 * 接続リトライをギブアップした場合に呼び出される
 *
 * @see retry_strategy
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
function resetClient() {
    client = undefined;
}

export function getClient(): kwskfs.redis.RedisClient {
    if (client === undefined) {
        client = createClient();
    }

    return client;
}
