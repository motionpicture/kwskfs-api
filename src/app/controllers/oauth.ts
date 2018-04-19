/**
 * oauthコントローラー
 * @ignore
 */

// import * as kwskfs from '@motionpicture/kwskfs-domain';
// import * as createDebug from 'debug';
// import * as jwt from 'jsonwebtoken';

// tslint:disable-next-line:no-require-imports no-var-requires
// const googleAuth = require('google-auth-library');

// const debug = createDebug('kwskfs-api:controllers:oauth');
// todo どこで定義するか
// const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;

export const MESSAGE_UNIMPLEMENTED_GRANT_TYPE = 'grant_type not implemented';
export const MESSAGE_CLIENT_NOT_FOUND = 'client not found';
export const MESSAGE_INVALID_USERNAME_OR_PASSWORD = 'invalid username or password';
export const MESSAGE_INVALID_ASSERTION = 'client not foundinvalid assertion';
export const MESSAGE_INVALID_CLIENT_CREDENTIALS = 'invalid client credentials';

/**
 * 資格情報インターフェース
 */
export interface ICredentials {
    access_token: string;
    token_type: string;
    expires_in: number;
}

/**
 * 資格情報を発行する
 *
 * @param {Request} req リクエストオブジェクト
 * @returns {Promise<ICredentials>} 資格情報
 */
// export async function issueCredentials(req: Request): Promise<ICredentials> {
//     switch (req.body.grant_type) {
//         case 'urn:ietf:params:oauth:grant-type:jwt-bearer':
//             return await issueCredentialsByAssertion(req.body.assertion, req.body.scopes);

//         case 'client_credentials':
//             const scopes = (<string>req.body.scope).split(' ');

//             return await issueCredentialsByClient(req.body.client_id, req.body.client_secret, req.body.state, scopes);

//         // case 'password':
//         //     return await issueCredentialsByPassword(
//         //         req.body.client_id, req.body.state, req.body.username, req.body.password, req.body.scopes
//         //     );

//         default:
//             // 非対応認可タイプ
//             throw new Error(MESSAGE_UNIMPLEMENTED_GRANT_TYPE);
//     }
// }

/**
 * 主張から資格情報を発行する
 *
 * @param {string} assertion 主張
 * @param {string[]} scopes スコープリスト
 * @returns {Promise<ICredentials>} 資格情報
 */
// export async function issueCredentialsByAssertion(assertion: string, scopes: string[]): Promise<ICredentials> {
//     if (assertion !== process.env.KWSKFS_API_REFRESH_TOKEN) {
//         throw new Error(MESSAGE_INVALID_ASSERTION);
//     }

//     // todo clientとstateどうするか
//     const payload = kwskfs.factory.clientUser.create({
//         client: '',
//         state: '',
//         scopes: scopes
//     });

//     return await payload2credentials(payload);
// }

/**
 * クライアントIDから資格情報を発行する
 *
 * @param {string} clientId クライアントID
 * @param {string[]} scopes スコープリスト
 * @returns {Promise<ICredentials>} 資格情報
 */
// export async function issueCredentialsByClient(
//     clientId: string, clientSecret: string, state: string, scopes: string[]
// ): Promise<ICredentials> {
//     // クライアントの存在確認
//     const clientAdapter = kwskfs.repository.client(kwskfs.mongoose.connection);
//     const clientDoc = await clientAdapter.clientModel.findById(clientId).exec();
//     if (clientDoc === null) {
//         throw new Error(MESSAGE_CLIENT_NOT_FOUND);
//     }

//     // クライアントシークレット`検証
//     debug('validating client secret...', clientSecret);
//     if (!await bcrypt.compare(clientSecret, clientDoc.get('secret_hash'))) {
//         throw new Error(MESSAGE_INVALID_CLIENT_CREDENTIALS);
//     }

//     const payload = kwskfs.factory.clientUser.create({
//         client: clientId,
//         state: state,
//         scopes: scopes
//     });

//     return await payload2credentials(payload);
// }

/**
 * Googleのid tokenから資格情報を発行する
 */
// export async function issueCredentialsByGoogleToken(
//     idToken: string, clientId: string, state: string, scopes: string[]
// ): Promise<ICredentials> {
//     // クライアントの存在確認
//     const clientAdapter = kwskfs.repository.client(kwskfs.mongoose.connection);
//     const clientDoc = await clientAdapter.clientModel.findById(clientId, '_id').exec();
//     if (clientDoc === null) {
//         throw new Error(MESSAGE_CLIENT_NOT_FOUND);
//     }

//     const userInfo = await verifyGoogleIdToken(idToken);

//     // 会員検索(なければ登録)
//     const personAdapter = await kwskfs.repository.person(kwskfs.mongoose.connection);
//     const person = {
//         typeOf: 'Person',
//         email: userInfo.email,
//         givenName: '',
//         familyName: '',
//         telephone: '',
//         memberOf: {
//             openId: {
//                 provider: userInfo.iss,
//                 userId: userInfo.sub
//             },
//             hostingOrganization: {},
//             membershipNumber: `${userInfo.iss}-${userInfo.sub}`,
//             programName: 'シネマサンシャインプレミアム'
//         }
//     };
//     const personDoc = await personAdapter.personModel.findOneAndUpdate(
//         {
//             'memberOf.openId.provider': person.memberOf.openId.provider,
//             'memberOf.openId.userId': person.memberOf.openId.userId
//         },
//         {
//             $setOnInsert: person // 新規の場合のみ更新
//         },
//         { new: true, upsert: true }
//     ).exec();

//     if (personDoc === null) {
//         throw new Error('member not found');
//     }

//     const payload = kwskfs.factory.clientUser.create(<any>{
//         client: clientId,
//         person: personDoc.toObject(),
//         state: state,
//         scopes: scopes
//     });

//     return await payload2credentials(payload);
// }

// async function verifyGoogleIdToken(idToken: string) {
//     return new Promise<any>((resolve, reject) => {

//         // idTokenをGoogleで検証
//         const CLIENT_ID = '932934324671-66kasujntj2ja7c5k4k55ij6pakpqir4.apps.googleusercontent.com';
//         const auth = new googleAuth();
//         const client = new auth.OAuth2(CLIENT_ID, '', '');
//         client.verifyIdToken(
//             idToken,
//             CLIENT_ID,
//             // Or, if multiple clients access the backend:
//             //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
//             async (error: any, login: any) => {
//                 if (error !== null) {
//                     reject(error);

//                     return;
//                 }

//                 // todo audのチェック

//                 const payload = login.getPayload();
//                 debug('payload is', payload);

//                 // const userId = payload.sub;
//                 // If request specified a G Suite domain:
//                 //var domain = payload['hd'];

//                 resolve(payload);
//             });
//     });
// }

/**
 * LINEの認可コードから資格情報を発行する
 */
// export async function issueCredentialsByLINEAuthorizationCode(
//     code: string, redirectUri: string, clientId: string, state: string, scopes: string[]
// ): Promise<ICredentials> {
//     // クライアントの存在確認
//     const clientAdapter = kwskfs.repository.client(kwskfs.mongoose.connection);
//     const clientDoc = await clientAdapter.clientModel.findById(clientId, '_id').exec();
//     if (clientDoc === null) {
//         throw new Error(MESSAGE_CLIENT_NOT_FOUND);
//     }

//     const form = {
//         grant_type: 'authorization_code',
//         client_id: '1527681488',
//         client_secret: 'cf3540f8c004f9e8926a5090ae6a036d',
//         code: code,
//         redirect_uri: redirectUri
//     };
//     debug('getting an access token...', form);
//     const accessToken = await request.post({
//         url: 'https://api.line.me/v2/oauth/accessToken',
//         form: form,
//         json: true,
//         simple: false,
//         resolveWithFullResponse: true,
//         useQuerystring: true
//     }).then((response) => {
//         debug(response.body);

//         return response.body.access_token;
//     });
//     debug('an access token got', accessToken);

//     // LINEプロフィール取得
//     debug('getting user profiles...');
//     const profile = await request.get({
//         url: 'https://api.line.me/v2/profile',
//         auth: { bearer: accessToken },
//         json: true,
//         simple: false,
//         resolveWithFullResponse: true,
//         useQuerystring: true
//     }).then((response) => {
//         debug(response.body);

//         return response.body;
//     });
//     debug('profile is', profile);

//     // 会員検索(なければ登録)
//     const personAdapter = await kwskfs.repository.person(kwskfs.mongoose.connection);
//     const person = {
//         typeOf: 'Person',
//         email: '',
//         givenName: '',
//         familyName: '',
//         telephone: '',
//         memberOf: {
//             openId: {
//                 provider: 'LINE',
//                 userId: profile.userId
//             },
//             hostingOrganization: {},
//             membershipNumber: `LINE-${profile.userId}`,
//             programName: 'シネマサンシャインプレミアム'
//         }
//     };
//     const personDoc = await personAdapter.personModel.findOneAndUpdate(
//         {
//             'memberOf.openId.provider': person.memberOf.openId.provider,
//             'memberOf.openId.userId': person.memberOf.openId.userId
//         },
//         {
//             $setOnInsert: person // 新規の場合のみ更新
//         },
//         { new: true, upsert: true }
//     ).exec();

//     if (personDoc === null) {
//         throw new Error('member not found');
//     }

//     const payload = kwskfs.factory.clientUser.create(<any>{
//         client: clientId,
//         person: personDoc.toObject(),
//         state: state,
//         scopes: scopes
//     });

//     return await payload2credentials(payload);
// }

/**
 * 任意のデータをJWTを使用して資格情報へ変換する
 *
 * @param {object} payload 変換したいデータ
 * @returns {Promise<ICredentials>} 資格情報
 */
// export async function payload2credentials(payload: Express.IUser): Promise<ICredentials> {
//     return new Promise<ICredentials>((resolve, reject) => {
//         debug('signing...', payload);
//         jwt.sign(
//             payload,
//             <string>process.env.KWSKFS_API_SECRET,
//             {
//                 expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
//             },
//             (err, encoded) => {
//                 debug('jwt signed', err, encoded);
//                 if (err instanceof Error) {
//                     reject(err);
//                 } else {
//                     resolve({
//                         access_token: encoded,
//                         token_type: 'Bearer',
//                         expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
//                     });
//                 }
//             }
//         );
//     });
// }
