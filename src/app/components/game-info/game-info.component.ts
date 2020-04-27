import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import {IGame, IPlayer} from "../../interfaces";

@Component({
  selector: 'game-info',
  templateUrl: './game-info.component.html',
  styleUrls: ['./game-info.component.scss']
})
export class GameInfoComponent implements OnInit, OnChanges {
  @Input() game: IGame;
  @Input() player: IPlayer;
  dayEmoji: string;
  dayTime: string;
  showHint: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.game?.currentValue) {
      this.dayTime = changes.game.currentValue.gameState === 'Night' ? 'Night' : 'Day';
      this.dayEmoji = this.dayTime === 'Day' ? '☀️' : '🌜';
    }

    if (changes.game?.currentValue || changes.player?.currentValue) {
      this.phaseCaption();
    }
  }

  phaseCaption() {
    const phases = {
      LastWord: {
        Guest: '- Last words of convicted',
        Mafia: '- Last words of convicted',
        Civilian: '- Last words of convicted',
        Detective: '- Last words of convicted'
      },
      Discussion: {
        Guest: '',
        Mafia: '- Deceive civilians',
        Civilian: '- Discuss your suspicions',
        Detective: '- Look out for mafia'
      },
      MainVote: {
        Guest: '- The jury is out',
        Mafia: '- Who to vote for?',
        Civilian: '- Who is guilty?',
        Detective: '- Choose wisely'
      },
      Night: {
        Guest: '- Dark deeds',
        Mafia: '- Choose your victim',
        Civilian: '- Sleep well',
        Detective: '- Who to check?'
      },
      Tiebreaker: {
        Guest: '- There was a tie',
        Mafia: '- Do you want to kill them?',
        Civilian: '- What is your verdict?',
        Detective: '- What is your verdict?',
      }
    };
    const role = this.player.isAlive ? this.player.role : 'Guest';
    return phases[this.game.gameState][role] || phases[ this.game.gameState].Guest;
  }

}
