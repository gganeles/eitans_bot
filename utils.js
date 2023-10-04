const chrono = require('chrono-node');


async function respond(msg, data) {
    //access this contacts state, or create data if it doesn't exist
    const contact = await msg.getContact();

    const phone = contact.id.user
    if (data[phone]==undefined) {
        data[phone] = {states:[],tmp:{},defaults:{}};
    }
    let stateList=data[phone]['states'];
    let user_data=data[phone]
    //prepare message
    const message = msg.body.trim()

    //initialize what will be pitched
    let pitch = ''
    //decide how each state gets handled
    if (message.match(/cancel/gi)){
        data[phone]['states'] = []
        data[phone]['events'] = []
        for (i in data['events']) {
            if (data['events'][i].timedMessage.chat.match(new RegExp(phone))){
                data['events'].splice(i,1)
            }
        };
        msg.reply('Your order has been cancelled. To start a new order, text anything.')
        return
    }
    if (message.match(/penisparty/gi)){
        msg.reply(list_orders(data))
    }
    if (stateList.length == 0) {
        pitch = 'pay'
        stateList.push('pay');
    } else if (stateList.includes('change')){
        let flag = true
        if (stateList.includes('pay')) {
            flag = payment(msg,message,user_data)
        } else if (stateList.includes('address')){
            detail(message,user_data,'address')
        } else if (stateList.includes('hours') ){
            detail(message,user_data,'hours')
        } else if (stateList.includes('date')){
            flag = pref_date(msg,message,user_data)
        } else if (stateList.includes('laundry')){
            detail(message,user_data,'laundry')
        } else if (stateList.includes('notes')){
            detail(message,user_data,'notes')
        }
        if (flag) {
            remove_from_list(stateList,'change')
            pitch = 'details'
            stateList.push('details')
        }
    } else if (stateList.includes('pay')){
        if (payment(msg, message, user_data)){
            pitch = 'address'
            stateList.push('address');
        }
    } else if (stateList.includes('address')){
        detail(message, user_data, 'address')
        pitch = 'hours'
        stateList.push('hours')
    } else if (stateList.includes('hours')){
        if (message.match(/\d/gi)) {
            detail(message, user_data, 'hours')
            pitch = 'date'
            stateList.push('date')
        } else {
            msg.reply('Sorry, I didn\'t understand. Please enter a number.')
        }
    } else if (stateList.includes('date')){
        if (pref_date(msg, message, user_data)){
            stateList.push('laundry')
            pitch = 'laundry'
        }
    } else if (stateList.includes('laundry')){
        detail(message,user_data,'laundry')
        pitch = 'notes'
        stateList.push('notes')
    } else if (stateList.includes('notes')){
        detail(message,user_data,'notes');
        pitch = 'details'
        stateList.push('details');
    } else if (stateList.includes('ready')){
        msg.reply('If you would like to order again, type "start"')
        if (message.match(/start/gi)) {
            msg.reply('If you would like to use your details from last time, type "last". Otherwise, type "new"')
            data[phone]['states'] = ['restart']
        }
    } else if (stateList.includes('restart')){
        if (message.match(/last/gi)) {
            user_data['tmp'] = user_data['defaults']
            stateList.push('date','change')
            pitch = 'date'
        } else if (message.match(/new/gi)) {
            user_data['tmp'] = {}
            stateList.push('pay')
            pitch = 'pay'
        }
    }  else if (stateList.includes('details')){

        if (message.match(/ready/gi)) {
            data['events'].push({details: {...user_data['tmp']}, timedMessage: new timedMsg('We will clean soon', user_data['tmp']['date'],phone+'@c.us')})
            user_data['defaults'] = user_data['tmp']
            remove_from_list(stateList,'details')
            pitch = 'ready'
            stateList.push('ready')
        } else if (parseInt(message)!=NaN) {
            remove_from_list(stateList,'details')
            stateList.push('change')
            switch (parseInt(message)) {
                case 1:
                    pitch = 'pay'
                    stateList.push('pay');
                    break;
                case 2:
                    pitch = 'address'
                    stateList.push('address');
                    break;
                case 3:
                    pitch = 'hours'
                    stateList.push('hours');
                    break;
                case 4:
                    pitch = 'date'
                    stateList.push('date');
                    break;
                case 5:
                    pitch = 'laundry'
                    stateList.push('laundry');
                    break;
                case 6:
                    pitch = 'notes'
                    stateList.push('notes');
            }
        }
    } 
    switch (pitch) {
        case 'pay':
            msg.reply(`Hello there! 🧹🏢 We're excited to getting your room brand spanking fresh. 
            To start, how would you like to pay today?
             - Cash 💵 
             - PayPal📲`);
            break;
        case 'address':
            msg.reply(`What is your building name and room number?`);
            break;
        case 'hours':
            msg.reply(`Cost: Our cleaning service is priced at 90 NIS per hour.
We have a minimum of 3 cleaning hours but recommend 4 for superior results🫧
Please indicate how many hours are needed:`)
            break;
        case 'date':
            msg.reply(`What is your preferred date and time (We'll do our best to accommodate your preferred time slot):`)
            break;
        case 'laundry':
            msg.reply(`Would you like us to wash and dry your dirty laundry and/ or sheets? 👖👗🛏 (please note an additional 20 NIS will be added for this service)`)
            break;
        case 'notes':
            msg.reply(`Do you have any specific areas or tasks you'd like us to focus on during the cleaning?🧹🧽`)
            break;
        case 'details':
            msg.reply(list_details(user_data))
            break;
        case 'ready':
            msg.reply(`Ok! Your order has been recorded. To cancel, text "cancel".
We do not accept cancellations 48 hours prior to the cleaning, the full amount will be due in this case.

Your responses will help us tailor the service to your needs. If you have any questions or special requests, don't hesitate to ask! 😊`)
    }
    console.log(data)
}

function payment(msg, message, user_data) {
    const choice = message.match(/cash|paypal/gi)
    if (choice) {
        user_data['tmp']['payment'] = choice.at(0)
        remove_from_list(user_data['states'], 'pay')
        return true
    } else {
        msg.reply('Sorry, I didn\'t understand. Please type "cash" or "paypal"')
        return false
    }
}

function pref_date(msg, message, user_data) {
    const now = new Date()
    const x = chrono.parse(message, now, {forwardDate: true}).at(0)
    if (x) {
        detail(x.date(), user_data, 'date')
        return true
    } else {
        msg.reply(`Sorry, I didn't understand. Please rephrase your date`)
        return false
    }
}

function detail(message, user_data, detail_type){
    user_data['tmp'][detail_type] = message
    remove_from_list(user_data['states'], detail_type)
}

function remove_from_list(list, item) {
    list.splice(list.find(element=>element==item),1)

}

function list_details(user_data){
    let messageContent = 'Ok! Your details are:\n\n';
    for (let [index, [key, value]] of Object.entries(user_data['tmp']).entries()) {
        messageContent += (index + 1) + ') ' + key + ': ' + value + '\n';
    }
    messageContent+=`\nIf this looks right to you, text "ready".
If you would like to change any details, please type the number of what you would like to change:`
    return messageContent;
}

function list_orders(data){
    let messageContent = 'The outstanding orders are:\n\n';
        for (let order of data['events']) {
            messageContent += JSON.stringify(order['details']) + '\n';
        }
    return messageContent;
}

data_test = {timed:[]}

class testMsg {
    constructor(body='') {
        this.from = '972587120601@c.us'
        this.body = body
    }

    reply(text) {
        console.log("\nReply:\n", text)
    }

    getContact() {
        return {id: {user: '972587120601'}}
    }
}


class timedMsg {
    constructor(message, time, chat) {
        this.message = message
        this.time = time
        this.chat = chat
    }

    send(client) {
        client.sendMessage(this.chat,this.message)
        console.log('sending message')
    }

    tick(date,client) {
        if (date >= this.time) {
            this.send(client)
            return true
        } else {
            return false
        }
    }
}

function ticker(client,data) {
    const now = new Date()
    for (i in data['events']){
        console.log(data['events'][i])
        if (data['events'][i].timedMessage.tick(now,client)) {
            data['events'].splice(i,1)
        }
    }
}

function testResponse(input=''){
    respond(new testMsg(input),data_test)
 //   console.log(data_test)
}


    // testResponse('start')
    // testResponse('banki')
    // testResponse('cash')
    // testResponse('1234 madison ave')
    // testResponse('4')
    // testResponse('garbledy barbeldy')
    // testResponse('tuesday')
    // testResponse('nah')
    // testResponse('nothing')
    // testResponse('3')
    // console.log(data_test)
    // testResponse('ready')
    // testResponse('ready')


module.exports = {respond, ticker, testResponse, timedMsg}