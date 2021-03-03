import { Component, Input } from '@angular/core';
import { Branch } from '@oam-kit/store';

@Component({
  selector: 'oam-kit-panel',
  template: `
    <style>
      .wrapper {
        width: 200px;
        height: 300px;
        background: orange;
        padding: 4px 6px;
      }
      .header {
        height: 40px;
        font-size: 24px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .repo {
        height: 40px;
        font-size: 24px;
        padding: 0 2px;
        font-weight: bold;
        background: green;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .repo:not(:last-of-type) {
        margin-bottom: 4px;
      }
    </style>
    <div class="wrapper">
      <div class="header">
        <span>{{ branch.name }}</span>
        <i nz-icon [nzType]="branch.lock.locked? 'lock' : 'unlock'" nzTheme="outline"></i>
      </div>
      <div class="repo" *ngFor="let repo of branch?.lock?.repos">
        <span>{{ repo.name }}</span>
        <i nz-icon [nzType]="repo.locked? 'lock' : 'unlock'" nzTheme="outline"></i>
      </div>
    </div>
  `
})
export class PanelComponent {
  @Input() branch: Branch;

  
}
