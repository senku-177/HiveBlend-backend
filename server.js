const http = require('http');
const express = require('express');
const cors=require('cors');
const path = require('path');
const {Server} = require('socket.io');
require('dotenv').config();
const {connectDatabase} = require('./connections/Database');
const{connectedMap,createTimeout} = require('./connections/serverTimedOut');
const Users = require('./model/model');
const {joinRoom,handleimageSendRoom, userList, msgRecieve,fetchChat, sendMessage, closeChat,roomUserUpdate, removeUser} = require("./connections/room");

const mongoUrl= process.env.MONGO_URL;

connectDatabase(mongoUrl).then(()=>{console.log("mongo server running")}).catch(()=>{console.log("server m dikkat")});

const app = express();
const corsOptions = {
  origin: ['https://hive-blend.vercel.app'], // Allow only this origin
  methods: ["GET", "POST"], // Allow GET and POST requests
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://hive-blend.vercel.app", // Allow these origins for socket.io
    methods: ["GET", "POST"], // Allow GET and POST requests
  },
});

server.listen(9000, () => {
  console.log("Server is running on port 9000");
});



  
io.use((socket, next) => {
    console.log("midware called");
    const username = socket.handshake.auth.username;
    if (!username) {
    
      return next(new Error("invalid username"));
    }
    socket.username = username;

    connectedMap[socket.id]= Date.now();
    
    next();
  });



  io.on("connection", async (socket) => {
    
    const timeout=createTimeout(socket);


    const username = socket.username;
    const mys= io.sockets.sockets.get(socket.id);
    console.log(mys.id);
    console.log("new user connected", username);
  
    try {
      const entry = await Users.create({
        userid: socket.id,
        username: socket.username,
        inQueue:true,
        roomConnect:false,
      });
      console.log("entry is", entry);
    } catch (error) {
      console.error("Promise failed:", error);
    }

    socket.on("createChatRoom",matching); 

    socket.on('break',async(id)=>{
      if(id){
        console.log(id);
        const U1socket= io.sockets.sockets.get(id);
        await DisconnectCurrentChat(U1socket.id);
        U1socket.emit("break");
        
     }

      await DisconnectCurrentChat(socket.id);

     
    });


    socket.on('rematch',async()=>{
      await matching();
    });

    socket.on("message",async(data)=>{

      User2=io.sockets.sockets.get(data.toId);
      User2.emit("private-message",{message:data.Message});
      console.log(data.Message);

      
    });
    

    socket.on("connect-room", (callback) => {
      console.log("room connected");
      joinRoom(socket, io);
      roomUserUpdate(socket.id);
      callback({ status: 'success', message: 'Room connected successfully' });
    });

    
    socket.on("room-message",async(data)=>{
      await msgRecieve(socket,data.msg,io);
    })

    socket.on("room-message-image",async(data)=>{
      console.log("image called");
      const url =await handleimageSendRoom(data);
      io.to("room1").emit("room-msg",{username:socket.username,content:url,image:true});

    })

    socket.on("private-message-image",async(data)=>{
     const url= await handleimageSendRoom(data);
      data.msg=url;
      data.url=url;
      console.log("image called",url);
      console.log(data.url);
      await sendMessage(io,socket,data);
    })
    socket.on("user-list",async()=>{
      list = await userList();
      socket.emit("user-list",list);
    })

    socket.on("userChat",async (user)=>{
      const chat= await fetchChat(user,socket,io);   
      socket.emit("userChat",chat);
    });

    socket.on("private-message",async (data)=>{
      console.log("call");
      await sendMessage(io,socket,data);
    })

    socket.on("close-chat",async(data)=>{
      await closeChat(data,socket,io);
    })
    socket.on('disconnect',async ()=>{
        clearTimeout(timeout);
        
        entry=await Users.findOne({userid:socket.id});  
        

        if(entry.userConnectedTo){
          console.log("kiski call ayi");
          console.log(entry.userConnectedTo);
          const user1=io.sockets.sockets.get(entry.userConnectedTo);
          
          await DisconnectCurrentChat(user1);

          user1.emit("break");
        }

        removeUser(socket.username);
        console.log("user disconnected",socket.username);
        io.to("room1").emit("user-left",socket.username);
        await Users.deleteOne({userid:socket.id}).then(()=>{console.log("entry deleted")});


    })


  });


  


  async function matching(){
    console.log("matching called");

    const userQueue = await Users.find({inQueue:true});
    console.log(userQueue);
    if(userQueue.length>=2){
      console.log("in loop");
      console.log(userQueue.length);

      let user1;
      let user2;
      if(userQueue.length==2){
        user1=userQueue[0];
         user2= userQueue[1];
      }
      else{
         user1=userQueue[Math.floor(Math.random()*(userQueue.length))];
         user2= userQueue[Math.floor(Math.random()*(userQueue.length))];
      }
        

        while(user1===user2){
            user2=userQueue[Math.floor(Math.random()*(userQueue.length))];

        }

        console.log(user1);
        console.log(user2); 
    
        
    // const chatRoomId=Math.random().toString(36).substring(2, 13);
    // const chatRoom= io.of('/chatRooms').to(chatRoomId);
    console.log(user1.userid);
    const U1socket= io.sockets.sockets.get(user1.userid);


    const U2socket= io.sockets.sockets.get(user2.userid);
    console.log(U1socket.id);
    console.log(U2socket.id);
    // U1socket.join(chatRoomId);
    // U2socket.join(chatRoomId);

  //   chatRoom.emit('connected', {
  //     user1: user1.username,
  //     user2: user2.username,
  // });
    updateQueueAndConnectedUser(user1.userid,user2.userid);
    updateQueueAndConnectedUser(user2.userid,user1.userid);
    // console.log(chatRoomId);
    U1socket.emit("matchSuccess",{success:true, connectedTo:user2.userid, toUsername:user2.username});
    
    U2socket.emit("matchSuccess",{success:true, connectedTo:user1.userid, toUsername:user1.username});
        

    
    // chatRoom.on('message', (messageData) => {
    //     console.log("message by",messageData)
    //     chatRoom.emit('message', messageData.Message); // Broadcast message to both users
    //   });
    // }
    // socket.on('disconnect',(socket)=>{
    //   console.log(socket," got disconnected");
    // })
      }



}


  async function updateQueueAndConnectedUser(userid1,userid2){

   await Users.findOneAndUpdate({userid:userid1},{inQueue:false, userConnectedTo:userid2},null,).then(console.log("updated"));

  }

  async function DisconnectCurrentChat(user){

    await Users.findOneAndUpdate({userid:user.id},{inQueue:true,
                                                userConnectedTo:null},null).then(console.log("disconnected"));


  }





module.exports= io;