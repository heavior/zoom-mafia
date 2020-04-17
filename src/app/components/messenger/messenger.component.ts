import {Component, OnDestroy, OnInit} from '@angular/core';
import { ChatService } from "../../services/chat.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'messenger',
  templateUrl: './messenger.component.html',
  styleUrls: ['./messenger.component.scss']
})
export class MessengerComponent implements OnInit, OnDestroy {
  messages: string[];
  newMessage: string;

  messageSubject: Subscription;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.messageSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
  }

  ngOnDestroy(): void {
    this.messageSubject.unsubscribe();
  }

  clearChat() {
    this.messages = [];
  }

  sendMessage() {
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

}
