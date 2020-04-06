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

// TODO: implement reliable user identification

/*
  Game protocol for the client:
  GameAction:
    {action:next} (host only)
    {action:vote, vote: number} (any player)

  GameEvent: (always contains current game info)
    started
    ended
    next
*/

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

// Inverted object to map names vs numbers
const MafiaRoleNames = (function swap(obj){
  let ret = {};
  for(let key in obj){
    ret[obj[key]] = key;
  }
  return ret;
})(MafiaRoles);

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

const GameStates = Object.freeze({
  Discussion: 'Discussion', // Day - main conversation between players and nominating candidates
  MainVote: 'MainVote',     // Day - vote for guilty party
  Night: 'Night',           // Night - mafia votes
  Tie: 'Tie'                // Day - a tie during vote process
});


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
    this.gameState = GameStates.Discussion;
  }

  /* External game interface */
  start(playersNames){
    //This method starts new game based on the array of player names
    let playersRoles = this.shuffle(playersNames.length); // Shuffle the roles

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
    this.gameState = GameStates.Discussion;
    this.gameEventCallback("started", this.publicInfo());
  }
  next(){
    // This function implements main game process:
    /*
      A: Day starts, voting for suspects starts, but doesn't end
      B: (Trigger or everyone voted) -> Voting for suspects ends, voting for guilty starts
      C: (Trigger or everyone voted) -> Trigger or automatically Voting for guilty ends, someone dies, night starts, mafia vote starts
      D: (Everyone voted) -> Mafia vote ends, someone dies, day starts -> A
     */

    switch(this.gameState){
      case GameStates.Discussion:
        this.resolveVote(); // Count vote outcome
        this.gameState = GameStates.MainVote;
        break;

      case GameStates.MainVote:
        if(!this.resolveVote()){
          if(!this.votes.length){ // Edge case - no one voted at all
            break; // Keep the state, sestart the vote
          }
          // tie breaker
          this.gameState = GameStates.Tie; // Front end must support this
        }

        this.kill(this.votes[0][0]); // Kill a player
        this.gameState = GameStates.Night;
        break;

      case GameStates.Night:
        if(this.resolveVote()) {
          this.kill(this.votes[0][0]);
        }
        this.gameState = GameStates.Discussion;
        break;

      case GameStates.Tie:
        // People vote to kill both, or spare both: 0 or 1
        if(this.resolveVote() && this.votes[0][0] === 0){ // Failed vote = double tie - save both
          this.candidates.forEach(candidate => this.kill(candidate));
        }
        break;
    }

    if(this.checkGameOver()){
      return;
    }

    this.startVote(); // restart the vote for the new state
    this.gameEventCallback("next", this.publicInfo()); // inform all players about new state
  }
  command(data, playerNumber, isHost){
    let player = this.players[playerNumber-1];

    switch (data.action){
      case 'next': // {action: next} Next trigger in normal statemachine flow
        if(isHost || player.role === MafiaRoles.Master) { // Only master can advance the game to the next step
          this.next();
        }
        break;
      case 'vote': // {action: vote, vote: otherplayernumber}
        this.vote(playerNumber, data.vote);
        break;
    }
  }
  /* /end of External game interface */

  /* Role helpers */
  static _roleName(role){
    return MafiaRoleNames[role];
  }
  static _isMafiaRole(role){
    return (role === MafiaRoles.Mafia) || (role === MafiaRoles.Don);
  }
  static _isActiveRole(role){
    return !((role === MafiaRoles.Guest) || (role === MafiaRoles.Master));
  }
  /* /end of Role helpers */

  /* Game public info */
  static _playerPublicInfo(player){

    let publicInfo = {
      number:player.number,
      name:player.name,
      isAlive:player.isAlive,
      role:this._roleName(player.role)
    };

    if(this._isActiveRole(player.role)){
      publicInfo.role = this._roleName(MafiaRoles.Player);
      // A bit stupid transformation,
      // but it is more or less clear what happens
    }
    return publicInfo;

  }
  publicInfo(){
    // Whatever is publicly available
    return {
      gameOn: this.gameOn,
      civiliansWin: this.civiliansWin,
      gameState: this.gameState,
      candidates: this.candidates,
      players: this.players.map(player => this._playerPublicInfo(player))
    };
  }
  /* /end of Game public info */


  static shuffle(numberOfCards){
    // This method generates an array of roles based on number of players
    let cardsToPlay = CardsDeck.slice(numberOfCards);
    cardsToPlay.sort(() => Math.random() - 0.5); // Shuffle the array, solution from here: https://javascript.info/task/shuffle
    return cardsToPlay;
  }

  kill(playerNumber){
    this.players[playerNumber-1].isAlive = false;
  }

  /* Vote logic */
  checkCandidates(gameState){
    gameState = gameState || this.gameState;
    // Calculate vote candidates based on for the state
    switch(gameState){
      case GameStates.Discussion:
      case GameStates.Night: // Note: mafia can vote to kill one of their own
        return this.players.filter(player => player.isAlive).map(player => player.number);

      case GameStates.MainVote:
        if(!this.votes.length){
          return this.players.filter(player => player.isAlive).map(player => player.number);
        }
        return this.votes.map(vote => vote[0]);

      case GameStates.Tie:
        // if tie happens - people vote to kill all or spare all
        let tieCounter = this.votes[0][1];
        return this.votes.filter(item => item[1] === tieCounter).map(item => item[0]);
    }
  },
  shouldVote(player){
    return player.isAlive && (!this.mafiaVotes || player.isMafia);
  }
  whoShouldVote(){
    return this.players.filter(player => this.shouldVote(player));
  }

  startVote(){
    /* Votes in the game:
    1) Daytime - who are suspects (who shall we nominate for killing)
    2) Daytime - who is guilty (who shall be killed)
    3) Daytime - tie braker (kill both or not)
    4) Nighttime - mafia only - who to eliminate
     */
    // TODO: remember and check who should be voted for in scenario 2
    this.candidates = this.checkCandidates();
    this.votes = {};
    this.mafiaVotes = this.gameState === GameStates.Night;
    this.autoCompleteVote = false; //autoCompleteVote || mafiaOnly;
    // TODO: Cannot do autocomplete vote for now, don't know how - figure it out
  }
  vote(whoVotes, choicePlayer){
    if(!this.shouldVote(this.players[whoVotes-1].isAlive)){
      return; //This vote doesn't count
    }

    this.votes[whoVotes] = choicePlayer; // Using array to have unique vote per player
    if(this.autoCompleteVote && this.checkAllVoted()){ // Important: do not resolve suspects vote
      this.resolveVote();
    }
  }
  checkAllVoted(){
    // For automatic vote resolve - once everyone votes
    return !this.whoShouldVote().some(player => !this.votes[player.number]);
  }
  resolveVote(){
    // Didn't vote - vote goes to the first of the list
    let unusedVotesCounter = 0;

    if(this.isVoteMandatory || this.isMafiaVoteUnanimous){
      unusedVotesCounter = this.whoShouldVote().find(player => !this.votes[player.number]).length;
    }

    // Count votes
    let votedDown = {};
    this.votes.values().forEach(vote => {
      if(!votedDown[vote]){
        votedDown[vote] = 0;
      }
      votedDown[vote] ++;
    });

    this.votes = votedDown.entries();

    if(this.votes.length == 0){
      if(this.isVoteMandatory){
        this.votes.push([this.whoShouldVote()[0].number,unusedVotesCounter]);
        return true; // No one voted - their problems, someone will die!
      }
      return false; // No one voted
    }

    if(this.mafiaVotes && this.isMafiaVoteUnanimous){
      if(unusedVotesCounter > 0 || votes.length > 1){
        return false;
      }
    }

    if(this.isVoteMandatory && !this.mafiaVotes){
      // Add all unused votes to the smallest player number
      this.votes.sort(element => element[0]);
      this.votes[0][1] += unusedVotesCounter;
    }

    this.votes.sort(element => -element[1]); // Sort by votes in reverse order

    if(this.votes.length > 1 && this.votes[0][1] === this.votes[1][1]){
      return false;      // It is a tie
    }

    return true;
  }
  /* /end of Vote logic */


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


