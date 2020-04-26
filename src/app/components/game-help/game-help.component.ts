import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';

@Component({
  selector: 'game-help',
  templateUrl: './game-help.component.html',
  styleUrls: ['./game-help.component.scss']
})
export class GameHelpComponent implements OnInit, OnChanges {
  @Input() game: any;
  @Input() player: any;

  _showHint: boolean = false;
  _showRules: boolean = true;
  private storageShowHint: boolean;
  private storageShowRules: boolean;

  constructor() { }

  get showHint() {
    return this._showHint;
  }
  get showRules() {
    return this._showRules;
  }
  set showHint(value) {
    localStorage.setItem('showHint', value.toString());
    this._showHint = value;
  }
  set showRules(value) {
    localStorage.setItem('showRules', value.toString());
    this._showRules = value;
  }

  ngOnInit(): void {
    const showHint = localStorage.getItem('showHint');
    const showRules = localStorage.getItem('showRules');
    this.storageShowHint = showHint !== null;
    this.storageShowRules = showRules !== null;
    this.showHint = showHint !== null ? showHint === 'true' : false;
    this.showRules = showRules !== null ? showRules === 'true' : true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.game?.currentValue || changes.player?.currentValue) {
      this.hintCaption();
    }

    if(!this.storageShowHint || !this.storageShowRules) {
      if (changes.game.previousValue && changes.game.currentValue.gameOn != changes.game?.previousValue.gameOn) {
        if (!this.showHint) {
          this.showHint = true;
        }
        if (this.showRules) {
          this.showRules = false;
        }
      }
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

}
