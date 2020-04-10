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

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.roomLink = this.chatService.roomLink;
    this.userName = this.chatService.userName;

    this.gameSubject = this.chatService.gameState.subscribe((state) => {
      console.log('>> gameState', state);
      this.state = state;
    });
    this.roomSubject = this.chatService.roomSubject.subscribe((data) => {
      console.log('>> roomSubject', data);
      this.roomLink = this.chatService.roomLink;
      // this.roomState = state;
    });
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('gameSubject', data);
        this.game = data.game;
        this.player = data.you;
        this.gamePlayers = data.players || [];
        this.updateLists();
        if (this.countdownSubject) {
          this.countdownSubject.unsubscribe();
        }
        let countdown = data.game.countdown || 0;
        if (countdown) {
          this.wakeUpTimer = setTimeout(() => {
            this.wakeUpReady = true;
          }, countdown * Math.random() * 0.5);
        }
        this.countdownSubject = timer(1000, 1000)
          .pipe(takeWhile(() => countdown > 0))
          .subscribe(() => {
            --countdown;
            this.countdown = countdown;
          });
        if (data.event !== 'vote'){
          // If the event was vote - do not flush some local variables
          this.votedFor = null;
          this.wakeUpReady = false;
          if (this.wakeUpTimer){
            clearTimeout(this.wakeUpTimer);
            this.wakeUpTimer = null;
          }
        }
      });
    this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('roomSubject', data);
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
