import {Inject, Injectable} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {ActivatedRoute, Router} from "@angular/router";
import * as io from 'socket.io-client';
import {BehaviorSubject, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = 'http://localhost:8080';
  data: any = {};
  gameState: BehaviorSubject<string> = new BehaviorSubject('');
  roomLink: string = '';

  constructor(@Inject(DOCUMENT) private document: Document,
              private route: ActivatedRoute,
              private router: Router) {
    this.socket = io(this.url);
    // @ts-ignore
    this.data.roomId = this.route.queryParams.value.id || '';
    this.init();
  }

  private init() {
    this.socket.on('roomEvent', (data) => {
      console.log(data);
      switch(data.event) {
        case 'created':
        case 'joined':
          this.data.roomId = data.id;
          this.roomLink = `${this.document.location.origin}?id=${data.id}`;
          return this.router.navigate(['room']);
        case 'start':
        case 'discussion':
        case 'night':
        case 'vote':
          this.gameState.next(data.event);
          break;
        default:
          return;
      }
    });
  }

  createRoom() {
    const data = Object.assign({}, this.data, {action: 'create'});
    this.socket.emit('roomCommand', data);
  }

  joinRoom() {
    const data = Object.assign({}, this.data, {action: 'join'});
    this.socket.emit('roomCommand', data);
  }

  next() {
    this.socket.emit('gameCommand', {action: 'next'});
  }

  receiveMessages() {
    return new Observable((observer) => {
      this.socket.on('message', (data) => {
        observer.next(`${data.from}: ${data.msg}`);
      });
      this.socket.on('serverStatus', (message) => {
        observer.next(`ServerStatus: ${message}`);
      });
      this.socket.on('gameEvent', (message) => {
        observer.next('gameEvent' + JSON.stringify(message, null, 2));
      });
      this.socket.on('roomEvent', (message) => {
        observer.next('roomEvent' + JSON.stringify(message, null, 2));
      });
      this.socket.on('directMessage', (message) => {
        observer.next('directMessage' + JSON.stringify(message, null, 2));
      });
    });
  }

  sendMessage(msg) {
    this.socket.emit('message', { from: this.userName, msg });
  }

  startGame() {
    this.socket.emit('roomCommand', { action: 'startGame'});
  }

  vote(vote: number) {
    this.socket.emit('gameCommand', {action: 'vote', 'vote': vote});
  }

  get roomId() {
    return this.data.roomId;
  }

  get userName() {
    return this.data.userName;
  }

  set userName(userName) {
    this.data.userId = userName;
    this.data.userName = userName;
    this.socket.emit('server', { action: 'setUserName', userName });
  }

  get videoLink() {
    return this.data.videoLink;
  }

  set videoLink(videoLink) {
    this.data.videoLink = videoLink;
  }
}
