import {Component, OnInit} from '@angular/core';
import { ChatService } from "../../services/chat.service";
import {BehaviorSubject} from "rxjs";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  joining: boolean = false;
  needsUsernameSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  userName: string;
  videoLink: string = '';

  constructor(private chatService: ChatService) { }

  get ready() {
    return this.needsUsernameSubject.getValue();
  }

  set ready(value) {
    this.needsUsernameSubject.next(value);
  }

  ngOnInit(): void {
    this.joining = !!this.chatService.roomId;
  }

  createRoom() {
    const data = {
      userId: this.userName,
      userName: this.userName,
      videoLink: this.videoLink
    };
    this.chatService.createRoom(data);
  }

  setUsername() {
    this.ready = true;
  }

}
