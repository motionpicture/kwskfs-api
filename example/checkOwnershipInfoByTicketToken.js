
const request = require('request-promise-native');

const accessToken = process.env.TEST_ACCESS_TOKEN;

async function main() {
    const ticketToken = 'e8dcd39b-bca1-42a8-ac27-b6f592cad4b8';
    let response = await request.post({
        url: `http://localhost:8081/ownershipInfos/EventReservation/${ticketToken}/actions/checkIn`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    console.log('checkIn action created.', response.statusCode, response.body.id);

    response = await request.get({
        url: `http://localhost:8081/ownershipInfos/EventReservation/${ticketToken}/actions/checkIn`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    console.log((Array.isArray(response.body)) ? response.body.length : 0, 'checkIn action found.', response.statusCode);
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
