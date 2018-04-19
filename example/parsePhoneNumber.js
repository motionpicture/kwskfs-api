const readline = require('readline');
// Require `PhoneNumberFormat`. 
const PNF = require('google-libphonenumber').PhoneNumberFormat;


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('enter a phone number:\n', (inputPhoneNumber) => {
    // Get an instance of `PhoneNumberUtil`. 
    const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

    // Parse number with country code. 
    let phoneNumber = phoneUtil.parse(inputPhoneNumber, 'JP');
    console.log('isValidNumber:', phoneUtil.isValidNumber(phoneNumber));

    // Print number in the international format. 
    console.log(phoneUtil.format(phoneNumber, PNF.E164));
    // console.log(phoneUtil.format(phoneNumber, PNF.RFC3966));

    phoneNumber = phoneUtil.parse(phoneUtil.format(phoneNumber, PNF.E164), 'JP');
    console.log('NATIONAL:', phoneUtil.format(phoneNumber, PNF.NATIONAL));
    console.log('RFC3966:', phoneUtil.format(phoneNumber, PNF.RFC3966));
    // console.log(phoneNumber);
    console.log('getNationalNumber:', phoneNumber.getNationalNumber());
    console.log('getNationalNumberOrDefault:', phoneNumber.getNationalNumberOrDefault());
    console.log('getExtension:', phoneNumber.getExtension());
    // console.log('getNumberOfLeadingZeros:', phoneNumber.getNumberOfLeadingZerosOrDefault());
});
