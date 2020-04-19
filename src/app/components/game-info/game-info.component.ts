import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import {IGame, IPlayer} from "../../interfaces";

@Component({
  selector: 'game-info',
  templateUrl: './game-info.component.html',
  styleUrls: ['./game-info.component.scss']
})
export class GameInfoComponent implements OnInit, OnChanges {
  @Input() countdown: number;
  @Input() game: IGame;
  @Input() player: IPlayer;
  dayTime: string;
  showHint: boolean = true;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.game?.currentValue) {
      this.dayTime = changes.game.currentValue.gameState === 'Night' ? 'Night' : 'Day';
    }

    if (changes.game?.currentValue || changes.player?.currentValue) {
      this.hintCaption();
      this.phaseCaption();
    }
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

}
