
const io = require('socket.io-client');

class MafiaBot {
  constructor(server, roomId, i){
    console.log("init bot");
    this.roomId = roomId;
    this.id = "Bot " + i;
    this.name = "Bot " + i;

    this.isOnline= true;
    this.socket = io.connect(server, {
      forceNew: true,
      autoConnect: false,
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
      console.log(">> gameEvent", data);
    });


    this.socket.on("connect", data => this.log("error", data));
    this.socket.on("connection", data => this.log("error", data));
    this.socket.on("error", data => this.log("error", data));
    this.socket.on("connect_error", data => this.log("connect_error", data));
    this.socket.on("connect_timeout", data => this.log("connect_timeout", data));
    this.socket.on("pong", data => this.log("pong", data));
    this.socket.on("ping", data => this.log("ping", data));


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

}



exports.Bot = MafiaBot;
