const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIo(server);

const rooms = require("./backend/roomManager");
const roomManager = new rooms.RoomManager();


app.use(express.static(__dirname + '/dist'));
server.listen(process.env.PORT || 8080);

io.on('connection', (socket) => {
  let roomId = socket.handshake.query.id;
  let room;

  if(roomId){
    room = roomManager.findRoom(roomId);
    if(!room){
      socket.emit("message", "Can't find the room");
      socket.disconnect();
      return;
    }
  }else{

  }

  socket.on('roomCommand', (data) =>{
    switch(data.action) {
      case 'create':
        // expects data.videoLink, data.userName, data.userId
        if(roomId){
          return; // Cannot create new room from here
        }
         // (hostName, videoLink, hostId, roomId)
        room = roomManager.createRoom(data.videoLink);
        roomId = room.id;

        room.join(data.userName, data.userId);
        socket.join(roomId);
        break;
    }
  });



  // find shared game room object
  // recieve the name from the user
  // join the game room using the name

  socket.join(roomId);
  socket.to(roomId).emit('serverStatus', 'Welcome to ' + roomId);

  socket.on('server', (data) =>{
    switch(data.action) {
      case 'usernameSet':
        socket.broadcast.to(roomId).emit('serverStatus', `${data.username} has joined the server`);
        socket.to(roomId).emit('serverStatus', `Welcome to the server ${data.username}`);
        break;
      default:
        return;
    }
  });

  socket.on('message', (data) => {
    socket.broadcast.to(roomId).emit('message', data);
  });

  socket.on('disconnect', (reason) => {
    // ...
  });
});
