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
        Guest: 'Convicted have a chance to say their last piece.',
        Mafia: 'Convicted have a chance to say their last piece.',
        Civilian: 'Convicted have a chance to say their last piece.',
        Detective: 'Convicted have a chance to say their last piece.'
      },
      Discussion: {
        Guest: 'Players are discussing who are the suspects.',
        Mafia: 'Be active, partner with civilians, deceive civilians and blame innocent. Suspect someone wisely.',
        Civilian: 'Be active, voice your thoughts and suspicions. Watch how players act, what they say and what they do. ' +
                  'Try to find mafia, then chose who do you suspect.',
        Detective: 'Steer the civilians to eliminate mafia, watch what players do. Do not blow your cover, the vote is open.'
      },
      MainVote: {
        Guest: 'The jury is out to reach the verdict.',
        Mafia: 'Choose who to vote for, keep in mind that the vote is open.',
        Civilian: 'Choose who is mafia.',
        Detective: 'Choose who to vote for, keep in mind that the vote is open.'
      },
      Night: {
        Guest: 'Mafia kills, Detective investigates, Civilians sleep.',
        Mafia: 'You can see how other mafia votes. Choose who to murder. Remember, you need majority vote to kill, the tie means you\'ve missed.',
        Civilian: 'Wake up once the button is unlocked.',
        Detective: 'Choose who to investigate. Tomorrow you\'ll know the team of that player.'
      },
      Tiebreaker: {
        Guest: 'There was a tie, now jury decides the fate of all accused',
        Mafia: 'Think: do you want to eliminate all the accused?',
        Civilian: 'Think: do you want to eliminate all the accused?',
        Detective: 'Think: do you want to eliminate all the accused?'
      }
    };
    const role = this.player.isAlive ? this.player.role : 'Guest';
    const hint = hints[ this.game.gameState][role] || hints[ this.game.gameState]['Guest'];
    return `Hint: ${hint}`;
  }

}
