const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const {ticker, respond, timedMsg} = require('./utils.js')
const qrcode = require('qrcode-terminal');

const isoDateRegex = new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}');
const jsonPath = './session.json';

const client = new Client({ puppeteer: {args: ['--no-sandbox'], headless: true }, authStrategy: new LocalAuth(), clientId: '12038025238@c.us'});

var data = {events:[]};

if (fs.existsSync(jsonPath)) {
    try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'), (key, value) => { if (typeof value === "string" && isoDateRegex.exec(value)) { return new Date(value); } else if (key ==='timedList') {
        let transformedTimedList = {}
        for (const [key0,i] of Object.entries(value)) {
            transformedTimedList[key0] = new timedMsg(i.message,i.time,i.chat);
        }
        return transformedTimedList
        } return value; });
        console.log('database loaded')
        console.log(data)
    } catch(err) {
        console.log(err);
    }
} else {
    console.log('but why tho')
}


function record(arr,jsonPath) {
    fs.writeFile(jsonPath, JSON.stringify(arr), (err) => {
        if (err) {
            console.log(err);
        }
        console.log('the database has been updated')
    });
}

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});


client.on('ready', () => {
    console.log('\x1b[32m%s\x1b[0m', 'READY');
    console.log(`Logged in as ${client.info.pushname} (${client.info.wid._serialized})`);
    setInterval(ticker, 1000*5, client, data);

})

//

client.on('message', async msg => {
    //msg.reply('Hello');
    try {
        respond(msg,data)
        record(data,jsonPath)
    } catch (err) {
        console.log(err)
    }
});

client.initialize();

module.exports = {jsonPath, record}