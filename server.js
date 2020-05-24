const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIo(server);

const rooms = require("./backend/roomManager");
const roomManager = new rooms.RoomManager();

const wakeUp = require('wakeUp.js');
const HOST_URL = 'http://zoom-mafia.herokuapp.com/';
const TIMER = 25 * 60 * 1000;

const TRY_RECREATE_ROOMS = true; // Trying to recreate rooms with unknown id. Lets user create their custom room names

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
 *  {action:"kick", targetId, hard} - kick the player (only done by host), If hard is not true - only offline user can be kicked
 *  {action:"leave"} - permanently leave the room
 *
 * roomEvent
 *   joined - you have joined the room
 *   created - you have created the room
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
app.get('*', function (req, res) {
  res.sendFile(__dirname + '/dist/index.html');
});

app.get('/:roomId', function (req, res) {
  res.sendFile(__dirname + '/dist/index.html');
});

server.listen(process.env.PORT || 8080, () => {
  wakeUp(HOST_URL, TIMER);
});

function createRoom(socket, userId, videoLink="", forceRoomId = null){
     // (hostName, videoLink, hostId, roomId)
    let room = roomManager.createRoom(videoLink, forceRoomId,
      (event, roomId)=>{
        console.debug("roomEvent " + event.event /*JSON.stringify(event, null, 2)*/);
        io.to(roomId).emit('roomEvent', event);
      },
      (event, roomId)=>{
        console.debug("gameEvent " + event.event /*JSON.stringify(event, null, 2)*/);
        io.to(roomId).emit('gameEvent', event);
      },
      (roomId, userId, eventName, eventData) => {
        if(!userId) {
          console.error("sending direct message to a not joined user");
          return;
        }
        directMessage(roomId, userId, eventName, eventData)
      });
    socket.emit("roomEvent", {event:"created", id:room.id, userId: userId});
    return room;
}

function joinRoom(socket, roomId, userName, userId){
  console.log("joinRoom", roomId, userName, userId);
  let room = roomManager.findRoom(roomId);

  if(!room && TRY_RECREATE_ROOMS) {
    console.warn("Recreate room " + roomId);
    room = createRoom(socket, userId, "", roomId);
  }
  if(!room){
    console.warn("Can't find the room " + roomId);
    socket.emit("message", "Can't find the room " + roomId);
    socket.disconnect();
    return null;
  }

  socket.join(roomId);
  socket.join(roomId + "_" + userId); // This is a private channel for this user

  let user = room.join(userName, userId);
  socket.emit("roomEvent", {event:"joined", id:roomId, userId: user.id});

  return {room:room, user:user};
}

function directMessage(roomId, userId, eventName, eventData){
  // console.debug("directMessage to " + userId + " at " + roomId +": " + JSON.stringify({event:eventName, data:eventData}, null, 2));
  io.to(roomId + "_" + userId).emit("directMessage", {event:eventName, data:eventData});
}

io.on('connection', (socket) => {
  console.debug("new connection");
  let roomId = socket.handshake.query.id;
  let room;
  let user;

  if(roomId){
    let result = joinRoom(socket, roomId, socket.handshake.query.userName, socket.handshake.query.userId);
    if(!result){
      return;
    }
    room = result.room;
    user = result.user;
  }

  // roomCommands interact with roomManager and room
  // TODO: move them inside the room and manager for unification
  socket.on('roomCommand', (data) =>{
    console.debug((user?user.name:'') + " >> roomCommand " + JSON.stringify(data));

    switch(data.action) {
      case 'create':
        // expects data.videoLink, data.userName, data.userId
        if(roomId){
          console.warn("User already in the room " + roomId);
          socket.emit("message", "You are already in the room " + roomId);
          return; // Cannot create new room from here
        }
        if(!data.userId){
          console.warn("User didn't send a name");
          socket.emit("message", "You didn't send a name");
          return; // Cannot create new room from here
        }
        room = createRoom(socket, data.userId, data.videoLink);
        roomId = room.id;
        // Ideally, this event would be triggered from inside the room code, but the user hasn't joined the game yet

        let roomAndUser = joinRoom(socket, roomId, data.userName, data.userId);
        if(!roomAndUser){
          return;
        }
        user = roomAndUser.user;
        break;
      case 'join': // alternative join method
        if(roomId){
          console.warn("User already in the room " + roomId);
          socket.emit("message", "You are already in the room " + roomId);
          return; // Cannot create new room from here
        }
        if(!data.userId){
          console.warn("User didn't send a name");
          socket.emit("message", "You didn't send a name");
          return; // Cannot create new room from here
        }
        roomId = data.roomId;

        let result = joinRoom(socket, roomId, data.userName, data.userId);
        if(!result){
          return;
        }
        room = result.room;
        user = result.user;
        break;
      case 'userSettings':
        if(!roomId){
          console.warn("No room to kick people from");
          socket.emit("message", "You are not in the room");
          return;
        }
        room.userSettings(user.id, data.settings);
        break;
      case 'kick':
        if(!roomId){
          console.warn("No room to kick people from");
          socket.emit("message", "You are not in the room");
          return;
        }
        console.warn("trying to kick", data);
        room.kick(user.id, data.targetId, data.hard);
        break;
      case 'leave':
        if(!roomId){
          console.warn("No room to leave");
          socket.emit("message", "You are not in the room");
          return;
        }
        room.leave(user.id);
        break;
      case 'startGame':
        if(!roomId) {
          console.warn("No room to start game in");
          socket.emit("message", "You are not in the room");
          return;
        }
        console.warn(user.id + " >> startGame");
        room.startGame(user.id);
        break;
    }
  });

  // Game commands are transparently relayed into the game itself
  socket.on('gameCommand', (data) =>{
    // console.debug(user.name + " >> gameCommand: " + JSON.stringify(data));
    if(!roomId){
      console.warn("No room to send game command to");
      socket.emit("message", "You are not in the room");
      return; // No game commands without rooms!
    }
    if(!room){
      console.error("No room created");
      socket.emit("message", "No room created");
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

  socket.on('disconnect', (/* reason */) => {
    console.log('disconnect', roomId, user);
    if(!roomId || !user){
      return; // No room, so whatever
    }
    room.disconnect(user.id); //Let the room know that player left
  });
});
