
// Add a bunch of packages that you need
const express = require('express');
const fetch = require("node-fetch");
const app = express();
var sha512 = require('js-sha512');
const { response } = require('express');
const { sign } = require('crypto');

// Anything in the "globalpayments" folder will be served as static content in localhost
app.use(express.static('server')); 
app.use(express.json()); // adds a built-in JSON parser to Express
app.use(express.urlencoded({
    extended: true
}));



app.listen(8080, () =>{
    console.log("Running on port 8080");
})

// GP API details
// Configure .env file
require('dotenv').config()

let gpApiVersion = process.env.GP_API_VERSION
let app_id = process.env.GP_API_APP_ID
let app_key = process.env.GP_API_APP_KEY

let nonce = new Date().toISOString();

// API requests to GP API
const createSecret = (app_key, nonce) => {
    
    let secretKey = sha512(nonce + app_key)
    return secretKey

}

const getAccessToken = async() => {

    let headers ={
        "X-GP-Version": gpApiVersion,
        "Content-Type": "application/json"
    }

    let body = {
        "app_id":app_id,
        "secret": createSecret(app_key, nonce),
        "grant_type": "client_credentials",
        "nonce":nonce
    }

    let options = {
        method:"POST",
        body: JSON.stringify(body),
        headers:headers

    }

    const response = await fetch("https://apis.sandbox.globalpay.com/ucp/accesstoken", options);
    const json = await response.json()

    return json
}

const googlePayAuth = async(googlePayBlob) => {

    
   // console.log("Google Pay Token", googlePayBlob)

    let accessToken = await getAccessToken()

    let headers ={
        "X-GP-Version": gpApiVersion,
        "Content-Type": "application/json",
        "Accept" : "application/json",
        "Authorization" : "Bearer " + accessToken.token    
    }

    console.log("I'm here")
    let decodedBlob = JSON.parse(googlePayBlob, true)

    console.log(decodedBlob)

    let signature = decodedBlob.signature
    let protocolVersion = decodedBlob.protocolVersion
    let signedMessage = decodedBlob.signedMessage

    let body = {

        "account_name": "Transaction_Processing",
        "type": "SALE",
        "channel": "CNP",
        "capture_mode": "AUTO",
        "amount": "1999",
        "currency": "USD",
        "reference": "93459c78-f3f9-427c-84df-ca0584bb55bf",
        "country": "US",
        "ip_address": "123.123.123.123",
        "stored_credential": {
            "model": "UNSCHEDULED",
            "reason": "",
            "sequence": "SUBSEQUENT"
        },
        "initiator": "PAYER",
        "payment_method": {
          "name": "James Mason",
          "entry_mode": "ECOM",
          "digital_wallet": {
            "payment_token": {
                "signature": signature,
                "protocolVersion": protocolVersion,
                "signedMessage": signedMessage
            },
            "provider": "PAY_BY_GOOGLE"
            }
        }
    }

    let options = {
        method:"POST",
        body: JSON.stringify(body),
        headers:headers

    }

    const response = await fetch("https://apis.sandbox.globalpay.com/ucp/transactions", options);
    const json = await response.json()

    return json
}


// POST routes

app.get('/api/accessToken', async (request, response) => {

    // define a function to get Access Token
    let accessToken = await getAccessToken()
    response.send(accessToken)

})


app.post('/api/googlePayAuth', async (request, response) => {
    
    const data = request.body

    try {

    let response = await googlePayAuth(data.paymentMethodData.tokenizationData.token)
    console.log(response)
    response.send(response)
        
    } 
    catch (error) {
        response.send(error)
    }    
})