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

LATER: array of players vs object of players? Object help find people by Id
LATER: generate some authenticator for people to rejoin as the same people
IDEA: Maybe rooms has chats and game-driven subrooms (mafia chat, etc)
IDEA: Maybe be people can leave the room, this makes them dead in the game, but we don't want to make it too apparent
IDEA: Later - maybe there is a time coordination for the room later
*/


/**
 * Room prototocol:
 *
 * roomCommand
 *  {action:"create", userName, userId}, returns ("roomEvent", {event:"created", id:roomId, userId: user.id})
 *  {action:"join", userName, userId}, returns ("roomEvent", {event:"joined", id:roomId, userId: user.id})
 *  {action:"startGame"}, actually game returns the event; ("gameEvent", {event:"started", game: gameInfo})
 *
 * roomEvent
 *  playerJoined
 *  playerLeft
 *  playerConnected
 *  playerDisconnected
 *  hostChanged
 *
 * direct messages:
 *  {event:"roomDirectEvent", data:"youAreTheHost"}
 *
 *  For game events - look inside game file
 */
const mafia = require('./mafia');

const HOST_RECONNECT_TIMEOUT = 20*1000; // How much time do we give host to reconnect

class Room {

  constructor(videoLink, roomId, roomEventCallback, gameEventCallback, directMessageCallback){
    // Creating the room. requires the host to put video conference link
    // The id should be provided by external code which ensures uniqueness.
    this.videoLink = videoLink;
    this.id = roomId;
    this.players = [];
    this.host = null;
    this.roomEventCallback = roomEventCallback;
    this.gameEventCallback = gameEventCallback;
    this.directMessageCallback = directMessageCallback; // (playerId, eventName, eventData)

    // Ok, this is a mess - some thing we relay directly inside, some not
    this.game = new mafia.Game((event,data) => this.gameUpdated(event,data),
      (userId, event, data) => this.directMessage(userId, event, data)
    );
  }

  directMessage(userId, event, data){
    this.directMessageCallback(this.id, userId, event, data);
  }

  roomUpdated(event){
    let playerPublicInfo = this.players.map(player=>{ return {name: player.name, isOnline: player.isOnline}});
    this.roomEventCallback({
      event: event,
      host: this.host && this.host.name,
      videoLink: this.videoLink,
      players: playerPublicInfo
    }, this.id);
  }

  gameUpdated(event, data){
     this.gameEventCallback({event:event, game:data}, this.id);
  }

  join(playerName, playerId){
    if(!playerId){ // For now use name as guest authenticator
      playerId = playerName;
    }

    // Check for rejoin
    let player = this.getPlayer(playerId);
    if(player){
      player.isOnline = true;
      if(!this.host){
        this.findNewHost();
      }
      this.roomUpdated("playerConnected");
    }else {
      player = {
        name: playerName,
        id: playerId,
        isOnline: true,
        autoJoin: true
      };
      this.players.push(player);
      this.roomUpdated("playerJoined");
    }
    console.debug("join", playerName, playerId, player);
    this.findNewHost(); // Check if we need to assign host.

    this.game.join(player); //this.game.playerUpdate(playerId); // Send update to the connected player
    return player;
  }
  userSettings(playerId, settings){
    let player = this.getPlayer(playerId);
    if(!player){
      this.directMessage(playerId, "roomDirectEvent", {event:"youAreNotInTheRoom"});
    }
    if('autoJoin' in settings) {
      player.autoJoin = settings.autoJoin;
    }

    this.directMessage(playerId, "roomDirectEvent", {event:"settingsChanged", settings:{autoJoin: player.autoJoin}});
  }

  kick(playerId, targetId, hard = false){
    console.log("kick", playerId, targetId, hard );

    if(!this.host){
      this.findNewHost(); // This might a trash check
    }
    if(!this.host){
      return false; // Game has no host - no one can kick anyone
    }


    if(this.host.id !== playerId){ // Not the host cannot issue this command
      this.directMessage(playerId, "roomDirectEvent", {event:"youAreNotTheHost"});
      return false;
    }

    if(!hard){
      let targetPlayer = this.getPlayer(targetId);
      if(targetPlayer && targetPlayer.isOnline){
        this.directMessage(playerId, "roomDirectEvent", {event:"cantKickOnlinePLayer"});
        return false;
      }
    }
    // Force the player out
    this.leave(targetId, !hard);
  }

  findNewHost(){
    if(this.host && this.host.isOnline){
      return; // Nothing to do, host is online
    }

    let nextOnline = this.players.find(player => player.isOnline);
    if(nextOnline){
      this.host = nextOnline;
      this.roomUpdated("hostChanged");
      this.directMessage(this.host.id, "roomDirectEvent", {event:"youAreTheHost"});
      return;
    }
    this.host = null; // no online players - game has no host, so next joining the game will be host
  }
  getPlayer(playerId){
    return this.players.find(function(element){
      return element.id === playerId;
    });
  }
  getPlayerIndex(playerId){
    return this.players.findIndex(function(element){
      return element.id === playerId;
    });
  }
  disconnect(playerId){
    // Connection with player lost
    let player = this.getPlayer(playerId);
    if(!player){
      return; //Maybe the player was kicked out
    }
    player.isOnline = false;
    this.roomUpdated("playerDisconnected");

    if(this.host && this.host.id === playerId){
      setTimeout(() => this.findNewHost(), HOST_RECONNECT_TIMEOUT); // Start timer to find new host
    }
  }

  leave(playerId){
    // Guest left the room, or was kicked out - remove them from the list of players
    let playerIndex = this.getPlayerIndex(playerId);

    if(playerIndex>0){
      this.players.splice(playerIndex, 1);
    }
    this.game.kick(playerId);
    this.roomUpdated("playerLeft");

    if(this.host && playerId === this.host.id){ // Host left the game
      this.host = null;
      this.findNewHost();
    }
  }

  startGame(playerId){
    if(this.host && playerId !== this.host.id){
      console.warn("Only host can start the game", playerId, this.host.id);
      this.directMessage(playerId, "roomDirectEvent", {event:"youAreNotTheHost"});
      return;
    }
    // Only online players join the game
    let onlinePlayers = this.players.filter(player => player.isOnline && player.autoJoin);
    if(onlinePlayers.length < 6){
      const data = {event: "error", msg: "You need at least 6 online players to start the game"};
      this.directMessage(playerId, "roomDirectEvent", data);
      return;
    }
    this.game.startTimer(0);
    this.game.start(onlinePlayers);

    this.players.filter(player => player.isOnline && !player.autoJoin).forEach(player => this.game.join(player));
    // Add guests to the game
  }

  gameCommand(data, playerId){
    this.game.command(data, playerId, this.host && (playerId === this.host.id));
  }
}

exports.Room = Room;
