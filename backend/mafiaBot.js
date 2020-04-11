
const io = require('socket.io-client');

const VoteStrategies = Object.freeze({
  None: 'None',
  Random: 'Random',
  First: 'First',
  Last: 'Last'
});

class MafiaBot {
  constructor(server, roomId, i,
              config = {}){
    console.log("init bot");
    this.voteStrategy = config.voteStrategy|| VoteStrategies.Random;
    this.selfPreservation  = config.selfPreservation|| true;

    this.roomId = roomId;
    this.id = "Bot " + i;
    this.name = "Bot " + i;

    this.isOnline= true;
    this.socket = io.connect(server, {
      forceNew: true,
      autoConnect: false,
      reconnection: false,
      query: {
      // Pass parameters to join the room automatically
        id: roomId,
        userName: this.name,
        userId: this.id
      }
    }); // Open connection


    //console.log("init bot", this.socket);

    // Log all messages
    this.socket.on("roomEvent", data =>{
      console.log(">> roomEvent", data);
    });

    this.socket.on("gameEvent", data =>{
      console.log(">> gameEvent", data);
    });
    this.socket.on("directMessage", data =>{
      console.log(">> directMessage", data);

      console.log("event?", data.event, data.data.event);
      switch(data.data.event){
        case 'started':
        case 'next':
        case 'join':
          this.next(data.data);
          break;
      }
    });


    this.socket.on("connect", data => this.log("error", data));
    this.socket.on("connection", data => this.log("error", data));
    this.socket.on("error", data => this.log("error", data));
    this.socket.on("connect_error", data => this.log("connect_error", data));
    this.socket.on("connect_timeout", data => this.log("connect_timeout", data));


    // Vote randomly


    this.socket.on("disconnect", data =>{
      console.log("disconnect", data);
      this.isOnline = false;
    });

    console.log("trying to connect");
    this.socket.connect(data => this.log("ping", data));

    console.log("kinda done");
  }

  log(event, data){
      console.log(event, data);
  }
  isAlive(){
    return this.isOnline;
  }

  next(data){
    // Doing a next step
    this.game = data.game;
    this.me = data.you;
    this.players = data.players;

    this.vote();

  }

  vote(){

    let candidate = null;
    // Vote according to the strategy
    let candidates = [];
    if(this.game.gameState === 'Tiebreaker'){
      candidates = [{number:-1},{number:0}];
    }else{
      candidates = this.players.filter(player=> player.isCandidate
        && (!this.selfPreservation || player.number !== this.me.number));
    }
    if(!candidates.length){
      return;
    }

    switch(this.voteStrategy){
      case VoteStrategies.None:
        return;
      case VoteStrategies.Random:
        candidate = candidates[Math.floor(Math.random() * candidates.length)].number;
        break;
      case VoteStrategies.First:
        candidate = candidates[0].number;
        return;
      case VoteStrategies.Last:
        candidate = candidates[candidates.length - 1].number;
        return;
    }

    this.socket.emit("gameCommand", {action:'vote', vote: candidate});
  }

}



exports.Bot = MafiaBot;
exports.VoteStrategies = VoteStrategies;
