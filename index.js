const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const isoDateRegex = new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}');
const jsonPath = './session.json';

const client = new Client({ puppeteer: { headless: false  }, authStrategy: new LocalAuth()});

let data = {};


if (fs.existsSync(jsonPath)) {
    try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'), (key, value) => { if (typeof value === "string" && isoDateRegex.exec(value)) { return new Date(value); } });} catch(err) {
        console.log(err);
    }
} else {
    console.log('but why tho')
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
});

client.on('message', async msg => {
    try {
        if (msg.body === '!ping') {
            await msg.reply('pong');
        }
        
    } catch (err) {
        console.log(err)
    }
});