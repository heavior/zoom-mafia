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
  userName: string;
  videoLink: string = '';

  constructor(private chatService: ChatService) { }

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

}
