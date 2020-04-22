import { Component, OnDestroy, OnInit } from '@angular/core';
import {Subscription, timer} from 'rxjs';
import {filter, takeWhile} from 'rxjs/operators';

import { IGame, IPlayer, IYou} from "../../interfaces";
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private countdownSubject: Subscription;
  private gameSubject: Subscription;
  private roomSubject: Subscription;
  private settingsSubject: Subscription;

  autoJoin: boolean = true;
  hideRoomInfo: boolean = true;
  countdown: number = 0;
  dayTime: string;
  endGameMessage: string;
  game: IGame = undefined;
  gamePlayers: any[] = [];
  guests: IPlayer[] = [];
  isHost: boolean = false;
  hostName: string = '';
  player: IYou = undefined;
  players: IPlayer[] = [];
  roomLink: string;
  roomPlayers: IPlayer[] = [];
  state: string;
  videoLink: string = '';
  votedFor: number = null;
  wakeUpReady: boolean;
  wakeUpTimer: any;
  winner: string;

  constructor(private chatService: ChatService) { }

  static mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }

  private updateCounter(event, game) {
    if (!game.gameOn) {
      this.countdown = 0;
    }
    let countdown = game.countdown || 0;
    if (countdown && game.gameState === 'Night' && this.player.role === 'Civilian') {
      const wakeUpTime = Math.floor(countdown * Math.random() * 0.5);
      console.log('wake up in', wakeUpTime);
      if (this.wakeUpTimer){
        clearTimeout(this.wakeUpTimer);
      }
      this.wakeUpReady = false;
      this.wakeUpTimer = setTimeout(() => {
        console.log('ready to wake up');
        this.votedFor = null;
        this.wakeUpReady = true;
        this.wakeUpTimer = null;
      }, wakeUpTime * 1000);
      this.countdown = 0;
    } else if (event !== 'vote' && event !== 'joined') {
      // If the event was vote - do not flush some local variables
      this.votedFor = null;
      if (this.wakeUpTimer){
        console.log("clear wakeUpTimer");
        clearTimeout(this.wakeUpTimer);
        this.wakeUpTimer = null;
      }
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
      switch(this.player.role) {
        case 'Guest':
          break;
        case 'Mafia':
          this.endGameMessage = !game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
          break;
        default:
          this.endGameMessage = game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
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
        //this.votedFor = null;

        this.updateLists();
      });

    this.settingsSubject = this.chatService.settingsSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data) => {
        this.autoJoin = data.settings.autoJoin;
      });
  }

  ngOnDestroy(): void {
    if (this.countdownSubject) {
      this.countdownSubject.unsubscribe();
    }
    this.gameSubject.unsubscribe();
    this.roomSubject.unsubscribe();
    this.settingsSubject.unsubscribe();
  }

  candidates(){
    return this.players.filter(player => player.isCandidate);
  }

  trackByName(user: IPlayer) {
    return user.name;
  }

  // Helper functions for the vote button.
  voteButtonCaption(){
    // TODO: make into variable and calculate once per phase
    if (!this.player.isAlive || !this.game.gameOn){ // Dead don't vote
      return null;
    }
    switch (this.game.gameState){
      case 'Discussion':
        return 'suspect';
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

  voteButtonClass(selected, unselected) {
    if (!selected && unselected) {
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

  voteButtonDisabled(samePlayer) {
    switch(this.game.gameState) {
      case 'MainVote':
      case 'Night':
      case 'Tiebreaker':
        return this.votedFor !== null;
      default:
        return samePlayer;
    }
  }

  kick(playerId: string) {
    this.chatService.kickPlayer(playerId);
  }

  toggleJoinGame() {
    this.chatService.joinGame(!this.autoJoin);
  }

  vote(playerNumber) {
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
