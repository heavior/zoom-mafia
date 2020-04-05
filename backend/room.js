// This is a generic rooms logic
/*
  * Hosts creates a room (start with in memory, later - in cache, then finally in the db), enters his name and zoom link
  * Host gets a link (room id) to share with other people
  * People can enter their name and join the room if they have the link
  * People automatically rejoin the room after broken connection or page reload (use name as authenticator for now, generate some key later)
  * Room host:
      One person creates the room and owns it
      If he looses connection - another member becomes the host
      Hosts is needed to kick people who lost connection if the can't reconnect and continue the game
  * If the game is on - they are guests, the game itself doesn' know anything about them
  * Host starts a game
  * Game happens
  *

Note: ideally the game doesn't depend on every player connectivitiy, so game master has control over it.
Reason: maybe we shouldn't force players to be in the UI all the time - let them focus on video while master enters their votes

TODO: array of players vs object of players? Object help find people by Id
TODO: How should the game identify players?
TODO: later - generate some authenticator for people to rejoin as the same people
TODO: RoomManager or RoomFactory
TODO: Game operates with player numbers
TODO: Make sure that joins or disconnects are broadcasted within the room
IDEA: Maybe rooms has chats and game-driven subrooms (mafia chat, etc)
IDEA: Maybe be people can leave the room, this makes them dead in the game, but we don't want to make it too apparent
IDEA: Later - maybe there is a time coordination for the room later
*/


exports.Room = Room;

const shortid = require('shortid');
const mafia = require('mafia');

class Room {

  constructor(hostName, videoLink, hostId, roomId){
    // Creating the room. requires the host to put in his name and video conference link
    // The id should be provided by external code which ensures uniqueness. For now we use shortid library as a fallback
    if(!hostId){
      hostId = hostName;
    }
    if(!roomId){
      roomId = shortid.generate();
    }
    this.hostId = hostId;
    this.videoLink = videoLink;
    this.id = roomId;

    this.players = [
      {
        name: hostName,
        id: hostId,
        isHost: true,
        isOnline: true
      }
    ]
  },

  roomUpdated(){
    // TODO: Notify everyone that people in the room changed

  },

  gameUpdated(){
    // TODO: Notify everyone that game status updated
  },

  join(guestName, guestId){
    if(!guestId){ // For now use name as guest authenticator
      guestId = guestName;
    }

    // Check for rejoin
    var existingPlayer = this.players.find(function(element){
      return element.id == guestId;
    });
    if(existingPlayer){
      existingPlayer.isOnline = true;
      return;
    }
    this.players.push({
      name: guestName,
      id: guestId,
      isHost: false,
      isOnline: true
    });
    this.roomUpdated();
  },

  disconnect(guestId){
    // Connection with player lost
    var player = this.players.find(function(element){
      return element.id == guestId;
    });
    if(!player){
      return; //Maybe the player was kicked out
    }
    player.isOnline = false;
    this.roomUpdated();
  },

  leave(guestId){
    // Guest left the room, or was kicked out - remove them from the list of players
    var playerIndex = this.players.findIndex(function(element){
      return element.id == guestId;
    });
    if(playerIndex>0){
      this.players.list.splice(playerIndex, 1);
    }
    this.roomUpdated();
  },

  startGame(){
    this.game = new mafia.Game();
    var playersNames = this.players.filter(player => player.isOnline).map(player => player.name);
    this.game.start(playersNames);
    this.gameUpdated();
  },




}
