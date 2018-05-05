
const request = require('request-promise-native');

const accessToken = process.env.TEST_ACCESS_TOKEN;
request.post({
    url: `http://localhost:8081/ownershipInfos/EventReservation/actions/check`,
    auth: { bearer: accessToken },
    json: true,
    simple: false,
    resolveWithFullResponse: true,
    body: {
        ticketToken: '08d29486-6d70-482d-b538-1f706535d02a'
    }
}).then((response) => {
    console.log('response:', response.statusCode, response.body);
}).catch(console.error);
