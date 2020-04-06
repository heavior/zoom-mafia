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

const mafia = require('./mafia');

class Room {

  constructor(videoLink, roomId, roomEventCallback, gameEventCallback){
    // Creating the room. requires the host to put video conference link
    // The id should be provided by external code which ensures uniqueness.
    this.videoLink = videoLink;
    this.id = roomId;
    this.players = [];
    this.roomEventCallback = roomEventCallback;
    this.gameEventCallback = gameEventCallback;
  }

  roomUpdated(event){
    let playerPublicInfo = this.players.map(player=>{ return {name: player.name, isOnline: player.isOnline}});
    this.roomEventCallback({event:event, players:playerPublicInfo}, this.id);
  }

  gameUpdated(event, data){
     this.gameEventCallback({event:event, game:data}, this.id);
  }

  join(playerName, playerId){
    if(!playerId){ // For now use name as guest authenticator
      playerId = playerName;
    }

    // Check for rejoin
    let existingPlayer = this.players.find(function(element){
      return element.id === playerId;
    });
    if(existingPlayer){
      existingPlayer.isOnline = true;
      return;
    }
    let newPlayer = {
      name: playerName,
      id: playerId,
      isOnline: true
    };
    this.players.push(newPlayer);
    this.roomUpdated("playerJoined");
    return newPlayer;
  }

  disconnect(playerId){
    // Connection with player lost
    let player = this.players.find(function(element){
      return element.id === playerId;
    });
    if(!player){
      return; //Maybe the player was kicked out
    }
    player.isOnline = false;
    this.roomUpdated("playerDisconnect");
  }

  leave(playerId){
    // Guest left the room, or was kicked out - remove them from the list of players
    let playerIndex = this.players.findIndex(function(element){
      return element.id === playerId;
    });
    if(playerIndex>0){
      this.players.list.splice(playerIndex, 1);
    }
    this.roomUpdated("playerLeft");
  }

  startGame(){
    this.game = new mafia.Game((event,data) => this.gameUpdated(event,data));
    // Only online players join the game
    this.gamePlayerNames = this.players.filter(player => player.isOnline).map(player => player.name);
    this.game.start(this.gamePlayerNames);
  }

  gameCommand(data, playerId){
    // Find user's game number by id
    // TODO: this is bad!!! This doesn't account for name dublicates and operates with index in the array
    let number = this.gamePlayerNames.findIndex(name => name === this.players[playerId].name);
    this.game.command(data, number+1);
  }
}

exports.Room = Room;
