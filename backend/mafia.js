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

/*
  Game protocol for the client:
  GameAction:
    {action:next} (host only)
    {action:vote, vote: number} (any player)


  direct messages:
    {event: "gameStatus", data: {event:..., game:..., players:..., you:..}} - game information, first send when game starts, then when player connects
      'you' represents current player information and everything he is allowed to know about the game
    {event: "gameOver", data:{you:...}}
*/

const TIMER_LATENCY = 1000; // One second we add to every timer to cover latency issues. Basically timer should end strictly after user sees 0 on his screen

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
  9 players: introduce detective
  11-13 players: 4 mafia
  14-16 players: 5 mafia

  Maybe we should introduce new game roles for larger rooms
 */
const CardsDeck = [
      MafiaRoles.Mafia,
      MafiaRoles.Civilian,
      MafiaRoles.Civilian,
      MafiaRoles.Civilian,
      MafiaRoles.Mafia,
      MafiaRoles.Civilian,  // 6 players
      MafiaRoles.Civilian,  // 7 players
      MafiaRoles.Mafia,     // 8 players
      MafiaRoles.Detective, // 9 players
      MafiaRoles.Civilian,  // 10 players
      MafiaRoles.Mafia,     // MafiaRoles.Don,       // 11 players
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
  Tiebreaker: 'Tiebreaker'                // Day - a tie during vote process
});


class MafiaGame {
  constructor(gameEventCallback,
              directMessageCallback,
              isVoteMandatory = true, // Is everyone must vote (unresolved votes go for the first player on the voting list)
              isMafiaVoteUnanimous = false, // Should mafia vote by unanimous (professional rules)
              discussionTimeout = 0, // Discussion phase - no time limit
              mainVoteTimeout = 30,  // 30 seconds to let them vote during day
              nightTimetout = 60,      // 60 seconds night time
              expectCivilianVoteAtNight = true, // Force civilians to vote somehow to enable open-eye game
              allowAutoCompleteVote = true // Complete vote automatically when all expected players votes
              )
  {
    this.isVoteMandatory = isVoteMandatory;
    this.isMafiaVoteUnanimous = isMafiaVoteUnanimous;
    this.expectCivilianVoteAtNight = expectCivilianVoteAtNight;
    this.allowAutoCompleteVote = allowAutoCompleteVote;

    this.gameEventCallback = gameEventCallback;
    this.directMessageCallback = directMessageCallback; // (playerId, eventName, eventData)
    this.gameOn = false;
    this.civiliansWin = false;
    this.gameState = GameStates.Discussion;
    this.discussionTimeout = discussionTimeout;
    this.mainVoteTimeout = mainVoteTimeout;
    this.nightTimetout = nightTimetout;
    this.players = [];
    this.detectiveKnows = [];
    this.votes = {};
    this.candidates = [];
  }

  /* External game interface, main game logic */
  start(players){
    //This method starts new game based on the array of player names
    let playersRoles = MafiaGame.shuffle(players.length); // Shuffle the roles

    // Generate states for everyPlayer
    this.players = players.map((player, index) => {
        // Return value for new_array
        let role = playersRoles[index];
        return {
          id: player.id,
          name: player.name,
          role: role,
          //isMaster: role === MafiaRoles.Master || hostId === player.id,
          //isMaster: role === MafiaRoles.Master || hostId === player.id,
          isMafia: MafiaGame._isMafiaRole(role),
          isAlive: MafiaGame._isActiveRole(role) // mark guests and master as dead - to prevent from voting
        }
    });
    this.players = this.players.filter(player => player.role !== MafiaRoles.Guest); // Remove guests, sorry
    this.players.forEach((player,index)=>{ player.number = index + 1 }); // Assign game numbers
    this.gameOn = true;
    this.gameState = GameStates.Discussion;
    this.detectiveKnows = [];

    this.startVote();

    this.informPlayers('started');
  }
  informPlayers(event = null){
    this.players.forEach(player => {
      this._playerUpdate(player, event);
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
    let timeout = 0;
    switch(this.gameState){
      case GameStates.Discussion:
        let voteResolve = this.resolveVote(); // Count vote outcome
        if(!voteResolve){ // No candidates during main phase
          // Edge case - no one voted at all
          console.log("Discussion: no one voted - keep talking");
          break; // Keep the state, restart the vote
        }
        if(this.votes.length === 1){
          // Single candidate during daytime vote - run tie breaker
          this.gameState = GameStates.Tiebreaker; // Front end must support this
          timeout = this.mainVoteTimeout;
          console.log("Discussion: one vote - tie breaker");
          break;
        }

        console.log("Discussion: switching to MainVote");
        this.gameState = GameStates.MainVote;
        timeout = this.mainVoteTimeout;
        break;

      case GameStates.MainVote:
        if(!this.resolveVote()){
          if(!this.votes.length){ // Edge case - no one voted at all
            console.log("MainVote: no one voted - restart the vote");
            break; // Keep the state, restart the vote
          }
          // tie breaker

          console.log("MainVote: switching to Tiebreaker");
          this.gameState = GameStates.Tiebreaker; // Front end must support this
          timeout = this.mainVoteTimeout;
          break;
        }

        console.log("MainVote: switching to Night");
        this._kill(this.votes[0][0]); // Kill a player
        this.gameState = GameStates.Night;
        timeout = this.nightTimetout;
        break;

      case GameStates.Night:
        if(this.resolveVote()) {
          this._kill(this.votes[0][0]);
        }

        console.log("MainVote: switching to Discussion");
        this.gameState = GameStates.Discussion;
        timeout = this.discussionTimeout;
        break;

      case GameStates.Tiebreaker:
        // People vote to kill both, or spare both: 0 or 1
        // TODO: check if it works, maybe redo how it works after UI implemented
        if(this.resolveVote() && this.votes[0][0] === 0){ // Failed vote = double tie - save both
          this.candidates.forEach(candidate => this._kill(candidate));
        }

        console.log("Tiebreaker: switching to Night");
        this.gameState = GameStates.Night;
        timeout = this.nightTimetout;
        break;
    }

    if(this.checkGameOver()){
      return;
    }
    this.startVote(); // restart the vote for the new state
    this.startTimer(timeout);
    this.informPlayers("next");
  }
  startTimer(timeout){
    console.debug("startTimer", timeout);
    if(this.timer){ // Stop old timer
      clearTimeout(this.timer);
      this.timer = null;
    }

    if(!timeout) {
      return;
    }
    this.timerStarted = Date.now();
    this.timerDuration = timeout*1000;
    this.timer = setTimeout(()=>{
      console.debug("time over");
      this.next(); // Always forces to the next step
    }, timeout*1000 + TIMER_LATENCY);
  }
  timeLeft(){
    if(!this.timer){
      return null;
    }
    return Math.floor((this.timerStarted + this.timerDuration - Date.now())/1000);
  }
  command(data, playerId, isHost){
    console.debug(">> command", data, playerId, isHost);

    let playerIndex = this.getPlayerIndex(playerId);
    if(playerIndex < 0){
      return false;
    }
    //let player = this.players[playerIndex];

    switch (data.action){
      case 'next': // {action: next} Next trigger in normal statemachine flow
        if(!isHost) { // Only host can advance the game to the next step
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
        game: this.publicInfo(),
        players: this.players.map(player => this._playerPublicInfo(player)),
        reason: "rejoin"
      });
      return false; // No player
    }
    this._playerUpdate(this.players[index], "rejoin");
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

  static _roleNameForDetective(role){
    if(MafiaGame._isMafiaRole(role)){
      return MafiaGame._roleName(MafiaRoles.Mafia);
    }
    return MafiaGame._roleName(MafiaRoles.Civilian);
  }
  /* /end of Role helpers */

  /* Game info */
  getPlayerIndex(playerId){
    return this.players.findIndex(player=>player.id === playerId);
  }

  _playerUpdate(player, reason){
    // publicInfo introduced here for optimization
    this.directMessageCallback(player.id, "gameStatus", {
      game: this.publicInfo(),
      players: this.players.map(otherPlayer => this._playerPublicInfo(otherPlayer, player)),
      you: this._playerPrivateInfo(player),
      event: reason
    });
  }

  _playerPrivateInfo(player){
    return {
      number: player.number,
      name: player.name,
      isAlive: player.isAlive,
      role: MafiaGame._roleName(player.role)
    };
  }

  _playerPublicInfo(player, requester=null){
    let publicInfo = {
      number: player.number,
      name: player.name,
      isAlive: player.isAlive,
      isCandidate: this.candidates.indexOf(player.number) >= 0
    };

    if(requester) {
      if (MafiaGame._isMafiaRole(requester.role) && MafiaGame._isMafiaRole(player.role)) {
        // mafia knows mafia
        publicInfo.role = MafiaGame._roleName(player.role);
      }
      if (requester.role === MafiaRoles.Detective) {
        // Detective knows people he checked
        if (this.detectiveKnows.indexOf(player.number) >= 0) {
          publicInfo.role = MafiaGame._roleNameForDetective(player.role);
        }
      }
      if (requester.role === MafiaRoles.Master) {
        // Master knows everyone
        publicInfo.role = MafiaGame._roleName(player.role);
      }

      if(player === requester){
         // That's me, I know my role
        publicInfo.role = MafiaGame._roleName(player.role);
      }
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
      countdown: this.timeLeft()
    };
  }
  /* /end of Game info */


  static shuffle(numberOfCards){
    // This method generates an array of roles based on number of players
    let cardsToPlay = CardsDeck.slice(0, numberOfCards);


    // Shuffle the array, solutions from here: https://javascript.info/task/shuffle
    //cardsToPlay.sort(() => Math.random() - 0.5); // Simple option, but not evenly distributed
    for (let i = cardsToPlay.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

      // swap elements array[i] and array[j]
      // we use "destructuring assignment" syntax to achieve that
      // you'll find more details about that syntax in later chapters
      // same can be written as:
      // let t = array[i]; array[i] = array[j]; array[j] = t
      [cardsToPlay[i], cardsToPlay[j]] = [cardsToPlay[j], cardsToPlay[i]];
    }

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
    this._playerUpdate(player, "gameOver");
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
        return this.votes.map(vote => parseInt(vote[0]));

      case GameStates.Tiebreaker:
        // if tie happens - people vote to kill all or spare all
        let tieCounter = this.votes[0][1];
        return this.votes.filter(item => item[1] === tieCounter).map(item => parseInt(item[0]));
    }
  }
  playersVoteCounts(player){
    return player && player.isAlive && (!this.mafiaVotes || player.isMafia);
  }
  whoCounts(){
    return this.players.filter(player => this.playersVoteCounts(player));
  }
  whoShouldVote(){
    if(this.expectCivilianVoteAtNight){ // All alive players must vote
      return this.players.filter(player => player.isAlive);
    }
    return this.whoCounts();
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
    this.autoCompleteVote = this.allowAutoCompleteVote && (this.gameState !== GameStates.Discussion);

    console.debug("startVote", this.gameState, this.candidates, this.allowAutoCompleteVote, (this.gameState !== GameStates.Discussion), this.autoCompleteVote);
    // Autocomplete doesn't work during discussion
  }
  vote(whoVotes, choicePlayer){
    if(!this.players[whoVotes-1]){ // Not a player
      return null;
    }
    let alreadyVoted = !!this.votes[whoVotes];
    this.votes[whoVotes] = choicePlayer; // Using array to have unique vote per player

    if(!alreadyVoted && this.players[whoVotes-1].role === MafiaRoles.Detective){
      // this is a detecitve. we remember that he knows about this player now, with next game update he will get information
      this.detectiveKnows.push(choicePlayer);
    }

    if(this.autoCompleteVote && this.checkAllVoted()){
      this.next();
    }
  }
  checkAllVoted(){
    // For automatic vote resolve - once everyone votes
    return !this.whoShouldVote().some(player => !(player.number in this.votes));
  }
  resolveVote(){
    // Didn't vote - vote goes to the first of the list
    let unusedVotesCounter = 0;

    if(this.isVoteMandatory || this.isMafiaVoteUnanimous){
      unusedVotesCounter = this.whoCounts().filter(player => !this.votes[player.number]).length;
    }

    // Count votes
    let votedDown = {};
    Object.keys(this.votes).forEach(author => {

      let choice = this.votes[author];
      if(!this.playersVoteCounts(this.players[author - 1])){ // Player shouldn't have voted, ignore his vote
        return;
      }
      if(!votedDown[choice]){
        votedDown[choice] = 0;
      }
      votedDown[choice] ++;
    });

    this.votes = Object.entries(votedDown);

    if(this.votes.length === 0){
      if(this.isVoteMandatory && this.gameState === GameStates.MainVote && this.whoShouldVote().length){
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
     this.informPlayers("ended");
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


