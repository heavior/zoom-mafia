import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = '/';
  username: string;

  constructor() {
    this.socket = io(this.url,
      {
        query: {
          id: 'testroomid'
        }
      });
  }

  receiveMessages() {
    return new Observable((observer) => {
      this.socket.on('message', (data) => {
        observer.next(`${data.from}: ${data.msg}`);
      });
      this.socket.on('serverStatus', (message) => {
        observer.next(`ServerStatus: ${message}`);
      });
    });
  }

  sendMessage(msg) {
    this.socket.emit('message', { from: this.username, msg });
  }

  setUsername(username) {
    this.username = username;
    this.socket.emit('server', { action: 'usernameSet', username });
  }
}
