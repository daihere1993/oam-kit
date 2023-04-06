import { Component, HostListener } from '@angular/core';
import { IpcResponseCode, Rule } from '@oam-kit/shared-interfaces';
import { IpcService } from '@ng-client/core/services/ipc.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-zip-parser-component',
  styleUrls: ['./zip-parser.component.scss'],
  template: `
    <nz-spin [nzSpinning]="isParsing">
      <div class="container" (drop)="onDrop($event)" (dragover)="onDrop($event)">

        <div class="parsed-content" *ngIf="hasParsed; else uploadHint">
          <nz-collapse>
            <nz-collapse-panel
              *ngFor="let rule of rules"
              [nzHeader]="customHeader"
              [nzActive]="true"
            >
              <nz-list nzSize="small">
                <nz-list-item *ngFor="let path of rule.parsingInfos.pathList">
                  <p nz-button nzType="link" class="rule-path-item" (click)="onLinkClick(rule, path)">{{ path }}</p>
                </nz-list-item>
              </nz-list>
              <ng-template #customHeader>
                <div class="rule-name-header">
                  <span>{{ rule.name }}</span>
                  <span class="result-hint">({{ rule.parsingInfos.pathList.length }} results)</span>
                </div>
              </ng-template>
            </nz-collapse-panel>
          </nz-collapse>
        </div>
        <ng-template #uploadHint>
          <p class="upload-drag-icon">
            <span nz-icon nzType="tool"></span>
          </p>
          <p class="upload-text">Drag or copy snapshot to this area</p>
          <p class="upload-hint">
            Please make sure the file you drag is a snapshot which collected from WEBEM.
          </p>
        </ng-template>
      </div>
    </nz-spin>
  `,
})
export class ZipParserComponent {
  get hasParsed(): boolean {
    return this.isParsing === false;
  }
  isParsing: boolean = null;

  rules: Rule[] = [];

  constructor(private _ipcService: IpcService, private _message: NzMessageService) {
  }

  @HostListener('window:paste', ['$event'])
  async onPaste(e: ClipboardEvent) {
    if (e && e.clipboardData) {
      const file = e.clipboardData.files[0];
      if (file) {
        this.startParsing(file.path);
      }
    }
  }

  async onDrop(e: DragEvent) {
    if (e.type === 'dragover') {
      e.preventDefault();
      return;
    }

    if (e && e.dataTransfer) {
      this.startParsing(e.dataTransfer.files[0].path);
    }
  }

  private async startParsing(path: string) {
    this.isParsing = true;
    const res = await this._ipcService.send('/zip_parser/unzipByRules', path);
    if (res.code === IpcResponseCode.success) {
      this.rules = res.data;
      this.isParsing = false;
    } else {
      this._message.error(res.description);
      this.isParsing = null;
    }
  }

  async onLinkClick(rule: Rule, link: string) {
    const res = await this._ipcService.send('/file/reveal_file', rule.parsingInfos.rootDir + '/' + link);
    if (res.code === IpcResponseCode.failed) {
      this._message.error(`Can not open file due to: ${res.description}`);
    }
  }
}
