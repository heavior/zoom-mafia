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
// Idea: we could make our tool talk to players to voice commands

// TODO: Cannot do autocomplete vote for now, don't know how - figure it out
// TODO: Implement timer-based transition during vote
/*
  Game protocol for the client:
  GameAction:
    {action:next} (host only)
    {action:vote, vote: number} (any player)

  GameEvent: (always contains current game info)
    ended
    next

  direct messages:
    {event: "gameStatus", data: {game:..., you:..}} - game information, first send when game starts, then when player connects
      'you' represents current player information and everything he is allowed to know about the game
    {event: "gameOver", data:{you:...}}
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
 mafia should have 1/3 or less of players
  Profeccional rules: 10 people: mafiaBoss, 2x mafia, detective, 6x civilian

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
      // MafiaRoles.Master,      // 17 players - too much, someone gets to be a game master. Master is disabled for now

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
              directMessageCallback,
              isVoteMandatory = true, // Is everyone must vote (unresolved votes go for the first player on the voting list)
              isMafiaVoteUnanimous = false) // Should mafia vote by unanimous (professional rules)
  {
    this.isVoteMandatory = isVoteMandatory;
    this.isMafiaVoteUnanimous = isMafiaVoteUnanimous;

    this.gameEventCallback = gameEventCallback;
    this.directMessageCallback = directMessageCallback; // (playerId, eventName, eventData)
    this.gameOn = false;
    this.civiliansWin = false;
    this.gameState = GameStates.Discussion;
  }

  /* External game interface, main game logic */
  start(playersNames){
    //This method starts new game based on the array of player names
    let playersRoles = this.shuffle(playersNames.length); // Shuffle the roles

    // Generate states for everyPlayer
    this.players = playersNames.map(function callback(player, index) {
        // Return value for new_array
        let role = playersRoles[index];
        return {
          id: player.id,
          name: player.name,
          number: index + 1,
          role: role,
          //isMaster: role === MafiaRoles.Master || hostId === player.id,
          isMafia: this._isMafiaRole(playersRoles[index]),
          isAlive: this._isActiveRole(playersRoles[index]) // mark guests and master as dead - to prevent from voting
        }
    });
    this.gameOn = true;
    this.gameState = GameStates.Discussion;
    this.gameEventCallback("started", this.publicInfo());

    this.players.forEach(player => {
      this._playerUpdate(player);
    });


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

        this._kill(this.votes[0][0]); // Kill a player
        this.gameState = GameStates.Night;
        break;

      case GameStates.Night:
        if(this.resolveVote()) {
          this._kill(this.votes[0][0]);
        }
        this.gameState = GameStates.Discussion;
        break;

      case GameStates.Tie:
        // People vote to kill both, or spare both: 0 or 1
        if(this.resolveVote() && this.votes[0][0] === 0){ // Failed vote = double tie - save both
          this.candidates.forEach(candidate => this._kill(candidate));
        }
        break;
    }

    if(this.checkGameOver()){
      return;
    }

    this.startVote(); // restart the vote for the new state
    this.gameEventCallback("next", this.publicInfo()); // inform all players about new state
  }
  command(data, playerId, isHost){
    let playerIndex = this.getPlayerIndex(playerId);
    if(playerIndex < 0){
      return false;
    }
    //let player = this.players[playerIndex];

    switch (data.action){
      case 'next': // {action: next} Next trigger in normal statemachine flow
        if(!isHost) { // Only master can advance the game to the next step
          return false;
        }
        this.next();
        break;
      case 'vote': // {action: vote, vote: otherplayernumber}
        this.vote(playerIndex+1, data.vote);
        break;
    }
  }
  playerUpdate(playerId){
    // This method send actual information to the player who is reconnecting
    let index = this.getPlayerIndex(playerId);
    if(index < 0){
      // Player is not in the game, send public game info
      this.directMessageCallback(playerId, "gameStatus", {
        "game": this.publicInfo()
      });
      return false; // No player
    }
    this._playerUpdate(this.players[index]);
    return true;
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

  /* Game info */
  getPlayerIndex(playerId){
    return this.players.findIndex(player=>player.id === playerId);
  }

  _playerUpdate(player){
    this.directMessageCallback(player.id, "gameStatus", {
      "game": this.publicInfo(),
      "you": this._playerPrivateInfo(player)
    });
  }

  static _playerPrivateInfo(player, deep = true){
    let privateInfo = {
      number: player.number,
      name: player.name,
      isAlive: player.isAlive,
      role: this._roleName(player.role)
    };

    if(!deep){
      return privateInfo;
    }
    if(player.isMafia){ // Mafia knows each other
      this.mafia = this.players
          .filter(mafiaPlayer => mafiaPlayer.isMafia)
          .map(mafiaPlayer => this._playerPrivateInfo(mafiaPlayer, false));
    }

    if(player.role === MafiaRoles.Master) { // Master knows everything about everyone
      this.players = this.players
          .map(somePlayer => this._playerPrivateInfo(somePlayer, false));
    }
    return privateInfo;
  }

  static _playerPublicInfo(player){
    let publicInfo = {
      number: player.number,
      name: player.name,
      isAlive: player.isAlive,
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
  /* /end of Game info */


  static shuffle(numberOfCards){
    // This method generates an array of roles based on number of players
    let cardsToPlay = CardsDeck.slice(numberOfCards);
    cardsToPlay.sort(() => Math.random() - 0.5); // Shuffle the array, solution from here: https://javascript.info/task/shuffle
    return cardsToPlay;
  }

  kick(playerId){
    let playerIndex = this.getPlayerIndex(playerId);
    if(playerIndex >= 0){
      this._kill(playerIndex+1);
    }
  }
  _kill(playerNumber){
    let player = this.players[playerNumber-1];
    player.isAlive = false;
    this.directMessageCallback(player.id, "gameOver", {"you":this._playerPrivateInfo(player)});
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
  }
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
    this.candidates = this.checkCandidates();
    this.votes = {};
    this.mafiaVotes = this.gameState === GameStates.Night;
    this.autoCompleteVote = false; //autoCompleteVote || mafiaOnly;
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

    if(this.votes.length === 0){
      if(this.isVoteMandatory && this.gameState === GameStates.MainVote){
        // No one voted - their problems, someone will die!
        this.votes.push([this.whoShouldVote()[0].number, unusedVotesCounter]);
        return true;
      }
      return false; // No one voted
    }

    if(this.mafiaVotes && this.isMafiaVoteUnanimous){
      if(unusedVotesCounter > 0 || this.votes.length > 1){
        return false;
      }
    }

    if(this.isVoteMandatory && !this.mafiaVotes){
      // Add all unused votes to the smallest player number
      this.votes.sort(element => element[0]);
      this.votes[0][1] += unusedVotesCounter;
    }

    this.votes.sort(element => -element[1]); // Sort by votes in reverse order

    // noinspection RedundantIfStatementJS
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


