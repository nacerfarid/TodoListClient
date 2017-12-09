import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TodoListWithItems, TodoListService} from "../todo-list.service";
import {ConfirmationService} from "primeng/primeng";
import { HotkeysService} from "angular2-hotkeys";
import { Hotkey} from "angular2-hotkeys";
import {ItemJSON, ListID} from "../../../../app/data/protocol";
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  providers: [ConfirmationService],
  styleUrls: ['./lists.component.css']
})
export class ListsComponent implements OnInit {
  selectedList: TodoListWithItems;
  toasterconfig: ToasterConfig = new ToasterConfig({
                                                    showCloseButton: true,
                                                    tapToDismiss: false,
                                                    timeout: 2000,
                                                    animation: 'fade'
                                                  });
  constructor(private todoListService: TodoListService,
              private confirmationService: ConfirmationService,
              private _hotkeysService: HotkeysService,
              private toasterService: ToasterService) {
    this._hotkeysService.add(new Hotkey('shift+c', (event: KeyboardEvent): boolean => {
      this.createList();
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('shift+r', (event: KeyboardEvent): boolean => {
      this.deleteList();
      return false;
    }));
    this._hotkeysService.add(new Hotkey('shift+d', (event: KeyboardEvent): boolean => {
      this.duplicateList();
      return false;
    }));

    this._hotkeysService.add(new Hotkey('tab', (event: KeyboardEvent): boolean => {
          let index: number = this.getLists().indexOf(this.selectedList);
          index >= this.getLists().length - 1 ? this.selectList(this.getLists()[0]) : this.selectList(this.getLists()[++index]);
          if(this.selectedList.items.length > 0 ) this.selectedList.items[0]["selected"] = true;
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('shift+tab', (event: KeyboardEvent): boolean => {
      let index: number = this.getLists().indexOf(this.selectedList);
      index <= 0 ? this.selectList(this.getLists()[this.getLists().length-1]) : this.selectList(this.getLists()[--index]);
      if(this.selectedList.items.length < 0 ) this.selectedList.items[0]["selected"] = true;
      return false; // Prevent bubbling
    }));
  }


  ngOnInit() {
  }

  getLists(): TodoListWithItems[] {
    if (this.selectedList === undefined && this.todoListService.getLists().length > 0)
      this.selectedList = this.todoListService.getLists()[0];
    return this.todoListService.getLists();
  }

  selectList(list: TodoListWithItems) {
    this.selectedList = list;
  }

  createList() {
    const newLists = this.todoListService.getLists().filter((list) => list.name.indexOf('Nouvelle Liste') >= 0);
    let numberNewList: number;
    if (newLists.length > 0) {
      const lastName: string = newLists[newLists.length - 1].name;
      const lastNumber: number = Number(lastName.substring(15, lastName.length));
      lastNumber ? numberNewList = lastNumber + 1 : numberNewList = 1;
    }
    else numberNewList = 1;
    const name: string = 'Nouvelle Liste ' + numberNewList;
    const id = this.todoListService.SERVER_CREATE_NEW_LIST(name);
    this.toasterService.pop('success', 'Détails', 'La liste a été bien ajoutée.');
    return id;
  }

  checkList(list: TodoListWithItems, $event: Event) {
    list.data["checked"] = $event.currentTarget["checked"];
    this.todoListService.SERVER_UPDATE_LIST_DATA(list.id, list.data);
  }

  async deleteList() {
    const toBeDeleted = await this.confirmDelete();
    if (toBeDeleted){
      const idToDelete: ListID = this.selectedList.id;
      this.todoListService.SERVER_DELETE_LIST(idToDelete);
      this.selectedList = this.getLists()[0];
    }
  }
  async deleteLists() {
    const toBeDeleted = await this.confirmDelete();
    if (toBeDeleted){
      let refreshSelectedList = false;
      const listsToDelete: TodoListWithItems[] = this.getLists().filter((list) => list.data["checked"]);
      if (listsToDelete.filter((list) => list.id === this.selectedList.id)) refreshSelectedList = true;
      listsToDelete.forEach((list) => this.todoListService.SERVER_DELETE_LIST(list.id));
      if (refreshSelectedList && this.getLists().length >= 1) this.selectedList = this.getLists()[0];
      else this.selectedList = null;
    }

  }

  async onDropDataDelete($event: any) {
    const toBeDeleted = await this.confirmDelete();
    if (toBeDeleted) {
      this.todoListService.SERVER_DELETE_LIST($event.dragData.id);
      if (this.selectedList.id === $event.dragData.id) this.selectedList = this.getLists()[0];
    }
  }

  onDropDataOrder($event: any, newIndex: number) {
    const oldIndex: number = this.todoListService.getLists().indexOf($event.dragData);
    if (newIndex > oldIndex) newIndex--;
    this.move(oldIndex, newIndex);
    this.todoListService.sendState();
  }

  confirmDelete(): Promise<boolean> {
    return new Promise<boolean>( (resolve) => {
      this.confirmationService.confirm({
        message: 'Etes-vous sur de vouloir continuer?',
        header: 'Confirmation',
        icon: 'fa fa-question-circle',
        key: 'listDialog',
        accept: () => {
          this.toasterService.pop('success', 'Détails', 'La suppression a été bien prise en compte.');
          resolve(true);
        },
        reject: () => {
          this.toasterService.pop('info', 'Détails', 'La suppression a été annulée.');
          resolve(false);
        }
      });
    });
  }

  duplicateList(){
    const id = this.createList();
    const newList: TodoListWithItems = this.getLists().find(item => item.id === id);
    this.selectedList.items.forEach(item => this.todoListService.SERVER_CREATE_ITEM(newList.id,
      item.label, item.data["tag"], item.data["color"], item.checked));
  }
  private move = function (old_index, new_index) {
    if (new_index >= this.getLists().length) {
      let k = new_index - this.getLists().length;
      while ((k--) + 1) {
        this.getLists().push(undefined);
      }
    }
    this.getLists().splice(new_index, 0, this.getLists().splice(old_index, 1)[0]);
  };


  getSelectedList() {
    const id = this.selectedList ? this.selectedList.id : undefined;
    this.selectedList = this.getLists().find( L => L.id === id );
    return this.selectedList;
  }
}
