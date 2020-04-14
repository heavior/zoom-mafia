import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { ClipboardModule } from 'ngx-clipboard';
import { RoomComponent } from './pages/room/room.component';
import { AutoFocusDirective } from './directives/auto-focus.directive';
import { NewsComponent } from './components/news/news.component';
import { ColorizeUserDirective } from './directives/colorize-user.directive';
import { ColorizeUserListComponent } from './components/colorize-user-list/colorize-user-list.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    RoomComponent,
    AutoFocusDirective,
    NewsComponent,
    ColorizeUserDirective,
    ColorizeUserListComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ClipboardModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
