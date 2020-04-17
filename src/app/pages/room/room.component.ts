import { Component, OnDestroy, OnInit } from '@angular/core';
import {Subscription, timer} from 'rxjs';
import { ChatService } from '../../services/chat.service';
import {filter, takeWhile} from 'rxjs/operators';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  private countdownSubject: Subscription;
  private gameSubject: Subscription;
  private roomSubject: Subscription;
  private receiverSubject: Subscription;
  private settingsSubject: Subscription;
  countdown:number = 0;
  game: IGame = undefined;
  votedFor: number = null;
  isHost: boolean = false;
  messages: string[];
  newMessage: string;
  wakeUpReady: boolean;
  wakeUpTimer: any;
  player: IYou = undefined;
  gamePlayers: any[] = [];
  roomPlayers: any[] = [];
  players: IPlayer[] = [];
  guests: IPlayer[] = [];
  roomLink: string;
  state: string;
  userName: string;
  videoLink = '';
  dayTime: string;
  endGameMessage: string;
  winner: string;
  showHint = true;
  autoJoin = true;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.messages = [];
    this.roomLink = this.chatService.roomLink;
    this.userName = this.chatService.userName;

    this.receiverSubject = this.chatService.receiveMessages().subscribe((message: string) => {
      this.messages.push(message);
    });
    this.gameSubject = this.chatService.gameSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('gameSubject', data);
        const {event, game, players, you} = data;
        this.game = game;
        this.player = you;

        this.gamePlayers = players || this.gamePlayers;
        this.updateLists();

        if (!game.gameOn) {
          this.countdown = 0;
        }
        if (this.countdownSubject) {
          this.countdownSubject.unsubscribe();
        }
        let countdown = game.countdown || 0;
        if (countdown && game.gameState === 'Night' && this.player.role === 'Civilian') {
          const wakeUpTime = Math.floor(countdown * Math.random() * 0.5);
          console.log('wake up in', wakeUpTime);
          if (this.wakeUpTimer){
            clearTimeout(this.wakeUpTimer);
          }
          this.wakeUpReady = false;
          this.wakeUpTimer = setTimeout(() => {
            console.log('ready to wake up');
            this.votedFor = null;
            this.wakeUpReady = true;
            this.wakeUpTimer = null;
          }, wakeUpTime * 1000);
          this.countdown = 0;
        }else{
          if (event !== 'vote' && event !== 'joined') {
            // If the event was vote - do not flush some local variables
            this.votedFor = null;
            if (this.wakeUpTimer){
              console.log("clear wakeUpTimer");
              clearTimeout(this.wakeUpTimer);
              this.wakeUpTimer = null;
            }
          }
        }
        this.countdownSubject = timer(1000, 1000)
          .pipe(takeWhile(() => countdown > 0))
          .subscribe(() => {
            --countdown;
            this.countdown = countdown;
          });
        this.dayTime = game.gameState === 'Night' ? 'Night' : 'Day';
        this.state = game.dayNumber > 0 ? game.gameOn ? 'on' : 'over' : 'about to start';
        if (event === 'started') {
          this.winner = '';
          this.endGameMessage = '';
        }
        if (event === 'ended') {
          this.winner = game.civiliansWin ? '=== Civilians win ===' : '=== Mafia wins===';
          switch(this.player.role) {
            case 'Guest':
              break;
            case 'Mafia':
              this.endGameMessage = !game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
              break;
            default:
              this.endGameMessage = game.civiliansWin ? 'That\'s your team, congratulations!!!' : 'Sorry :(';
          }
        }
      });
    this.roomSubject = this.chatService.roomSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data: any) => {
        console.log('>> roomSubject', data);
        this.roomLink = this.chatService.roomLink;
        this.isHost = this.player && [this.player.name, this.player.userId].some((field) => field === data.host);
        this.roomPlayers = data.players || this.roomPlayers;
        this.updateLists();
        this.videoLink = data.videoLink || this.videoLink;
        this.votedFor = null;
      });
    this.settingsSubject = this.chatService.settingsSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data) => {
        this.autoJoin = data.settings.autoJoin;
      });
  }

  updateLists(){
    // This function builds two lists: active game players and people in the room
    // Update online/offline status
    this.gamePlayers.forEach(player => {
      const roomPlayer = this.roomPlayers.find(roomPl => roomPl.name === player.name);
      if (!roomPlayer) { // this player was kicked out of the game
        player.isOnline = false;
        return;
      }
      player.isOnline = roomPlayer.isOnline;
    });
    // Split the list
    this.players = this.gamePlayers.filter(player => player.role !== 'Guest');
    this.guests = this.gamePlayers.filter(player => player.role === 'Guest');
  }
  civilianRole(role){
    return role === 'Civilian' || role === 'Detective';
  }
  mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }
  candidates(){
    return this.players.filter(player => player.isCandidate);
  }
  voteButtonCaption(){
    // TODO: make into variable and calculate once per phase
    if (!this.player.isAlive || !this.game.gameOn){ // Dead don't vote
      return null;
    }
    switch (this.game.gameState){
      case 'Discussion':
        return 'suspect';
      case 'MainVote':
        return 'guilty';
      case 'LastWord': // No buttons in this state
        return null;
      case 'Night':
        if (this.mafiaRole(this.player.role)){
          return 'murder';
        }
        if (this.player.role === 'Detective'){
          return 'investigate';
        }
    }
    return null; // Don't show button in any other scenario
  }
  phaseCaption() {
    const phases = {
      LastWord: {
        Guest: 'Last words of convicted',
        Mafia: 'Last words of convicted',
        Civilian: 'Last words of convicted',
        Detective: 'Last words of convicted'
      },
      Discussion: {
        Guest: '',
        Mafia: 'Deceive civilians',
        Civilian: 'Discuss your suspicions',
        Detective: 'Look out for mafia'
      },
      MainVote: {
        Guest: 'The jury is out',
        Mafia: 'Who to vote for?',
        Civilian: 'Who is guilty?',
        Detective: 'Choose wisely'
      },
      Night: {
        Guest: 'Dark deeds',
        Mafia: 'Choose your victim',
        Civilian: 'Sleep well',
        Detective: 'Who to check?'
      },
      Tiebreaker: {
        Guest: 'There was a tie',
        Mafia: 'Do you want to kill them?',
        Civilian: 'What is your verdict?',
        Detective: 'What is your verdict?',
      }
    };
    const role = this.player.isAlive ? this.player.role : 'Guest';
    return phases[ this.game.gameState][role] || phases[ this.game.gameState]['Guest'];
  }
  hintCaption() {
    const hints = {
      LastWord: {
        Guest: 'Found guilty have a chance to say their last piece',
        Mafia: 'Found guilty have a chance to say their last piece',
        Civilian: 'Found guilty have a chance to say their last piece',
        Detective: 'Found guilty have a chance to say their last piece'
      },
      Discussion: {
        Guest: 'Players are discussing who are the suspects',
        Mafia: 'Be active, deceive civilians to convict innocent. Suspect someone wisely',
        Civilian: 'Talk to other players and try to find mafia and prove your position to other players. Then chose who do you suspect',
        Detective: 'Try to steer the civilians to eliminate mafia. Do not blow your cover, the vote is open'
      },
      MainVote: {
        Guest: 'The jury is out to reach the verdict',
        Mafia: 'Choose who to vote for, keep in mind that the vote is open',
        Civilian: 'Choose who is mafia',
        Detective: 'Choose who to vote for, keep in mind that the vote is open'
      },
      Night: {
        Guest: 'Mafia kills, Detective investigates, Civilians sleep',
        Mafia: 'Choose who to murder. Remember, you need majority shoot, the tie will miss',
        Civilian: 'Wake up once the button is unlocked',
        Detective: 'Choose who to investigate. Tomorrow you\'ll know the team of that player'
      },
      Tiebreaker: {
        Guest: 'There was a tie, now jury decides the fate of all accused',
        Mafia: 'Think: is it good for you too kill all the accused?',
        Civilian: 'Think: is it good for you too kill all the accused?',
        Detective: 'Think: is it good for you too kill all the accused?'
      }
    };
    const role = this.player.isAlive ? this.player.role : 'Guest';
    const hint = hints[ this.game.gameState][role] || hints[ this.game.gameState]['Guest'];
    return `Hint: ${hint}`;
  }
  clearChat() {
    this.messages = [];
  }

  join() {
    this.chatService.joinRoom({
      roomId: this.chatService.roomId,
      userId: this.userName,
      userName: this.userName
    });
  }

  toggleJoinGame() {
    this.chatService.joinGame(!this.autoJoin);
  }

  kick(playerId: string) {
    this.chatService.kickPlayer(playerId);
  }

  next() {
    this.chatService.next();
  }

  sendMessage() {
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  startGame() {
    this.votedFor = null;
    this.chatService.startGame();
  }

  vote(playerNumber) {
    this.votedFor = playerNumber;
    this.chatService.vote(Number(playerNumber));
  }

  ngOnDestroy(): void {
    if (this.countdownSubject) {
      this.countdownSubject.unsubscribe();
    }
    this.gameSubject.unsubscribe();
    this.roomSubject.unsubscribe();
    this.receiverSubject.unsubscribe();
    this.settingsSubject.unsubscribe();
  }

}

interface IGame {
  civiliansWin: boolean;
  countdown: number;
  dayNumber: number;
  gameOn: boolean;
  gameState: string;
  host: string;
  news: any;
  tiebreakerVoted: any;
}

interface IPlayer {
  isAlive: boolean;
  isCandidate: boolean;
  isOnline: boolean;
  name: string;
  number: number;
  role: string;
  votedBy: IVoter[];
}

interface IVoter {
  name: string;
  number: number;
  role: string|null;
}

interface IYou{
  isAlive: boolean;
  name: string;
  number: number;
  role: string;
  userId: string;
}
