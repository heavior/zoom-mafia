import { Component, OnDestroy, OnInit } from '@angular/core';
import {Subscription, timer} from 'rxjs';
import {filter, takeWhile} from 'rxjs/operators';

import { IGame, IPlayer, ITitles, IYou} from '../../interfaces';
import { ChatService } from '../../services/chat.service';
import { StyleService } from '../../services/style.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private countdownSubject: Subscription;
  private gameSubject: Subscription;
  private roomSubject: Subscription;
  private wakeUpSubject: Subscription;

  countdown = 0;
  dayTime: string;
  endGameMessage: string;
  game: IGame = undefined;
  gamePlayers: any[] = [];
  guests: IPlayer[] = [];
  isHost = false;
  hostName = '';
  player: IYou = undefined;
  players: IPlayer[] = [];
  roomLink: string;
  roomPlayers: IPlayer[] = [];
  state: string;
  titles: ITitles = {
    guiltyTitle: '',
    notGuiltyTitle: ''
  };
  videoLink = '';
  votedFor: number = null;
  wakeUpReady: boolean;
  wakeUpIn: number;
  winner: string;

  constructor(private chatService: ChatService,
              private styleService: StyleService) { }

  static mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }

  private updateCounter(event, game) {
    if (!game.gameOn) {
      this.countdown = 0;
    }
    let countdown = game.countdown || 0;
    this.styleService.dayStyle = game.gameState;
    if (countdown && game.gameState === 'Night' && this.player.role === 'Civilian') {
      let wakeUpTime = Math.floor(countdown * Math.random() * 0.5);
      console.log('wake up in', wakeUpTime);
      if (this.wakeUpSubject){
        this.wakeUpSubject.unsubscribe();
        this.wakeUpSubject = undefined;
      }
      this.wakeUpReady = false;
      this.wakeUpSubject = timer(0, 1000)
        .pipe(takeWhile(() => wakeUpTime > 0))
        .subscribe(() => {
          --wakeUpTime;
          this.wakeUpIn = wakeUpTime;
          if (!wakeUpTime) {
            console.log('ready to wake up');
            this.votedFor = null;
            this.wakeUpReady = true;
          }
        });
      this.countdown = 0;
    } else if (event !== 'vote' && event !== 'joined') {
      // If the event was vote - do not flush some local variables
      this.votedFor = null;
      if (this.wakeUpSubject){
        console.log('clear wakeUpTimer');
        this.wakeUpSubject.unsubscribe();
        this.wakeUpSubject = undefined;
      }
      this.wakeUpIn = 0;
      this.countdown = 0;
    }
    if (this.countdownSubject) {
      this.countdownSubject.unsubscribe();
    }
    this.countdownSubject = timer(0, 1000)
      .pipe(takeWhile(() => countdown > 0))
      .subscribe(() => {
        --countdown;
        this.countdown = countdown;
      });
  }

  private updateGameState(event, game) {
    this.dayTime = game.gameState === 'Night' ? 'Night' : 'Day';
    this.state = game.dayNumber > 0 ? game.gameOn ? 'on' : 'over' : 'about to start';
    if (event === 'started') {
      this.winner = '';
      this.endGameMessage = '';
    }
    if (event === 'ended') {
      this.winner = game.civiliansWin ? '=== Civilians win ===' : '=== Mafia wins===';
      switch (this.player.role) {
        case 'Guest':
          break;
        case 'Mafia':
          this.endGameMessage = !game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
          break;
        default:
          this.endGameMessage = game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
      }
    }
    if (game.gameState === 'Tiebreaker') {
      if (game.tiebreakerVoted[-1].length) {
        this.titles.guiltyTitle = this.candidates().length === 1 ? 'Who voted for this player' : 'Who voted guilty';
      }
      if(game.tiebreakerVoted[0].length) {
        this.titles.notGuiltyTitle = 'Who voted not guilty';
      }
    }
  }

  private updateLists() {
    // This function builds two lists: active game players and people in the room
    // Update online/offline status
    this.gamePlayers.forEach(player => {
      const roomPlayer = this.roomPlayers.find(roomPl => roomPl.name === player.name);
      if (!roomPlayer) { // this player was kicked out of the game
        player.isOnline = false;
        return;
      }
      player.isOnline = roomPlayer.isOnline;
    });
    // Split the list
    this.players = this.gamePlayers.filter(player => player.role !== 'Guest');
    this.guests = this.gamePlayers.filter(player => player.role === 'Guest');
  }

  ngOnInit(): void {
    this.roomLink = this.chatService.roomLink;
    this.gameSubject = this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('gameSubject', data);
        const {event, game, players, you} = data;
        this.game = game;
        this.player = you;
        this.gamePlayers = players || this.gamePlayers;

        this.updateCounter(event, game);
        this.updateGameState(event, game);
        this.updateLists();
      });

    this.roomSubject = this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('>> roomSubject', data);
        this.roomLink = this.chatService.roomLink;
        this.hostName = data.host;
        this.isHost = this.player && [this.player.name, this.player.userId].some((field) => field === data.host);
        this.roomPlayers = data.players || this.roomPlayers;
        this.videoLink = data.videoLink || this.videoLink;
        // this.votedFor = null;
        this.updateLists();
      });
  }

  ngOnDestroy(): void {
    this.styleService.dayStyle = '';
    if (this.countdownSubject) {
      this.countdownSubject.unsubscribe();
    }
    this.gameSubject.unsubscribe();
    this.roomSubject.unsubscribe();
  }

  candidates(){
    return this.players.filter(player => player.isCandidate);
  }

  trackByName(user: IPlayer) {
    return user.name;
  }

  listTooltip(user: IPlayer) {
    const who = user.number === this.player.number ? 'you' : user.name;
    switch (this.game.gameState) {
      case 'Discussion':
        return `Who suspects ${who}`;
      case 'LastWord':
      case 'MainVote':
        return `Who voted ${who} guilty`;
      case 'Night':
        return `Who voted to murder ${who}`;

    }
  }

  // Helper functions for the vote button.
  voteButtonCaption(playerNumber) {
    // TODO: make into variable and calculate once per phase
    if (!this.player.isAlive || !this.game.gameOn){ // Dead don't vote
      return null;
    }
    switch (this.game.gameState){
      case 'Discussion':
        return playerNumber !== this.votedFor ? 'suspect' : 'drop charges';
      case 'MainVote':
        return 'guilty';
      case 'LastWord': // No buttons in this state
        return null;
      case 'Night':
        if (RoomComponent.mafiaRole(this.player.role)){
          return 'murder';
        }
        if (this.player.role === 'Detective'){
          return 'investigate';
        }
    }
    return null; // Don't show button in any other scenario
  }

  voteButtonClass(playerNumber) {
    const selectedOtherPLayer = this.votedFor && this.votedFor !== playerNumber;
    if (selectedOtherPLayer) {
      return 'btn-secondary';
    }
    switch (this.game.gameState) {
      case 'MainVote':
      case 'Night':
      case 'Tiebreaker':
        return 'btn-danger';
      default:
        return 'btn-primary';

    }
  }

  voteButtonDisabled() {
    switch (this.game.gameState) {
      case 'MainVote':
      case 'Night':
      case 'Tiebreaker':
        return this.votedFor !== null;
      default:
        return false;
    }
  }

  kick(playerId: string) {
    this.chatService.kickPlayer(playerId);
  }

  vote(playerNumber) {
    if (this.votedFor === playerNumber) {
       // Special case - unselect
      this.chatService.vote(-1);
      this.votedFor = null;
      return;
    }
    this.votedFor = playerNumber;
    this.chatService.vote(Number(playerNumber));
  }

  startGame(needConfirmation = false){
    if (!needConfirmation || confirm('Are you sure you want to restart the game? All progress will be lost for all players.')) {
      this.chatService.startGame();
      this.votedFor = null;
    }
  }

  next() {
    this.chatService.next();
  }
}
