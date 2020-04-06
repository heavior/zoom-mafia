// Mafia game logic
// Refer to https://en.wikipedia.org/wiki/Mafia_(party_game)
//
// Later for addional roles - check here: https://summoning.ru/games/mafia.shtml
// or here: https://en.wikipedia.org/wiki/Mafia_(party_game)
//
// Option: dead disclose their role or not (default - no)
// Option: mafia doesn't talk (in original everyone has to write down "I'm civilian", or name of the player to eliminate). This way prevents cheating as no one has to close their eyes
// Option: First dead becomes game master (downside - not everyone is a good master)
// Option: dead see who is who
// Option: vote is mandatory (default - yes) - implemented
// Idea: we could make our tool talk to players to voice commands
// TODO: implement day-night state

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
  Player: -1, // hardcoded
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
      MafiaRoles.Mafia,
      MafiaRoles.Mafia,
      MafiaRoles.Civilian,
      MafiaRoles.Civilian,
      MafiaRoles.Civilian,
      MafiaRoles.Civilian,  // 6 players ends here
      MafiaRoles.Detective, // 7 players
      MafiaRoles.Mafia,     // 8 players
      MafiaRoles.Civilian,  // 9 players
      MafiaRoles.Civilian,  // 10 players
      MafiaRoles.Don,       // 11 players
      MafiaRoles.Civilian,  // 12 players
      MafiaRoles.Civilian,  // 13 players
      MafiaRoles.Mafia,     // 14 players
      MafiaRoles.Civilian,  // 15 players
      MafiaRoles.Civilian,  // 16 players
      MafiaRoles.Master,      // 17 players - too much, someone gets to be a game master

      // Now, here I'm too lazy to think, so I just add a bunch of guests here:
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest,
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest,
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest,
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest,
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest,
      MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest, MafiaRoles.Guest
    ];

class MafiaGame {
  constructor(gameEventCallback,
              isVoteMandatory = true, // Is everyone must vote (unresolved votes go for the first player on the voting list)
              isMafiaVoteUnanimous = false) // Should mafia vote by unanimous (professional rules)
  {
    this.isVoteMandatory = isVoteMandatory;
    this.isMafiaVoteUnanimous = isMafiaVoteUnanimous;

    this.gameEventCallback = gameEventCallback;
    this.gameOn = false;
    this.civiliansWin = false;
  }
  start(playersNames){
    //This method starts new game based on the array of player names

    let playersRoles = this._shuffle(playersNames.length); // Shuffle the roles

    // Generate states for everyPlayer
    this.players = playersNames.map(function callback(element, index) {
        // Return value for new_array
        return {
          number: index + 1,
          name: element,
          role: playersRoles[index],
          isMaster: false,
          isMafia: this._isMafiaRole(playersRoles[index]),
          isAlive: this._isActiveRole(playersRoles[index]) // mark guests and master as dead - to prevent from voting
        }
    });
    this.gameOn = true;
    this.gameEventCallback("started", this.publicInfo());
  }

  command(data, playerNumber){
    let player = this.players[playerNumber-1];

    // Game process:

    switch (data.action){
      case 'vote'
    }

    // TODO: execute commands here
    /*

     */

  }


  static _roleName(role){
    return MafiaRoles.entries().find(role => role[1] === role)[0];
  }
  static _playerPublicInfo(player){

    let publicInfo = {
      number:player.number,
      name:player.name,
      isAlive:player.isAlive,
      role:this._roleName(player.role)
    };

    if(this._isActiveRole(player.role)){
      publicInfo.role = "Player";
    }
    return publicInfo;

  }
  publicInfo(){
    // Whatever is publicly available
    return{
      gameOn: this.gameOn,
      civiliansWin: this.civiliansWin,
      players: this.players.map(player => this._playerPublicInfo(player));
    }
  }

  static _isMafiaRole(role){
    return (role === MafiaRoles.Mafia) || (role === MafiaRoles.Don);
  }
  static _isActiveRole(role){
    return role > 1;
  }

  static _shuffle(numberOfCards){
    // This method generates an array of roles based on number of players
    let cardsToPlay = CardsDeck.slice(numberOfCards);
    cardsToPlay.sort(() => Math.random() - 0.5); // Shuffle the array, solution from here: https://javascript.info/task/shuffle
    return cardsToPlay;
  }

  kill(playerNumber){
    this.players[playerNumber-1].isAlive = false;
    this.checkGameOver(); // Check if game is over with every kill
    return false;
  }


  startVote(mafiaOnly){
    /* There are three votes in the game:
    1) Daytime - who are suspects (who shall we nominate for killing)
    2) Daytime - who is guilty (who shall be killed)
    3) Nighttime - mafia only - who to eliminate
     */
    // TODO: remember and check who should be voted for in scenario 2
    this.votes = {};
    this.mafiaVotes = mafiaOnly;
  }
  shouldVote(player){
    return player.isAlive && (!this.mafiaVotes || player.isMafia);
  }

  vote(whoVotes, choicePlayer){
    if(!this.shouldVote(this.players[whoVotes-1].isAlive)){
      return; //This vote doesn't count
    }

    this.votes[whoVotes] = choicePlayer; // Using array to have unique vote per player
    if(this.checkAllVoted()){ // Important: do not resolve suspects vote
      this.resolveVote();
    }
  }
  showShouldVote(){
    return this.players.filter(player => this.shouldVote(player));
  }
  checkAllVoted(){
    // For automatic vote resolve - once everyone votes
    return !this.showShouldVote().some(player => !this.votes[player.number]);
  }
  resolveVote(){
    // Didn't vote - vote goes to the first of the list
    let unusedVotesCounter = 0;

    if(this.isVoteMandatory || this.isMafiaVoteUnanimous){
      unusedVotesCounter = this.showShouldVote().find(player => !this.votes[player.number]).length;
    }


    // Count votes
    let votedDown = {};
    this.votes.values().forEach(vote => {
      if(!votedDown[vote]){
        votedDown[vote] = 0;
      }
      votedDown[vote] ++;
    });

    let votes = votedDown.entries();

    if(this.mafiaVotes && this.isMafiaVoteUnanimous){
      if(unusedVotesCounter > 0 || votes.length > 1){
        return false;
      }
    }

    if(this.isVoteMandatory && !this.mafiaVotes){
      // Add all unused votes to the smallest player number
      votes.sort(element => element[0]);
      votes[0][1] += unusedVotesCounter;
    }

    votes.sort(element => -element[1]); // Sort by votes in reverse order
    return votes[0][0]; // return the first voted
  }

  endGame(civiliansWin){
     this.gameOn = false;
     this.civiliansWin = civiliansWin;
     this.gameEventCallback("ended", this.publicInfo());
  }

  checkGameOver(){
    // Game over conditions:
    // MafiaWins: number of alive mafia is >= number of alive civilians
    // Civilians win: no mafia is alive

     let mafiaCount = this.players.reduce(function (result, player) {
        return result + ((player.isAlive && player.isMafia) ?1:0);
     }, 0);

     if(mafiaCount === 0){
       this.endGame(true);
       return true;
     }

     let civilianCount = this.players.reduce(function (result, player) {
        return result + ((player.isAlive && !player.isMafia) ?1:0);
     }, 0);


     if(mafiaCount >= civilianCount){
       this.endGame(false);
       return true;
     }

     return false;
  }
}

exports.Game = MafiaGame;
exports.Roles = MafiaRoles;


