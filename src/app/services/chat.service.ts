import {Inject, Injectable} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {ActivatedRoute, Router} from "@angular/router";
import * as io from 'socket.io-client';
import {BehaviorSubject, fromEvent, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = '/';
  data: any = {};
  gameState: BehaviorSubject<string> = new BehaviorSubject('');
  gameSubject: BehaviorSubject<any> = new BehaviorSubject(undefined);
  roomSubject: BehaviorSubject<any> = new BehaviorSubject(undefined);
  roomLink: string = '';

  constructor(@Inject(DOCUMENT) private document: Document,
              private route: ActivatedRoute,
              private router: Router) {
    this.socket = io(this.url);
    // @ts-ignore
    this.init();
  }

  private init() {
    this.socket.on('roomEvent', (data) => {
      console.log(data);
      switch(data.event) {
        case 'created':
        case 'joined':
          this.roomId = data.id;
          this.roomLink = `${this.document.location.origin}/${data.id}`;
          Object.assign(data, this.data);
          this.roomSubject.next(data);
          return this.router.navigate([`/${data.id}`]);
/*        case "playerConnected":
          let state = this.gameState.getValue();
          delete data['event'];
          this.roomSubject.next(Object.assign({}, state, data));
          break;  */
        default:
          this.roomSubject.next(data);
          return;
      }
    });

    setTimeout(() => {
      this.roomId = this.router.url.replace('/', '');
      const oldRoomId = localStorage.getItem('roomId');
      const userName = localStorage.getItem('userName');
      if (userName && oldRoomId === this.roomId) {
        this.userName = userName;
        this.joinRoom({...this.data})
      } else {
        localStorage.clear();
      }
    });

    fromEvent(window, 'beforeunload').subscribe(() => {
      localStorage.setItem('roomId', this.roomId);
      localStorage.setItem('userName', this.userName);
    });
  }

  createRoom(data) {
    this.userName = data.userName;
    Object.assign(data, {action: 'create'});
    this.socket.emit('roomCommand', data);
  }

  joinRoom(data) {
    this.userName = data.userName;
    Object.assign(data, {action: 'join'});
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
      /*this.socket.on('gameEvent', (message) => {
        observer.next('gameEvent' + JSON.stringify(message, null, 2));
        let game = Object.assign({}, this.gameSubject.getValue(), message);
        this.gameSubject.next(game);
      });*/
      this.socket.on('roomEvent', (message) => {
        observer.next('roomEvent' + JSON.stringify(message, null, 2));
      });
      this.socket.on('directMessage', (message) => {
        observer.next('directMessage' + JSON.stringify(message, null, 2));
        switch (message.event) {
          case 'gameStatus':
            this.gameSubject.next(message.data);
            break;
          default:
            break;
        }
      });
    });
  }

  sendMessage(msg) {
    this.socket.emit('message', { from: this.userName, msg });
  }

  startGame() {
    this.socket.emit('roomCommand', { action: 'startGame'});
  }

  vote(choice: number) {
    this.socket.emit('gameCommand', {action: 'vote', vote: choice});
  }

  get roomId() {
    return this.data.roomId;
  }

  set roomId(roomId) {
    this.data.roomId = roomId;
  }

  get userName() {
    return this.data.userName;
  }

  set userName(userName) {
    this.data.userId = userName;
    this.data.userName = userName;
  }

  get videoLink() {
    return this.data.videoLink;
  }

  set videoLink(videoLink) {
    this.data.videoLink = videoLink;
  }
}
