const room = require("./room");
const shortId = require('shortid');

class RoomManager {
  // this class handles room storage. In-memory for now, but in cache and in DB later
  constructor(){
    this.rooms = {}; // Cache of rooms
  }

  createRoom(videoLink, roomEventCallback, gameEventCallback){
    let roomId;
    do { // Generate ids until we have a unique one
      roomId = shortId.generate();
    }while(!(roomId in this.rooms));
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
