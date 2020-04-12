import { Component, OnDestroy, OnInit } from '@angular/core';
import {Subscription, timer} from 'rxjs';
import { ChatService } from '../../services/chat.service';
import {filter, takeWhile} from 'rxjs/operators';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private countdownSubject: Subscription;
  private gameSubject: Subscription;
  private roomSubject: Subscription;
  private receiverSubject: Subscription;
  countdown = 0;
  game: any = {};
  votedFor: number = null;
  host: string = undefined;
  messages: string[];
  newMessage: string;
  wakeUpReady: boolean;
  wakeUpTimer: any;
  player: any = undefined;
  gamePlayers: any[] = [];
  roomPlayers: any[] = [];
  players: any[] = [];
  guests: any[] = [];
  roomLink: string;
  state: string;
  userName: string;
  videoLink: string;
  isMafia: boolean;
  dayTime: string;
  endGameMessage: string;
  phaseMessage: string;
  winner: string;
  hint: string;
  showHint: boolean;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.roomLink = this.chatService.roomLink;
    this.userName = this.chatService.userName;

    this.gameSubject = this.chatService.gameState.subscribe((state) => {
      console.log('>> gameState', state);
      this.state = state;
    });
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('gameSubject', data);
        const {event, game, players, you} = data;
        this.game = game;
        this.player = you;
        this.gamePlayers = players || [];
        this.isMafia = this.mafiaRole(this.player.role);
        this.updateLists();

        if (!game.gameOn) {
          this.countdown = 0;
        }
        if (this.countdownSubject) {
          this.countdownSubject.unsubscribe();
        }
        let countdown = game.countdown || 0;
        if (countdown) {
          let wakeUpTime = Math.floor(countdown * Math.random() * 0.5);
          console.log('wake up in', wakeUpTime);
          clearTimeout(this.wakeUpTimer);
          this.wakeUpTimer = setTimeout(() => {
            console.log('ready to wake up');
            this.wakeUpReady = true;
          }, wakeUpTime * 1000);
          this.countdown = 0;
        }
        this.countdownSubject = timer(1000, 1000)
          .pipe(takeWhile(() => countdown > 0))
          .subscribe(() => {
            --countdown;
            this.countdown = countdown;
          });
        if (event !== 'vote' && event !== 'joined'){
          // If the event was vote - do not flush some local variables
          this.votedFor = null;
          this.wakeUpReady = false;
          if (this.wakeUpTimer){
            clearTimeout(this.wakeUpTimer);
            this.wakeUpTimer = null;
          }
        }

        switch (game.gameState) {
          case 'Discussion':
            this.phaseMessage = 'Discuss your suspicions';
            break;
          case 'Night':
            this.phaseMessage = this.isMafia ? 'Choose who to kill' : 'Wait for the day';
            break;
          case 'MainVote':
          default:
            this.phaseMessage = game.gameState;
        }
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
    this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('>> roomSubject', data);
        this.roomLink = this.chatService.roomLink;

        this.host = data.host;
        this.roomPlayers = data.players || [];
        this.updateLists();
        this.videoLink = data.videoLink || '';
        this.votedFor = null;
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
    this.players = this.gamePlayers.filter(player => this.game.gameOn && player.role !== 'Guest');
    this.guests = this.gamePlayers.filter(player => !this.game.gameOn || player.role === 'Guest');
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
  clearChat() {
    this.messages = [];
  }

  join() {
    this.chatService.joinRoom({
      roomId: this.chatService.roomId,
      userId: this.userName,
      userName: this.userName
    });
  }

  next() {
    this.chatService.next();
  }

  sendMessage() {
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  startGame() {
    this.votedFor = null;
    this.chatService.startGame();
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
    this.receiverSubject.unsubscribe();
  }

}
