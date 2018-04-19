/**
 * 環境変数取得サンプル
 * @ignore
 */

const httpStatus = require('http-status');
const request = require('request-promise-native');

const API_ENDPOINT = process.env.TEST_API_ENDPOINT;

async function main() {
    // アクセストークン取得
    const accessToken = await request.post({
        url: `${API_ENDPOINT}/oauth/token`,
        body: {
            assertion: process.env.KWSKFS_API_REFRESH_TOKEN,
            scope: 'admin'
        },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    }).then((response) => {
        console.log('oauth token result:', response.statusCode, response.body);

        return response.body.access_token;
    });

    await request.get({
        url: `${API_ENDPOINT}/dev/environmentVariables`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    }).then((response) => {
        console.log('/dev/environmentVariables result:', response.statusCode, response.body);
        if (response.statusCode !== httpStatus.OK) {
            throw new Error(response.body.message);
        }
        const variables = response.body.data.attributes;
        console.log(variables);
    });
}

main().then(() => {
    console.log('main processed.');
}).catch((err) => {
    console.error(err.message);
});
