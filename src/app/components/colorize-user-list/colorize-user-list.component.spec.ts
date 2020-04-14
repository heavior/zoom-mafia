import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorizeUserListComponent } from './colorize-user-list.component';

describe('ColorizeUserListComponent', () => {
  let component: ColorizeUserListComponent;
  let fixture: ComponentFixture<ColorizeUserListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ColorizeUserListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ColorizeUserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
