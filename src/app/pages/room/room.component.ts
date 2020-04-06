import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { ChatService } from "../../services/chat.service";

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  message: string;
  messages: string[];
  receiverSubject: Subscription;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
  }

  sendMessage() {
    this.chatService.sendMessage(this.message);
    this.messages.push(`${this.chatService.userName}: ${this.message}`);
    this.message = '';
  }

  ngOnDestroy(): void {
    this.receiverSubject.unsubscribe();
  }

}
