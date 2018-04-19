/**
 * トークン検証サンプル
 * @ignore
 */

const createDebug = require('debug');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const request = require('request-promise-native');

const debug = createDebug('kwskfs-api:example:verifyToken');

// const permittedAudiences = [
//     '4flh35hcir4jl73s3puf7prljq',
//     '6figun12gcdtlj9e53p2u3oqvl'
// ];

// tslint:disable-next-line:no-require-imports no-var-requires
// const pemsFromJson: IPems = require('../../../certificate/pems.json');

// const ISSUER = 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_bQcyLA7Jq';
const ISSUER = 'https://cognito-identity.amazonaws.com';

// const token = 'eyJraWQiOiJhS01rWStjZURMcmlvZlFlNGtMNHZOU1JFUWJsTVBHM0g0WFBsTE9TZVVBPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIyM2YwN2M0Mi01YjY0LTQyYzMtODE3OS1hZWZmMWE0MjA5ZWQiLCJkZXZpY2Vfa2V5IjoiYXAtbm9ydGhlYXN0LTFfY2Q1YWVhYjItN2U1Mi00MjVjLWJjMTctYzRmMzA3YWVjZGQyIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMS5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMV9iUWN5TEE3SnEiLCJleHAiOjE1MDc2ODM1NzgsImlhdCI6MTUwNzY3OTk3OCwianRpIjoiYjcyNjQ2ODUtZTcwNi00NWU5LWJmMTgtNTY4NWVjM2MyNWY2IiwiY2xpZW50X2lkIjoiNWI3Y2xpcTM0MzVxZjcyZ3Z0NnNoMG90dWkiLCJ1c2VybmFtZSI6Imlsb3ZlZ2FkZCJ9.hTuSVya-0t-4mt41qeD45A4bbGgY5w7gmmNHyJlykHO1hZuhWWyqystTqrPf-xtWVok_9hy1Z24bJg0psqm9v6iNy-UBFATCTK32k9vitgo1Sds3kmC8gP7dd6mrSgEhw6Ige-C8K1bHTYq8BxlWkr7Eqr_0SpcSuTe8GK_IYVBfEaTG7_TP5QwqdIzJVfH4pU1gzUsl5YPhR_UkilHiwVnLXY4rqgaMVeqhB-zY020f-qSo9_Q6fY7H8BZkj1TF7yEDb6Gdyh2ynzoBWt37xh6I-XrIykvLf0PmB9_MCbUS_NmtFrZKu5djizdm_thA4HhEULM1G8ZMm-XPWo5-Xw';
const token = 'eyJraWQiOiJhcC1ub3J0aGVhc3QtMTEiLCJ0eXAiOiJKV1MiLCJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJhcC1ub3J0aGVhc3QtMTplNmEwYzA2MS04ZjVjLTQ5ZjktYjBmNC0xYjIxY2EzNzAxMDMiLCJhdWQiOiJhcC1ub3J0aGVhc3QtMTo2YTY3ZjUyMy05M2MzLTQ3NjYtYjk2Zi02NTUyZjIxYWJkOGQiLCJhbXIiOlsidW5hdXRoZW50aWNhdGVkIl0sImlzcyI6Imh0dHBzOi8vY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tIiwiZXhwIjoxNTA3NjgxNzAyLCJpYXQiOjE1MDc2ODExMDJ9.LdhKJef9DvjL6gFgGUqXgGP6R1k_SO_kw2AMRMd3z4hZGaMbC13FVyJX5_Lv11A-sCUy8s0PBqsvL7znKaheyehHb6YF5jDOEMlMyZPN8WkNzhrPNrKiYV4vxNtwlNrxkZTXYHeOsPa_tQWvcn_Ui3VvKMYKng0VOTrn-Q2u6A438PRwR8XrkSiR97ZQnEE6ML3tC1ipSElDzs39kIQLjpsSFXjc7_NzqicXN1gXXqiG5FbuCQpAKcDSCXSWIS4azNiKrFrFmDi3qY1b0KUQ0t_bjqamfmKsb3LCUjGssyr2Xr8cOOewuLfJeWvTdYwa2En6LUIgh_FZ3FSKmgP9Ow';

validateToken(token, {
    issuer: ISSUER
    // tokenUse: 'access'
}).then((payload) => {
    console.log('verified! payload:', payload);
}).catch((error) => {
    console.error('validateToken error:', error);
});

async function createPems(issuer) {
    const URI_OPENID_CONFIGURATION = '/.well-known/openid-configuration';
    const openidConfiguration = await request({
        url: `${issuer}${URI_OPENID_CONFIGURATION}`,
        json: true
    }).then((body) => body);

    return await request({
        url: openidConfiguration.jwks_uri,
        json: true
    }).then((body) => {
        debug('got jwks_uri', body);
        const pemsByKid = {};
        body.keys.forEach((key) => {
            pemsByKid[key.kid] = jwkToPem(key);
        });

        return pemsByKid;
    });
}

/**
 * デコードされたトークンを検証する
 */
async function validateToken(token, verifyOptions) {
    debug('validating token...', token);
    const decodedJwt = jwt.decode(token, { complete: true });
    if (!decodedJwt) {
        throw new Error('invalid JWT token');
    }
    debug('decodedJwt:', decodedJwt);

    // audienceをチェック
    // if (decodedJwt.payload.aud !== AUDIENCE) {
    //     throw new Error('invalid audience');
    // }

    // access tokenのみ受け付ける
    // Reject the jwt if it's not an 'Access Token'
    if (verifyOptions.tokenUse !== undefined) {
        if (decodedJwt.payload.token_use !== verifyOptions.tokenUse) {
            throw new Error(`not an ${verifyOptions.tokenUse} token`);
        }
    }

    // Get the kid from the token and retrieve corresponding PEM
    const pems = await createPems(verifyOptions.issuer);
    const pem = pems[decodedJwt.header.kid];
    if (pem === undefined) {
        throw new Error(`corresponding pem undefined. kid:${decodedJwt.header.kid}`);
    }

    return new Promise((resolve, reject) => {
        // Verify the signature of the JWT token to ensure it's really coming from your User Pool
        jwt.verify(
            token,
            pem,
            {
                issuer: verifyOptions.issuer
                // audience: pemittedAudiences
            },
            (err, payload) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // Always generate the policy on value of 'sub' claim and not for 'username' because username is reassignable
                    // sub is UUID for a user which is never reassigned to another user
                    resolve(payload);
                }
            }
        );
    });
}
