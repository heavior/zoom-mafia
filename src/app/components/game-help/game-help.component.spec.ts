import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHelpComponent } from './game-help.component';

describe('GameHelpComponent', () => {
  let component: GameHelpComponent;
  let fixture: ComponentFixture<GameHelpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameHelpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
