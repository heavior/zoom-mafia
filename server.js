const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/dist'));
server.listen(process.env.PORT || 8080);

io.on('connection', (socket) => {
  socket.emit('serverStatus', 'Welcome!');

  socket.on('server', (data) =>{
    switch(data.action) {
      case 'usernameSet':
        socket.broadcast.emit('serverStatus', `${data.username} has joined the server`);
        socket.emit('serverStatus', `Welcome to the server ${data.username}`);
        break;
      default:
        return;
    }
  });

  socket.on('message', (data) => {
    socket.broadcast.emit('message', data);
  });
});
