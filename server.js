const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIo(server);

const rooms = require("./backend/roomManager");
const roomManager = new rooms.RoomManager();


/**
 * General architecture:
 * server.js handles connections and has no room or game logic
 * RoomManager handles unique identifier and room storage
 * Room is a log of people joining and leaving, class has no game logic and can be reused for various games
 * Game actually handles commands and logic. Basically, only front and and game know something about how game actually works
 *
 * Each game defines own command protocol
 * Rooms protocol:
 *
 * User can join with query parameters (roomIs, userName) or without
 * If there are no parameters - he can only create game
 *
 * room protocol:
 *
 * roomCommand
 *  {action:"create", userName, userId}, returns ("roomEvent", {event:"created", id:roomId, userId: user.id})
 *  {action:"join", userName, userId}, returns ("roomEvent", {event:"joined", id:roomId, userId: user.id})
 *  {action:"startGame"}, returns ("gameEvent", {event:"started", game: gameInfo})
 *
 */

app.use(express.static(__dirname + '/dist'));
server.listen(process.env.PORT || 8080);

io.on('connection', (socket) => {
  console.log("new connection");
  let roomId = socket.handshake.query.id;
  let room;
  let user;

  if(roomId){
    room = roomManager.findRoom(roomId);
    if(!room){
      console.warn("Can't find the room " + roomId);
      socket.emit("message", "Can't find the room " + roomId);
      socket.disconnect();
      return;
    }

    socket.join(roomId);
    user = room.join(socket.handshake.query.userName, socket.handshake.query.userId);
    socket.emit("roomEvent", {event:"joined", id:roomId, userId: user.id});
  }else{

  }

  // roomCommands interact with roomManager and room
  // TODO: move them inside the room and manager for unification
  socket.on('roomCommand', (data) =>{
    switch(data.action) {
      case 'create':
        // expects data.videoLink, data.userName, data.userId
        if(roomId){
          return; // Cannot create new room from here
        }
         // (hostName, videoLink, hostId, roomId)
        room = roomManager.createRoom(data.videoLink,
          (event, roomId)=>{
            io.to(roomId).emit('roomEvent', event);
          },
          (event, roomId)=>{
            io.to(roomId).emit('gameEvent', event);
          });
        roomId = room.id;

        user = room.join(data.userName, data.userId);

        socket.join(roomId);

        socket.emit("roomEvent", {event:"created", id:roomId, userId: user.id});
        // Ideally, this event would be triggered from inside the room code, but the user hasn't joined the game yet
        break;
      case 'join': // alternative join method
        if(!roomId){
          return; // Cannot create new room from here
        }
        socket.join(data.roomId);
        user = room.join(data.userName, data.userId);
        socket.emit("roomEvent", {event:"joined", id:roomId, userId: user.id});
        break;
      case 'startGame':
        if(!roomId){
          return; // Cannot create new room from here
        }
        room.startGame();
        break;
    }
  });

  // Game commands are transparently relayed into the game itself
  socket.on('gameCommand', (data) =>{
    if(!roomId){
      return; // No game commands without rooms!
    }
    room.gameCommand(data, user.id);
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
        io.to(roomId).emit('serverStatus', `Welcome to the server ${data.username}`);
        break;
      default:
        return;
    }
  });

  socket.on('message', (data) => {
    socket.broadcast.to(roomId).emit('message', data);
  });

  socket.on('disconnect', (reason) => {
    if(!roomId){
      return; // No room, so whatever
    }
    room.disconnect(user.id); //Let the room know that player left
  });
});
