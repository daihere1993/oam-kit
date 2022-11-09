import { ChangeDetectorRef, Component, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { IpcChannel } from '@oam-kit/utility/types';

@Component({
  selector: 'log-monitor',
  template: `
    <style>
      .container {
        height: 200px;
        width: 100%;
        color: #fff;
        position: relative;
        background: #555753;
        display: flex;
        flex-direction: column;
      }
      .header {
        position: sticky;
        top: 0;
        background: #555753;
        padding: 5px 10px;
        font-size: 18px;
      }
      .body {
        font-style: italic;
        padding: 0 10px 5px 10px;
        overflow-y: scroll;
        flex-grow: 1;
      }
      p {
        margin: 0;
      }
    </style>
    <div class="container">
      <div class="header">Log Panel</div>
      <div class="body">
        <p #logElem *ngFor="let log of logs; let i = index" [attr.id]="i == (logs.length - 1) ? 'scollLog' : ''">{{ log }}</p>
      </div>
    </div>
  `,
})
export class LogMonitorComponent {
  @ViewChildren('logElem') logList: QueryList<ElementRef>;
  logs: string[] = [];
  count = 1;
  
  constructor(private ipcService: IpcService, private cd: ChangeDetectorRef) {
    this.ipcService.on<string>(IpcChannel.LOG_SYNC, (event, res) => {
      this.logs.push(res.data);
      console.log(`${this.count}: ${res.data}`);
      this.count++;
      cd.detectChanges();
      const scollLogElem = this.logList.filter(item => item.nativeElement.id === 'scollLog');
      if (scollLogElem.length) {
        scollLogElem[0].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
