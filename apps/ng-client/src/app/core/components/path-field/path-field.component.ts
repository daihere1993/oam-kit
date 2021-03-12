import { Component, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { IpcChannel } from '@oam-kit/ipc';
import { IpcService } from '../../services/ipc.service';

enum Type {
  DIR = 'dir',
  FILE = 'file',
}

@Component({
  selector: 'app-path-field',
  template: `
    <i nz-icon style="cursor: pointer;" nzType="folder" nzTheme="outline" (click)="toSelectPath($event)"></i>
  `,
  styles: [
    ':host { display: block; }'
  ]
})
export class PathInputComponent implements OnDestroy {
  @Output() valueChange: EventEmitter<string> = new EventEmitter();

  @Input() value: string;

  @Input() type: Type = Type.DIR;

  private get isDirectory(): boolean {
    return this.type === Type.DIR;
  }

  public setValue(value: string) {
    this.value = value;
    this.valueChange.emit(value);
  }

  constructor(private ipcService: IpcService) {}

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public async toSelectPath(e: Event) {
    const isDirectory = this.isDirectory;
    const res = await this.ipcService.send<{ isDirectory: boolean }, string[]>(IpcChannel.SELECT_PATH_REQ, {
      data: { isDirectory },
      responseChannel: IpcChannel.SELECT_PATH_RES
    });
    if (res.isSuccessed) {
      this.setValue(res.data[0]);
    }
    e.stopPropagation();
  }
}
