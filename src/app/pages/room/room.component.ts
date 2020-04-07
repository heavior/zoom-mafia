import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { ChatService } from "../../services/chat.service";

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private gameSubject: Subscription;
  private receiverSubject: Subscription;
  newMessage: string;
  messages: string[];
  roomLink: string;
  state: string;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.gameSubject = this.chatService.gameState.subscribe((state) => {
      this.state = state;
    });
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.roomLink = this.chatService.roomLink;
  }

  next() {}

  sendMessage() {
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  startGame() {
    this.chatService.startGame();
  }

  ngOnDestroy(): void {
    this.gameSubject.unsubscribe();
    this.receiverSubject.unsubscribe();
  }

}
