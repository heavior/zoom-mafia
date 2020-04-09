import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { ChatService } from "../../services/chat.service";
import { filter } from "rxjs/operators";

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private gameSubject: Subscription;
  private roomSubject: Subscription;
  private receiverSubject: Subscription;
  game: any = {};
  hasVoted: boolean = false;
  host: string = undefined;
  messages: string[];
  newMessage: string;
  player: any = undefined;
  gamePlayers: any[] = [];
  roomPlayers: any[] = [];
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
      console.log("gameState", state);
      this.state = state;
    });
    this.roomSubject = this.chatService.roomSubject.subscribe((data) => {
      console.log("roomSubject", data);
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
        this.hasVoted = false;
      });
    this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('roomSubject', data);
        this.host = data.host;
        this.roomPlayers = data.players || [];
        this.videoLink = data.videoLink || '';
        this.hasVoted = false;
      });
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
    this.hasVoted = false;
    this.chatService.startGame();
  }

  vote(playerNumber) {
    this.hasVoted = true;
    this.chatService.vote(parseInt(playerNumber));
  }

  ngOnDestroy(): void {
    this.gameSubject.unsubscribe();
    this.roomSubject.unsubscribe();
    this.receiverSubject.unsubscribe();
  }

}
