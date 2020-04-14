import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {
  @Input() currentDay: number;
  @Input() news: any[];
  @Input() player: any;
  @Input() civiliansWin: boolean;
  winner: string;

  constructor() { }

  ngOnInit(): void { }

  calcMessage(item) {
    const {event, players, roles} = item;
    let message = '';
    const playerNames = players.map(player => {
      return player.name === this.player.name ? `${player.name} (you)` : player.name;
    }).join(', ');
    const toBe = players.length === 1 ? 'was' : 'were';
    switch(event) {
      case 'acquitted':
        message = `${playerNames} ${toBe} acquitted by the jury`;
        break;
      case 'ended':
        this.winner = this.civiliansWin ? 'Civilians' : 'Mafia';
        message = `Last survivors ${playerNames}`;
        break;
      case 'guilty':
        message = `${playerNames} ${toBe} found guilty`;
        break;
      case 'left':
        message = `${playerNames} disconnected from the game`;
        break;
      case 'missed':
        message = 'Mafia missed';
        break;
      case 'murdered':
        const player = players[0];
        message = player.name === this.player.name ? 'You were murdered' : `${player.name} was murdered`;
        break;
      case 'started':
        message = `The game has started with ${this.getRoles(roles)}`;
        break;
      default:
        return 'Unknown event';
    }
    return message;
  }

  calcTime(item) {
    const {dayNumber, gameState} = item;
    const today = this.currentDay === dayNumber;
    let timeText = '';
    switch (gameState) {
      case 'Discussion':
      case 'Tiebreaker':
      case 'MainVote':
        timeText = today ? 'Today' : 'Yesterday';
        break;
      case 'Night':
      default:
        timeText = today ? 'This Night' : 'Last Night';
        break;
    }
    return timeText;
  }

  getRoles(roles) {
    return Object.entries(roles).reduce((roles, [role, count]) => {
      roles.push(`${role} ${count}`);
      return roles;
    }, []).join(', ');
  }

  votedBy(voters) {
    return `Voted in favor: ${voters.map(voter => voter.name).join(', ')}`;
  }

}
