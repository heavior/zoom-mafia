import {Component, OnDestroy, OnInit} from '@angular/core';
import { ChatService } from "../../services/chat.service";
import {BehaviorSubject, Subscription} from "rxjs";
import {filter, first} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  message: string;
  messages: string[];
  needsUsernameSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  receiverSubject: Subscription;
  username: string;

  constructor(private chatService: ChatService) { }

  get ready() {
    return this.needsUsernameSubject.getValue();
  }

  set ready(value) {
    this.needsUsernameSubject.next(value);
  }

  ngOnInit(): void {
    this.messages = [];
    this.needsUsernameSubject
      .pipe(filter((ready) => ready), first())
      .subscribe(() => {
        this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
          this.messages.push(message);
        });
      });
  }

  sendMessage() {
    this.chatService.sendMessage(this.message);
    this.messages.push(`${this.username}: ${this.message}`);
    this.message = '';
  }

  setUsername() {
    this.ready = true;
    this.chatService.setUsername(this.username);
  }

  ngOnDestroy(): void {
    this.receiverSubject.unsubscribe();
  }

}
