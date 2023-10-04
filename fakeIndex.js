const { testResponse } = require('./utils.js')
const prompt = require("prompt-sync")();

while (true) {
var x = prompt("Please enter a message: ");
testResponse(x);
}
