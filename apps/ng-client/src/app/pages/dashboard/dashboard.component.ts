import { Component, OnInit } from '@angular/core';
import { Branch, modelConfig } from '@oam-kit/store';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'oam-kit-dashboard',
  template: `
    <style>
      .wrapper {
        display: flex;
      }
      .container:not(:last-of-type) {
        margin-right: 10px;
      }
    </style>
    <div class="wrapper">
      <div class="container" *ngFor="let branch of branches">
        <oam-kit-panel [branch]="branch"></oam-kit-panel>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public branches: Branch[];

  constructor(private store: StoreService) {
    this.store.startup();
    this.store.data$.subscribe(data => {
      this.branches = data && data[modelConfig.lockInfoBranch.name] || [];
    })
  }

  ngOnInit(): void {
    setInterval(this.store.refresh.bind(this.store), 300000);
  }

}
