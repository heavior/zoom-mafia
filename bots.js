// This script spawns bot to join a game

const { Command } = require('commander');

const { Bot } = require("./backend/mafiaBot");

const DEFAULT_BOTS_NUMBER = 20;
const DEFAULT_ROOM = 'bots';
const DEFAULT_SERVER = 'http://localhost:8080';
const program = new Command();
program.version('0.0.1');

program
  .option('-n, --number <number>', 'number of bots to spawn')
  .option('-r, --room <roomId>', 'name of the room to join')
  .option('-s, --server <IP:port>', 'server to join');

program.parse(process.argv);

let botsNumber = program.number || DEFAULT_BOTS_NUMBER;
let roomId = program.room || DEFAULT_ROOM;
let server = program.server || DEFAULT_SERVER;

console.log("bots", botsNumber, roomId, server);

let bots = [];
for(let i=0;i<botsNumber;i++){
  let bot = new Bot(server, roomId, i);
  bots.push(bot);
}
