import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TodoListComponent } from './todo-list/todo-list.component';
import { TodoItemComponent } from './todo-item/todo-item.component';

import { TodoListService } from "./todo-list.service";
import {HttpModule} from '@angular/http';

import { RouterModule, Routes } from '@angular/router';
import { ListsComponent } from './lists/lists.component';

import { Ng2DragDropModule } from 'ng2-drag-drop';
import { DropdownModule} from "primeng/primeng";
import { ToggleButtonModule} from "primeng/primeng";
import { GrowlModule} from "primeng/primeng";
import { InputSwitchModule} from "primeng/primeng";
import { BrowserAnimationsModule} from "@angular/platform-browser/animations";
import { ConfirmDialogModule} from "primeng/primeng";
import { HotkeyModule} from "angular2-hotkeys";
import { ToasterModule} from 'angular2-toaster';
import { ContextMenuModule} from "primeng/primeng";
import { DialogModule} from "primeng/primeng";

const appRoutes: Routes = [
  {
    path: 'lists',
    // canActivate: [AuthService],
    component: ListsComponent,
    data: { /*title: ''*/ }
  }
];

@NgModule({
  declarations: [
    AppComponent,
    TodoListComponent,
    TodoItemComponent,
    ListsComponent
  ],
  imports: [
    BrowserModule, HttpModule, FormsModule, DropdownModule, ToggleButtonModule, GrowlModule, InputSwitchModule,
    BrowserAnimationsModule, ConfirmDialogModule, ToasterModule, ContextMenuModule, DialogModule,
    Ng2DragDropModule.forRoot(), HotkeyModule.forRoot(),
    RouterModule.forRoot(appRoutes, {useHash: true} )
  ],
  providers: [TodoListService],
  bootstrap: [AppComponent]
})
export class AppModule { }
