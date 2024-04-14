const Users= require("../model/model");
const io = require("../server");
const client = require("../Redis/Redis_Client");
require('dotenv').config();

const { default: axios } = require("axios");
async function joinRoom(socket,io){
    console.log("room-join");
    const mapKey= `room:users`;
    const username = socket.username;
    await client.hset(mapKey,username, socket.id);
    socket.join("room1");
    io.to("room1").emit("user-joined",socket.username);
    socket.emit("room-connected");
}


async function msgRecieve(socket,msg,io){
    // const timestamp=Date.now();
    // const message=msg;
    // const listKey= `room1:${socket.username}`;
    // const Expiration_time= 60*15;
    // await client.multi().rpush(listKey,msg).zadd(`${listKey}:timestamps`,timestamp,message).expire(`${listKey}:timestamps`,Expiration_time).exec();

    await io.to("room1").emit("room-msg",{username:socket.username,content:msg});
}

async function userList(){
    const cache = await client.hkeys("room:users");
    console.log(cache);
    if(cache) return cache;
    
    const list=await Users.find({roomConnect:true});
    
    const out=[];
    list.forEach(user => {
        client.hset("room:users",user.username,user.userid);
        out.push(user.username);
    });

    return out;
}

async function fetchChat(user,socket,io){
   const entry = await Users.findOne({userid:socket.id});
   const found = entry.chatLog.find(us=>us.name==user);
   console.log('call ayi');
   if(found){
    
   console.log(found.chat);
    return found.chat;
   }
   else{
    const Chat= entry.chatLog.push({name:user,chat:[]});
   await Users.findOneAndUpdate({userid:socket.id},{chatLog:Chat});
   return [];
   }
   

}

async function sendMessage(io,socket, data){
    const entry= await Users.findOne({username:data.sendto});
    const e1= await Users.findOne({userid:socket.id});
    
    if(!entry){
        console.log("ms");
        socket.emit("user-disconnected");
        return
    }
    else{
        const chatse1=e1.chatLog;
        const chats= entry.chatLog;
       const found= chats.find(us=>us.name==e1.username);

       if(found){
        const index = chats.findIndex(us=>us.name==e1.username);
        console.log(chats[index]);
        if (data.url){
            chats[index].chat.push({sender:e1.username,content:data.msg,image:true});
        }
        else{
        chats[index].chat.push({sender:e1.username,content:data.msg,image:false});}
        await Users.findOneAndUpdate({username:data.sendto},{chatLog:chats});
       }
       else{
        const chat=[];
        if(data.url){
            chat.push({sender:e1.username,content:data.msg,image:true});
        }
        else{
        chat.push({sender:e1.username,content:data.msg,image:false});}
        chats.push({name:e1.username,chat});
        await Users.findOneAndUpdate({username:data.sendto},{chatLog:chats});
       }

       const founde1= chatse1.find(us=>us.name==data.sendto);
       if(founde1){
        const index = chatse1.findIndex(us=>us.name==data.sendto);
        console.log("same ", chatse1[index]);   
        if(data.url){
            chatse1[index].chat.push({sender:e1.username,content:data.msg,image:true});
        }
        else{
        chatse1[index].chat.push({sender:e1.username,content:data.msg,image:false});}
        await Users.findOneAndUpdate({userid:socket.id},{chatLog:chatse1});
       }
       else{
        const chat=[];
        if(data.url){
            chat.push({sender:e1.username,content:data.msg,image:true});
        }
        else{
        chat.push({sender:e1.username,content:data.msg,image:false});}
        chatse1.push({name:data.sendto,chat:chat});
        await Users.findOneAndUpdate({userid:socket.id},{chatLog:chatse1});
       }
       console.log("msg");
       const sock=io.sockets.sockets.get(entry.userid);
       sock.emit("new-message",e1.username);


    }
}


async function closeChat(data,socket,io){

   const entry =await Users.find({userid:socket.id});
   console.log(entry);
    const index=await entry[0].chatLog.findIndex(us=>us.name==data);
    entry[0].chatLog.splice(index,1);

    await Users.findOneAndUpdate({userid:socket.id},{chatLog:entry[0].chatLog});
}

async function roomUserUpdate(userid1){
    await Users.findOneAndUpdate({userid:userid1},{inQueue:false, userConnectedTo:null, roomConnect:true}).then(console.log("room-updated"));
  }


async function removeUser(username){
    try{
        await client.hdel("room:users",username);
    }
    catch(err){
        throw error;
    }

    

}

const handleimageSendRoom=async(data)=>{
    const imageData=data.msg;
    const base64ImageData = imageData.toString('base64');
    const formData= new FormData();
    formData.append("image",base64ImageData);
    formData.append("key",process.env.IMAGE_UPLOAD_API_KEY);
    formData.append("expiration",60*10);
   

    try{
        

        
    const response= await axios.post('https://api.imgbb.com/1/upload',formData);
        
        const url = response.data.data.url;
        return url;
        
    }
    catch(err){
        console.log('error: ',err);
    }
    

}


module.exports={joinRoom, handleimageSendRoom, msgRecieve, userList, fetchChat, sendMessage, closeChat , roomUserUpdate, removeUser};
