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
  private receiverSubject: Subscription;
  game: any = undefined;
  hasVoted: boolean = false;
  messages: string[];
  newMessage: string;
  player: any = undefined;
  players: any[] = [];
  roomLink: string;
  state: string;
  videoLink: string;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.gameSubject = this.chatService.gameState.subscribe((state) => {
      this.state = state;
    });
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        this.game = data.game;
        this.player = data.you;
        this.players = data.game.players || [];
        this.videoLink = data.game.videoLink || '';
        console.log(this.game);
      });
    this.roomLink = this.chatService.roomLink;
  }

  clearChat() {
    this.messages = [];
  }

  next() {
    this.chatService.next();
  }

  sendMessage() {
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  startGame() {
    this.chatService.startGame();
  }

  vote(playerNumber) {
    this.hasVoted = true;
    this.chatService.vote(parseInt(playerNumber));
  }

  ngOnDestroy(): void {
    this.gameSubject.unsubscribe();
    this.receiverSubject.unsubscribe();
  }

}
