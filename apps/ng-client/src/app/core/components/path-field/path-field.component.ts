import { Component, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { IpcChannel, SelectPathReqData, SelectPathResData } from '@oam-kit/utility/types';
import { IpcService } from '../../services/ipc.service';

enum Type {
  DIR = 'dir',
  FILE = 'file',
}

@Component({
  selector: 'app-path-field',
  template: ` <i nz-icon style="cursor: pointer;" nzType="folder" nzTheme="outline" (click)="toSelectPath($event)"></i> `,
  styles: [':host { display: block; }'],
})
export class PathInputComponent implements OnDestroy {
  @Output() valueChange: EventEmitter<string> = new EventEmitter();

  @Input() value: string;

  @Input() type: Type = Type.DIR;

  private get isDirectory(): boolean {
    return this.type === Type.DIR;
  }

  public setValue(value: string) {
    this.valueChange.emit(value);
  }

  constructor(private ipcService: IpcService) {}

  ngOnDestroy(): void {
    this.ipcService.destroy();
  }

  public async toSelectPath(e: Event) {
    const isDirectory = this.isDirectory;
    const res = await this.ipcService
      .send<SelectPathReqData, SelectPathResData>(IpcChannel.SELECT_PATH, { isDirectory },);
    if (res.isOk) {
      this.setValue(res.data.path);
    }
    e.stopPropagation();
  }
}
