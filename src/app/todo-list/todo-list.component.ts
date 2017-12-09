import {ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, OnInit, ViewChild} from '@angular/core';
import {TodoListWithItems, TodoListService} from "../todo-list.service";
import {ItemID, ItemJSON} from "../../data/protocol";
import { ConfirmationService} from "primeng/primeng";
import {ToasterService, ToasterConfig} from 'angular2-toaster';
import { HotkeysService} from "angular2-hotkeys";
import { Hotkey} from "angular2-hotkeys";

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent implements OnInit, OnChanges {


  @Input() list: TodoListWithItems;
  @Input() newItemLabel: string;
  @Input() newItemTag: string;
  @Input() clock: number;

  filteredItems: ItemJSON[];
  filterName = "";
  filterTag = "";
  filterState = "all";
  couleurLabel: { label: string, value: string }[] = [{ label : 'Red',    value: 'Red'},
    { label : 'Orange', value: 'Orange'},
    { label : 'Green',  value: 'Green'},
    { label : 'White',  value: 'White'},
    { label : 'Grey',   value: 'Grey'}];
  CouleurFiltreLabel: { label: string, value: string }[] = [{ label : 'All',    value: 'All'},
    { label : 'Red',    value: 'Red'},
    { label : 'Orange', value: 'Orange'},
    { label : 'Green',  value: 'Green'},
    { label : 'White',  value: 'White'},
    { label : 'Grey',   value: 'Grey'}];
  selectedColor = 'Red';
  filterColor = 'All';
  @ViewChild('name') nameHtmlElement: ElementRef;
  @ViewChild('label') labelHtmlElement: ElementRef;
  @ViewChild('tag') tagHtmlElement: ElementRef;
  toasterconfig: ToasterConfig = new ToasterConfig({
    showCloseButton: true,
    tapToDismiss: false,
    timeout: 2000,
    animation: 'fade'
  });

  constructor(private todoListService: TodoListService,
              private confirmationService: ConfirmationService,
              private toasterService: ToasterService,
              private _hotkeysService: HotkeysService) {
    this._hotkeysService.add(new Hotkey('shift+e', (event: KeyboardEvent): boolean => {
      this.nameHtmlElement.nativeElement.focus();
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('alt+c', (event: KeyboardEvent): boolean => {
      this.createItem();
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('alt+e', (event: KeyboardEvent): boolean => {
      const selectedItem: ItemJSON = this.list.items.find( item => item.data['selected'] === true);
      if(selectedItem){
        selectedItem.data["edited"] = true;
        this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, selectedItem.id, selectedItem.data);
      }
      return false;
    }));

    this._hotkeysService.add(new Hotkey(['down', 'up'], (event: KeyboardEvent): boolean => {
      let index: number = this.list.items.findIndex( item => item.data["selected"] === true);
      if (index >= 0 ){
        this.list.items[index].data["selected"] = false;
        this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, this.list.items[index].id, this.list.items[index].data);
        if(event.key === 'ArrowDown') {
          if(index >= this.list.items.length - 1) {
            this.list.items[0].data["selected"] = true;
            this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, this.list.items[0].id, this.list.items[0].data);
          } else {
            index++;
            this.list.items[index].data["selected"] = true;
            this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, this.list.items[index].id, this.list.items[index].data);
          }
        }
        else if (event.key === 'ArrowUp') {
          if (index === 0 ) {
            this.list.items[this.list.items.length - 1].data["selected"] = true;
            const lastIndex = this.list.items.length - 1;
            this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, this.list.items[lastIndex].id, this.list.items[lastIndex].data);
          } else {
            index--;
            this.list.items[index].data["selected"] = true;
            this.todoListService.SERVER_UPDATE_ITEM_DATA(this.list.id, this.list.items[index].id, this.list.items[index].data);
          }
        }

      }
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('alt+v', (event: KeyboardEvent): boolean => {
      const selectedItem: ItemJSON = this.list.items.find( item => item.data['selected'] === true);
      // selectedItem.checked = !selectedItem.checked;
      this.todoListService.SERVER_UPDATE_ITEM_CHECK(this.list.id, selectedItem.id, !selectedItem.checked);
      return false; // Prevent bubbling
    }));
    this._hotkeysService.add(new Hotkey('alt+d', (event: KeyboardEvent): boolean => {
      const selectedItem: ItemJSON = this.list.items.find( item => item.data['selected'] === true);
      if(selectedItem) {
        this.onItemDelete(selectedItem.id);
      }
      return false; // Prevent bubbling
    }));
  }

  ngOnChanges(): void {
    this.filteredItems = Array.from(this.list.items);
    const itemSelected = this.filteredItems.find( I => I.data["selected"] ) || this.filteredItems[0];
    if (itemSelected) {
      itemSelected.data["selected"] = true;
    }
  }

  ngOnInit() {
  }

  createItem() {
    if (this.newItemLabel === undefined || this.newItemLabel === '' ) {
      this.toasterService.pop('error', 'Attention', 'Le label doit être saisi.');
      this.labelHtmlElement.nativeElement.focus();
    }
    else if (this.newItemTag === undefined || this.newItemTag === '' ) {
      this.toasterService.pop('error', 'Attention', 'Le tag doit être saisi.');
      this.tagHtmlElement.nativeElement.focus();
    }
    else if (this.newItemLabel !== '' && this.newItemTag !== '') {
      this.todoListService.SERVER_CREATE_ITEM(this.list.id, this.newItemLabel, this.newItemTag, this.selectedColor, false);
      this.selectedColor = 'Red';
      this.filteredItems = Array.from(this.list.items);
      this.applyFilter();
      this.toasterService.pop('success', 'Ajout', 'L\'élement a bien été ajouté.');
      this.newItemLabel = this.newItemTag = '';
    }
  }


  changeListName(event: any) {
    this.todoListService.SERVER_UPDATE_LIST_NAME(
      this.list.id,
      event.currentTarget.value
    );
  }

  private filterListByName(filterName: string) {
    if (filterName === '')
      this.filteredItems = Array.from(this.list.items);
    else
      this.filteredItems = Array.from(this.list.items.filter((item) => item.label.indexOf(filterName) >= 0));
  }

  private filterListByState(state: string) {
    if (state === 'done')
      this.filteredItems = Array.from(this.filteredItems.filter(item => item.checked === true));
    else if (state === 'todo')
      this.filteredItems = Array.from(this.filteredItems.filter(item => item.checked === false));
    else if (state === 'all')
      this.filteredItems = Array.from(this.filteredItems);
  }

  private filterListByTag(filterTag: string) {
    if (filterTag !== '') {
      this.filteredItems = Array.from(this.filteredItems.filter(item => item.data["tag"].indexOf(filterTag) >= 0));
    }
  }
  private filterListByColor(filterColor: string): void {
    if (filterColor !== 'All') {
      this.filteredItems = Array.from(this.filteredItems.filter(item => item.data["color"].indexOf(filterColor) >= 0));
    }
  }

  applyFilter() {
    this.filterListByName(this.filterName);
    this.filterListByState(this.filterState);
    this.filterListByTag(this.filterTag);
    this.filterListByColor(this.filterColor);
  }

  onItemDelete(id: ItemID) {
    this.confirmationService.confirm({
      message: 'Etes-vous sur de vouloir continuer?',
      header: 'Confirmation',
      icon: 'fa fa-question-circle',
      key: 'deleteItem',
      accept: () => {
        this.toasterService.pop('success', 'Détails', 'La suppression a été bien prise en compte.');
        this.todoListService.SERVER_DELETE_ITEM(this.list.id, id);
      },
      reject: () => {
        this.toasterService.pop('info', 'Détails', 'La suppression a été annulée.');
      }
    });
  }

  onItemSort($event: any) {
    const oldIndex: number = this.list.items.indexOf($event.dragData);
    if ($event.newIndex > oldIndex ) $event.newIndex--;
    this.move(oldIndex, $event.newIndex);
    this.todoListService.sendState();
    this.applyFilter();
  }

  private move = function (old_index, new_index) {
    if (new_index >= this.list.items.length) {
      let k = new_index - this.list.items.length;
      while ((k--) + 1) {
        this.list.items.push(undefined);
      }
    }
    this.list.items.splice(new_index, 0, this.list.items.splice(old_index, 1)[0]);
  };
}
