import { Component, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface NeededItem {
  value: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-list-container',
  template: `
    <style>
      ul {
        padding: 0;
      }
      li {
        list-style-type: none;
      }
      .container {
        padding: 12px 14px;
        background-color: #f7f7f7;
      }
      .item {
        display: flex;
        cursor: pointer;
        justify-content: space-between;
      }
      .item:hover {
        background-color: #eaeaea;
      }
      .action-icon__group {
        display: none;
      }
      .item:hover > .action-icon__group {
        display: block;
      }
      .input-wrapper {
        display: flex;
        width: 100%;
      }
      input {
        margin-right: 6px;
      }
      .ok-button {
        margin-right: 4px;
      }
    </style>

    <div class="container">
      <ul class="list_wrapper">
        <li class="item" *ngFor="let item of list">
          <div class="input-wrapper" *ngIf="item.isEditing; else defaultItem">
            <input nz-input type="text" [(ngModel)]="item.value" nzSize="small" [placeholder]="placeholder" />
            <button nz-button nzSize="small" class="ok-button" nzType="primary" (click)="editItem(item)">OK</button>
            <button nz-button nzSize="small" nzType="default" (click)="item.isEditing = false">Cancel</button>
          </div>

          <ng-template #defaultItem>
            <div>{{ item.value }}</div>
            <div class="action-icon__group">
              <i nz-icon nzType="edit" nzTheme="outline" style="margin-right: 4px" (click)="item.isEditing = true"></i>
              <i nz-icon nzType="close" nzTheme="outline" (click)="removeItem(item)"></i>
            </div>
          </ng-template>
        </li>
      </ul>

      <div class="input-wrapper" *ngIf="isOnAdding; else addButton">
        <input nz-input type="text" nzSize="small" [placeholder]="placeholder" #addInput />
        <button nz-button nzSize="small" class="ok-button" nzType="primary" (click)="addItem(addInput.value)">OK</button>
        <button nz-button nzSize="small" nzType="default" (click)="isOnAdding = false">Cancel</button>
      </div>
      <ng-template #addButton>
        <button nz-button nzSize="small" nzType="primary" (click)="isOnAdding = true">{{ label }}</button>
      </ng-template>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ListContainerComponent,
    }
  ]
})
export class ListContainerComponent implements ControlValueAccessor {
  @Input() label: string;
  @Input() placeholder = '';

  public isOnAdding = false;
  public list: NeededItem[] = [];

  private onTouched = () => {};
  private onChange = (list: string[]) => {};

  writeValue(originalList: string[]): void {
    this.list = this.formatToNeededList(originalList);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  editItem(item: NeededItem) {
    item.isEditing = false;
    this.onChange(this.formatToOriginalList(this.list));
  }

  addItem(item: string) {
    this.list.push({ value: item, isEditing: false });
    this.onChange(this.formatToOriginalList(this.list));
    this.isOnAdding = false;
  }

  removeItem(item: NeededItem) {
    const index = this.list.indexOf(item);
    if (index !== -1) {
      this.list.splice(index, 1);
      this.onChange(this.formatToOriginalList(this.list));
    }
  }

  private formatToOriginalList(list: NeededItem[]): string[] {
    return list.map((i) => i.value);
  }

  private formatToNeededList(list: string[]): NeededItem[] {
    return list.map((i) => {
      return { value: i, isEditing: false };
    });
  }
}
