
const moment = require('moment');
const request = require('request-promise-native');

const accessToken = 'eyJraWQiOiJjanJOTEhPN3lVeGhycVwvQ2RKMkp1aW1DYVY3Q1Q4YWlFUGtWR0xuYUpPND0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5YjcyMzEwMS0yODkwLTQ1ZTgtODBlMS00YjU1YjU0M2ZiOWUiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL2FkbWluIG9wZW5pZCBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9ldmVudHMgcHJvZmlsZSBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9wbGFjZXMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZ2FuaXphdGlvbnMgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvb3JkZXJzIHBob25lIGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL2V2ZW50cy5yZWFkLW9ubHkgaHR0cHM6XC9cL3Nza3RzLWFwaS1kZXZlbG9wbWVudC5henVyZXdlYnNpdGVzLm5ldFwvdHJhbnNhY3Rpb25zOnJlYWQtb25seSBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9vcmdhbml6YXRpb25zLnJlYWQtb25seSBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9vcmRlcnMucmVhZC1vbmx5IGh0dHBzOlwvXC9zc2t0cy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL3BsYWNlcyBodHRwczpcL1wvc3NrdHMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC90cmFuc2FjdGlvbnMgZW1haWwiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTEuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTFfOFdQTFNEeGJFIiwiZXhwIjoxNTE3OTA0NDE4LCJpYXQiOjE1MTc5MDA4MTgsInZlcnNpb24iOjIsImp0aSI6ImE0ODdhZDM4LWFhZDctNDdlZC05MzFkLWRhMTE0NWZjMTFiMSIsImNsaWVudF9pZCI6IjJxcDUyN2Vjb203cm9qZzY3MGNrcTFvZjM2IiwidXNlcm5hbWUiOiJtb3Rpb25waWN0dXJlIn0.HddxOapstsQCd4nghdC5SEucGPjleH3XIG3FJzJ6wGLuiu2iBpj1BN3yiLrNPFYrIi8j76W06UbZGyPrRKckyX4X8I1aGn8u3vkK9QpIl2ouU6hYUyuLoVlo_Gaj6C_OhhbQMVm6hXhlubGJ6Xh6MDibVuGn3muROp3ONlj5ek8fBE5lenQwAK2PhgldUxDyA6i4UowDq4KX_6htS8vnzmX8lgbPlJJ3okPsUG6J0QX_QrzyLZJM5fOHJX_3THI7wxSVQzHee0Bb1JCi4_zUlSg9ILxznECaIgEgper2lbGjnbWabdoM30Qq2-aIH8VDzGZQa49JoRSSbRInhvntmA';

request.post({
    url: `http://localhost:8081/transactions/returnOrder/start`,
    auth: { bearer: accessToken },
    body: {
        expires: moment().add(15, 'minutes').toISOString(),
        transactionId: '5a79524f7b4b4f127449b037'
    },
    json: true,
    simple: false,
    resolveWithFullResponse: true
}).then((response) => {
    console.log('response:', response.statusCode, response.body);

    request.post({
        url: `http://localhost:8081/transactions/returnOrder/${response.body.id}/confirm`,
        auth: { bearer: accessToken },
        body: {
        },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    }).then((response) => {
        console.log('response:', response.statusCode, response.body);
    }).catch((error) => {
        console.error(error);
    });
}).catch((error) => {
    console.error(error);
});
