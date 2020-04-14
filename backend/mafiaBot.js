
const io = require('socket.io-client');

const VoteStrategies = Object.freeze({
  None: 'None',
  Random: 'Random',
  First: 'First',
  Last: 'Last'
});
const DefaultConfig = Object.freeze({
  reconnect: false, // Automatically reconnect when server restarts
  voteStrategy: VoteStrategies.Random,
  selfPreservation: true,   // Do not vote for yourself during normal votes
  tiebreakerVote: null,     // Force vote for Ties : -1 to kill, 0 to spare, null to randomise
  silent: true,             // Do not log messages if not host

  // If bot is host:
  startGameDelay: 30,       // timeout for starting new game
  skipStateTimeout: 0.5,    // timeout for skipping states, use 0.5 for quick go
  discussionTimeout: 30,    // timeout for discussion phase (if not skipping Discussion)
  silentHost: false,        // Do not log messages if host
  skipStates: ['Discussion', /*'Night',*/ 'MainVote', 'Tiebreaker'] // Host should quickly skip certain states
});
// TODO: fix skit state timeout, it doesn't seem to be working

class MafiaBot {
  constructor(server, roomId, i, config = {}){
    this.config = Object.assign({}, DefaultConfig, config);
    this.roomId = roomId;
    this.id = "Bot " + i;
    this.name = "Bot " + i;

    this.log("init bot", this.config);

    this.isOnline= true;
    this.socket = io.connect(server, {
      forceNew: true,
      autoConnect: false,
      reconnection: this.config.reconnect,
      query: {
      // Pass parameters to join the room automatically
        id: roomId,
        userName: this.name,
        userId: this.id
      }
    }); // Open connection

    // Log all messages
    this.socket.on("roomEvent", data =>{
      this.log(">> roomEvent", data);
      this.iAmHost = (data.host === this.name);
      if(this.iAmHost && !this.game){
        //I am host,
        this.startGame();
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
  startGame(){
    setTimeout(()=>{
      this.log("try to start game");
      this.socket.emit("roomCommand", {action:'startGame'});
    }, this.config.startGameDelay * 1000)
  }
  log(event, data){

    if(!this.iAmHost && this.config.silent || this.iAmHost && this.config.silentHost){
      return;
    }
    console.log.apply(console, [this.name].concat([...arguments]));
  }
  isAlive(){
    return this.isOnline;
  }

  next(data){
    // Doing a next step
    this.game = data.game;
    this.me = data.you;
    this.players = data.players;

    this.log(">> next:", this.game.gameOn, this.game.gameState);
    if(this.me.isAlive) {
      this.vote();
    }
    if(!this.iAmHost){
      return;
    }

    if(!this.game.gameOn){
      this.startGame();
      return;
    }

    if(this.skipping){
      clearTimeout(this.skipping);
      this.skipping = null;
    }
    if(this.config.skipStates.indexOf(this.game.gameState)>=0) {
      this.skip(this.config.skipStateTimeout);
      return;
    }
    if(this.game.gameState === 'Discussion'){
      this.skip(this.config.discussionTimeout);
    }
  }
  skip(delay){
    let skipState = this.game.gameState;
    let dayNumber = this.game.dayNumber;
    console.log("skipping", skipState, "at day", dayNumber, "in", delay);
    if(this.skipping){
      // Clear old timeout
      clearTimeout(this.skipping);
    }
    this.skipping = setTimeout(()=> {
      this.skipping = null;
      if(skipState !== this.game.gameState || dayNumber !== this.game.dayNumber){
        console.log("day or state changed");
        return; // state has changed since then, ignore
      }
      this.log("<< next (skip state)",  this.game.gameState);
      this.socket.emit("gameCommand", {action:'next'});
    }, delay * 1000 );
  }

  vote(){

    let candidate = null;
    // Vote according to the strategy
    let candidates = [];
    if(this.game.gameState === 'Tiebreaker'){
      this.log("tie breaker");
      candidates = [{number:-1},{number:0}];
      if(this.config.tiebreakerVote !== null) {
        candidates = [{number:this.config.tiebreakerVote}];
      }
    }else{
      candidates = this.players.filter(player=> player.isCandidate
        && (!this.config.selfPreservation || player.number !== this.me.number));
    }
    if(!candidates.length){
      return;
    }

    switch(this.config.voteStrategy){
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
    this.log("<< vote:", candidate , "state:", this.game.gameState);
    this.socket.emit("gameCommand", {action:'vote', vote: candidate});
  }

}



exports.Bot = MafiaBot;
exports.VoteStrategies = VoteStrategies;
