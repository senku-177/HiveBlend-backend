const client = require('./Redis_Client');

async function init(){
    const result = await client.get("User:3");
    console.log("Result->",result);
}

init();