
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
    this.log("init bot");
    this.voteStrategy = config.voteStrategy || VoteStrategies.Random;
    this.selfPreservation  = config.selfPreservation || true;
    this.forceTie = config.forceTie || true;
    this.gameControlTimelout = config.gameControlTimelout || 1;
    this.silentHost = config.silentHost || false;
    this.silent = config.silent || true;


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


    //this.log("init bot", this.socket);

    // Log all messages
    this.socket.on("roomEvent", data =>{
      this.log(">> roomEvent", data);
      this.iAmHost = (data.host === this.name);
      if(this.iAmHost && !this.game){
        //I am host,

        setTimeout(()=>{
          this.log(this.name, "try to start game");
          this.socket.emit("roomCommand", {action:'startGame'});
        }, this.gameControlTimelout * 1000)
      }
    });

    this.socket.on("gameEvent", data =>{
      this.log(">> gameEvent", data);
    });
    this.socket.on("directMessage", data =>{
      switch(data.data.event){
        case 'started':
        case 'next':
        case 'join':
        case 'ended':
          this.next(data.data);
          break;
      }
    });


    this.socket.on("connect", data => this.log("error", data));
    this.socket.on("connection", data => this.log("error", data));
    this.socket.on("error", data => this.log("error", data));
    this.socket.on("connect_error", data => this.log("connect_error", data));
    this.socket.on("connect_timeout", data => this.log("connect_timeout", data));

    this.socket.on("disconnect", data =>{
      this.log("disconnect", data);
      this.isOnline = false;
    });

    this.log("connecting");
    this.socket.connect(data => this.log("connected", data));

  }
  log(event, data){

    if(!this.iAmHost && this.silent || this.iAmHost && this.silentHost){
      return;
    }
    console.log.apply(console, arguments);
  }
  isAlive(){
    return this.isOnline;
  }

  next(data){
    // Doing a next step
    this.game = data.game;
    this.me = data.you;
    this.players = data.players;


    this.log(this.name + " >> next:", this.game.gameOn, this.game.gameState);
    if(this.me.isAlive) {
      this.vote();
    }
    if(!this.iAmHost){
      return;
    }

    if(!this.game.gameOn){
      this.log(this.name, "<< startGame");
      this.socket.emit("roomCommand", {action:'startGame'});
    }
    else if(this.game.gameState === 'Discussion'){
      //I am host,

      setTimeout(()=>{
        if(this.game.gameState !== 'Discussion'){
          // State changes somehoe
          return;
        }
        this.log(this.name, "<< jump to next state");
        this.socket.emit("gameCommand", {action:'next'});
      }, this.gameControlTimelout * 1000)
    }

  }

  vote(){

    let candidate = null;
    // Vote according to the strategy
    let candidates = [];
    if(this.game.gameState === 'Tiebreaker'){
      this.log("tie breaker");
      candidates = [{number:-1},{number:0}];
      if(this.forceTie) {
        candidates = [{number:-1}];
      }
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
    this.log(this.me.name, "<< vote:", candidate , "state:", this.game.gameState);
    this.socket.emit("gameCommand", {action:'vote', vote: candidate});
  }

}



exports.Bot = MafiaBot;
exports.VoteStrategies = VoteStrategies;
