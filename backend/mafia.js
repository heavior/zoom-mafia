// Mafia game logic
// Refer to https://en.wikipedia.org/wiki/Mafia_(party_game)
//
// Later for addional roles - check here: https://summoning.ru/games/mafia.shtml
// or here: https://en.wikipedia.org/wiki/Mafia_(party_game)
//
// Option: dead disclose their role or not
// Option: mafia doesn't talk (in original everyone has to write down "I'm civilian", or name of the player to eliminate). This way prevents cheating as no one has to close their eyes
// Option: First dead becomes game host (downside - not everyone is a good host)
// Idea: we could make our tool talk to players to voice commands
// TODO: implement voting for mafia and maybe daytime voting
// TODO: check if special night logic is required

exports.Game = MafiaGame;
exports.Roles = MafiaRoles;

/*
  mafia should have 1/3 or less of players
  Profeccional rules: 10 people: mafiaBoss, 2x mafia, detective, 6x civilian

From original rules:
  6-7 players: two mafia
  8-10 players: 3 mafia
  11-13 players: 4 mafia
  14-16 players: 5 mafia
 */


const MafiaRoles = Object.freeze({
  Guest: 0, // No role, just sitting there
  Master: 1,
  Civilian: 2,
  Detective: 3,
  Mafia: 4,
  Don: 5,
  Doctor: 6, // Later
  Maniac: 7, // Later
  Executioner: 8 // Later
});


/*
  6-7 players: two mafia
  8-10 players: 3 mafia
  11-13 players: 4 mafia
  14-16 players: 5 mafia

  Maybe we should introduce new game roles for larger rooms
 */
const CardsDeck = [
      Roles.Mafia,
      Roles.Mafia,
      Roles.Civilian,
      Roles.Civilian,
      Roles.Civilian,
      Roles.Civilian,  // 6 players ends here
      Roles.Detective, // 7 players
      Roles.Mafia,     // 8 players
      Roles.Civilian,  // 9 players
      Roles.Civilian,  // 10 players
      Roles.Don,       // 11 players
      Roles.Civilian,  // 12 players
      Roles.Civilian,  // 13 players
      Roles.Mafia,     // 14 players
      Roles.Civilian,  // 15 players
      Roles.Civilian,  // 16 players
      Roles.Master,      // 17 players - too much, someone gets to be a host

      // Now, here I'm too lazy to think, so I just add a bunch of guests here:
      Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest,
      Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest,
      Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest,
      Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest, Roles.Guest
    ];

class MafiaGame {
  constructor(){
  },

  start(playersNames){
    //This method starts new game based on the array of player names

    var playersRoles = this._shuffle(players.length); // Shuffle the roles

    // Generate states for everyPlayer
    this.players = playersNames.map(function callback(element, index, array) {
        // Return value for new_array
        return {
          number: index + 1,
          name: element,
          role: playersRoles[index],
          isMafia: _isMafia(playersRoles[index]),
          alive: true
        }
    });
    this.gameOn = true;
  },

  _isMafia(role){
    return (role === Roles.Mafia) || (role === Roles.Don);
  },

  _shuffle(numberOfCards){
    // This method generates an array of roles based on number of players
    var cardsToPlay = CardsDeck.slice(numberOfCards);
    cardsToPlay.sort(() => Math.random() - 0.5); // Shuffle the array, solution from here: https://javascript.info/task/shuffle
    return cardsToPlay;
  },

  kill(playerNumber){
    this.players[playerNumber-1].alive = false;
    this.checkGameOver(); // Check if game is over with every kill
    return false;
  },

  voteToKill(whoVotes, choicePlayer, checkMafia){

  },

  checkGameOver(){
    // Game over conditions:
    // MafiaWins: number of alive mafia is >= number of alive civilians
    // Civilians win: no mafia is alive

     var mafiaCount = this.players.reduce(function (result, player) {
        return result + ((player.isAlive && player.isMafia) ?1:0);
     }, 0);

     if(mafiaCount == 0){
       this.gameOn = false;
       this.civilianWin = true;
       return true;
     }

     var civilianCount = this.players.reduce(function (result, player) {
        return result + ((player.isAlive && !player.isMafia) ?1:0);
     }, 0);


     if(mafiaCount >= civilianCount){
       this.gameOn = false;
       this.civilianWin = false;
       return true;
     }

     return false;
  }
}


