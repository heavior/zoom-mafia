import { Component, OnDestroy, OnInit } from '@angular/core';
import {Subscription, timer} from 'rxjs';
import {filter, takeWhile} from 'rxjs/operators';

import { IGame, IPlayer, IVoter, IYou} from "../../interfaces";
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
  countdown: number = 0;
  game: IGame = undefined;
  votedFor: number = null;
  isHost: boolean = false;
  wakeUpReady: boolean;
  wakeUpTimer: any;
  player: IYou = undefined;
  gamePlayers: any[] = [];
  roomPlayers: any[] = [];
  players: IPlayer[] = [];
  guests: IPlayer[] = [];
  roomLink: string;
  state: string;
  videoLink = '';
  dayTime: string;
  endGameMessage: string;
  winner: string;
  autoJoin = true;

  constructor(private chatService: ChatService) { }

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
        this.updateLists();

        if (!game.gameOn) {
          this.countdown = 0;
        }
        if (this.countdownSubject) {
          this.countdownSubject.unsubscribe();
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
        }else{
          if (event !== 'vote' && event !== 'joined') {
            // If the event was vote - do not flush some local variables
            this.votedFor = null;
            if (this.wakeUpTimer){
              console.log("clear wakeUpTimer");
              clearTimeout(this.wakeUpTimer);
              this.wakeUpTimer = null;
            }
          }
        }
        this.countdownSubject = timer(1000, 1000)
          .pipe(takeWhile(() => countdown > 0))
          .subscribe(() => {
            --countdown;
            this.countdown = countdown;
          });
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
      });
    this.roomSubject = this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('>> roomSubject', data);
        this.roomLink = this.chatService.roomLink;
        this.isHost = this.player && [this.player.name, this.player.userId].some((field) => field === data.host);
        this.roomPlayers = data.players || this.roomPlayers;
        this.updateLists();
        this.videoLink = data.videoLink || this.videoLink;
        this.votedFor = null;
      });
    this.settingsSubject = this.chatService.settingsSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data) => {
        this.autoJoin = data.settings.autoJoin;
      });
  }

  updateLists(){
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
  civilianRole(role){
    return role === 'Civilian' || role === 'Detective';
  }
  mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }
  candidates(){
    return this.players.filter(player => player.isCandidate);
  }
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
        if (this.mafiaRole(this.player.role)){
          return 'murder';
        }
        if (this.player.role === 'Detective'){
          return 'investigate';
        }
    }
    return null; // Don't show button in any other scenario
  }

  disableButton(samePlayer) {
    switch(this.game.gameState) {
      case 'MainVote':
      case 'Night':
      case 'Tiebreaker':
        return this.votedFor !== null;
      default:
        return samePlayer;
    }
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

  toggleJoinGame() {
    this.chatService.joinGame(!this.autoJoin);
  }

  kick(playerId: string) {
    this.chatService.kickPlayer(playerId);
  }

  vote(playerNumber) {
    this.votedFor = playerNumber;
    this.chatService.vote(Number(playerNumber));
  }

  ngOnDestroy(): void {
    if (this.countdownSubject) {
      this.countdownSubject.unsubscribe();
    }
    this.gameSubject.unsubscribe();
    this.roomSubject.unsubscribe();
    this.settingsSubject.unsubscribe();
  }

}
