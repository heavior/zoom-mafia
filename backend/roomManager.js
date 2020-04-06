const room = require("./room");
const shortId = require('shortid');

const MAX_TRIES = 10;

class RoomManager {
  // this class handles room storage. In-memory for now, but in cache and in DB later
  constructor(){
    this.rooms = {}; // Cache of rooms
  }

  createRoom(videoLink, roomEventCallback, gameEventCallback){
    let roomId;
    for(let i=0;i<MAX_TRIES;i++){
      roomId = shortId.generate();
      if(!(roomId in this.rooms))
        break;
    }
    if(roomId in this.rooms){
      console.error("can't generate unique roomId");
      return null; // Sorry, can't block the room any longer
    }

    do { // Generate ids until we have a unique one
      roomId = shortId.generate();
    }while(roomId in this.rooms);
    this.rooms[roomId] = new room.Room(videoLink, roomId, roomEventCallback, gameEventCallback);
    return this.rooms[roomId];
  }

  findRoom(roomId){
    if(!(roomId in this.rooms)){
      return null;
    }
    return this.rooms[roomId];
  }
}


exports.RoomManager = RoomManager;
