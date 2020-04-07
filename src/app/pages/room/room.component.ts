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
  messages: string[];
  newMessage: string;
  player: any = undefined;
  players: any[] = undefined;
  roomLink: string;
  state: string;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.gameSubject = this.chatService.gameState.subscribe((state) => {
      console.log(state);
      this.state = state;
    });
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        this.player = data.you;
        this.players = data.players;
      });
    this.roomLink = this.chatService.roomLink;
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

  vote() {
    this.chatService.vote(parseInt(this.newMessage));
    this.newMessage = '';
  }

  ngOnDestroy(): void {
    this.gameSubject.unsubscribe();
    this.receiverSubject.unsubscribe();
  }

}
