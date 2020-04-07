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
 * for _MORE_ room events look inside room.js
 * for game actions and events look inside mafia.js
 *
 *
 * directMessages - send directly to user, always have:
 *    ("directMessage", {event:..., data:...})
 *    Check room and game for specific direct messages
 *
 * userId is optional for now and assumed to be equal to userName
 *
 * TODO: implement some kind of more or less secure user identification (probably requires authentication)
 */

app.use(express.static(__dirname + '/dist'));
server.listen(process.env.PORT || 8080);

function joinRoom(socket, roomId, userName, userId){
  let room = roomManager.findRoom(roomId);

  if(!room){
    console.warn("Can't find the room " + roomId);
    socket.emit("message", "Can't find the room " + roomId);
    socket.disconnect();
    return;
  }

  socket.join(roomId);
  socket.join(roomId + "_" + userId); // This is a private channel for this user

  let user = room.join(socket.handshake.query.userName, socket.handshake.query.userId);
  socket.emit("roomEvent", {event:"joined", id:roomId, userId: user.id});

  return {room:room, user:user};
}

function directMessage(roomId, userId, eventName, eventData){
  io.to(roomId + "_" + userId).emit("directMessage", {event:eventName, data:eventData});
}

io.on('connection', (socket) => {
  console.log("new connection");
  let roomId = socket.handshake.query.id;
  let room;
  let user;

  if(roomId){
    joinRoom(socket, roomId, socket.handshake.query.userName, socket.handshake.query.userId);
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
    console.debug("roomCommand " + data.action);
    switch(data.action) {
      case 'create':
        // expects data.videoLink, data.userName, data.userId
        if(roomId){
          console.warn("User already in the room " + roomId);
          socket.emit("message", "You are already in the room " + roomId);
          return; // Cannot create new room from here
        }
         // (hostName, videoLink, hostId, roomId)
        room = roomManager.createRoom(data.videoLink,
          (event, roomId)=>{
            io.to(roomId).emit('roomEvent', event);
          },
          (event, roomId)=>{
            io.to(roomId).emit('gameEvent', event);
          },
          (userId, eventName, eventData) => {
            directMessage(roomId, userId, eventName, eventData)
          });
        roomId = room.id;

        user = room.join(data.userName, data.userId);

        socket.join(roomId);

        socket.emit("roomEvent", {event:"created", id:roomId, userId: user.id});
        // Ideally, this event would be triggered from inside the room code, but the user hasn't joined the game yet
        break;
      case 'join': // alternative join method
        if(roomId){
          console.warn("User already in the room " + roomId);
          socket.emit("message", "You are already in the room " + roomId);
          return; // Cannot create new room from here
        }
        roomId = data.roomId;

        joinRoom(socket, roomId, data.userName, data.userId);
        break;
      case 'startGame':
        if(!roomId){
          console.warn("No room to start game in");
          socket.emit("message", "You are not in the room");
          return;
        }
        room.startGame();
        socket.emit("roomEvent", { event: "start"});
        io.to(roomId).emit('serverStatus', `Game is starting`);
        break;
    }
  });

  // Game commands are transparently relayed into the game itself
  socket.on('gameCommand', (data) =>{
    console.debug("gameCommand " + data.action);
    if(!roomId){
      console.warn("No room to send game command to");
      socket.emit("message", "You are not in the room");
      return; // No game commands without rooms!
    }
    room.gameCommand(data, user.id);
  });

  // find shared game room object
  // recieve the name from the user
  // join the game room using the name

  socket.on('server', (data) =>{
    switch(data.action) {
      case 'setUserName':
        socket.broadcast.to(roomId).emit('serverStatus', `${data.username} has joined the server`);
        io.to(roomId).emit('serverStatus', `Welcome to the server ${data.username}`);
        break;
      default:
        return;
    }
  });

  socket.on('message', (data) => {
    if(roomId){
      io.to(roomId).emit('message', data);
    }else{
      socket.broadcast.emit('message', data);
    }
  });

  socket.on('disconnect', (reason) => {
    if(!roomId){
      return; // No room, so whatever
    }
    room.disconnect(user.id); //Let the room know that player left
    socket.emit("roomEvent", {event:"disconnected", user: user.userName});
  });
});
