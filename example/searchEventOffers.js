
const request = require("request-promise-native");

const accessToken = 'eyJraWQiOiJ0M1pHMUs1cG1xNHg3dms5QkRLMDNaeUJJN091VDlOcHV1WGxIOThQc29RPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxdjlrcmZ0Y2FoYnNxM2wwc2RjbXA5ZHRxZyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiaHR0cHM6XC9cL2t3c2tmcy1hcGktZGV2ZWxvcG1lbnQuYXp1cmV3ZWJzaXRlcy5uZXRcL29yZ2FuaXphdGlvbnMucmVhZC1vbmx5IGh0dHBzOlwvXC9rd3NrZnMtYXBpLWRldmVsb3BtZW50LmF6dXJld2Vic2l0ZXMubmV0XC9hZG1pbiIsImF1dGhfdGltZSI6MTUyNTY3MTc5MCwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLW5vcnRoZWFzdC0xXzZMY3ZlMFNxVyIsImV4cCI6MTUyNTY3NTM5MCwiaWF0IjoxNTI1NjcxNzkwLCJ2ZXJzaW9uIjoyLCJqdGkiOiJjMmRmZmFmZC03OGNlLTQ4OWUtYjM1Yi0xYTE0NDIzNDQ1ZWUiLCJjbGllbnRfaWQiOiIxdjlrcmZ0Y2FoYnNxM2wwc2RjbXA5ZHRxZyJ9.bzegrAd9riBO6rCmTuZgk_yBVIn0-HeQ9xoOt5OYTY-QIayf1pVj7yqviS3GikVz5jlMRrWN2xeyxu13HHSdTUasl033mAx6El0zMqNQaJy-rYDRrIkGK5Qq31LI4YLLicB80Nnic5XwajIhEexVbjynNyqxUZzTyxpTHibRfBrwBDnr2EmsDr-MhJX8RElzsVvSiMT8F7LgO1-Loa8DU6-OrFM0w6jgAxB9BZJuamaMAonJ8fT5lK_xmoCqB1gnpGXvjDkh3sN0z0xygcMEHr4UDbDpKPEHC5IR-6iobN8rPLEvcZVI5X9XF6-uiIhVV9Y8fHbFgXrAfk82nVnctQ';

async function main() {
    let response = await request.get({
        url: `http://localhost:8081/events/FoodEvent/FoodEvent-pearlbowl-40th-frontiers-seagulls/offers`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    console.log('response:', response.statusCode, response.body);
    let restaurant = response.body[0];
    let menuItem = restaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    let offer = menuItem.offers[0];
    console.log('offer:', offer);

    response = await request.put({
        url: `http://localhost:8081/events/FoodEvent/FoodEvent-pearlbowl-40th-frontiers-seagulls/offers/${restaurant.id}/menuItem/${menuItem.identifier}/${offer.identifier}/availability/InStock`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    console.log('response:', response.statusCode, response.body);

    response = await request.get({
        url: `http://localhost:8081/events/FoodEvent/FoodEvent-pearlbowl-40th-frontiers-seagulls/offers`,
        auth: { bearer: accessToken },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    restaurant = response.body[0];
    menuItem = restaurant.hasMenu[0].hasMenuSection[0].hasMenuItem[0];
    offer = menuItem.offers[0];
    console.log('offer:', offer);
}

main().then(() => {
    console.log('success!');
}).catch(console.error)