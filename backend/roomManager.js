const room = require("./room");
const shortId = require('shortid');

const MAX_TRIES = 10;

class RoomManager {
  // this class handles room storage. In-memory for now, but in cache and in DB later
  constructor(){
    this.rooms = {}; // Cache of rooms
  }

  createRoom(videoLink, forceRoomId, roomEventCallback, gameEventCallback, directMessageCallback){
    let roomId = forceRoomId;
    if(!roomId) {
      for (let i = 0; i < MAX_TRIES; i++) {
        roomId = shortId.generate();
        if (!(roomId in this.rooms))
          break;
      }
    }
    if(roomId in this.rooms){
      console.error("can't generate unique roomId");
      return null; // Sorry, can't block the room any longer
    }

    this.rooms[roomId] = new room.Room(videoLink, roomId, roomEventCallback, gameEventCallback, directMessageCallback);
    return this.rooms[roomId];
  }

  findRoom(roomId){
    if(!(roomId in this.rooms)){
      console.warn("can't find the room", roomId, this.rooms);
      return null;
    }
    return this.rooms[roomId];
  }
}


exports.RoomManager = RoomManager;
