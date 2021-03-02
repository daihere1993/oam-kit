import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Branch } from '@oam-kit/store/types';
import { BranchSettingComponent, DialogRes, DialogAction } from './branch-setting.component';
import { BranchService } from '../../services/branch.service';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'app-branch-selector',
  template: `
    <style>
      :host(branch-selector) {
        display: block;
      }
      .container {
        display: flex;
      }
      .option_container {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .add_branch_container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      nb-icon {
        color: #8f9bb3;
      }
      nz-select {
        width: 200px;
      }
      nz-divider {
        margin: 4px 0;
      }
    </style>
    <div class="container">
      <nz-select
        [ngModel]="selectedBranch"
        (ngModelChange)="setSelection($event)"
        [disabled]="disabled"
        [nzDropdownRender]="addBranchOption"
      >
        <nz-option
          *ngFor="let branch of branches"
          nzCustomContent
          [nzLabel]="branch.name"
          [nzValue]="branch"
        >
          <div class="option_container">
            <span>{{ branch.name }}</span>
            <i nz-icon nzType="edit" nzTheme="outline" (click)="editBranch($event, branch)"></i>
          </div>
        </nz-option>
        <ng-template #addBranchOption>
          <nz-divider></nz-divider>
          <div class="add_branch_container">
            <a class="add_branch_btn" data-btn-type="addBranch" nz-button nzType="link" (click)="addBranch()">
              <i nz-icon nzType="plus"></i>
              Add branch
            </a>
          </div>
        </ng-template>
      </nz-select>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchSelectorComponent implements OnInit {
  @Input() disabled = false;
  @Output() branchChange = new EventEmitter();

  // branches$: Observable<Branch[]>;
  branches: Branch[];
  public selectedBranch: Branch;

  constructor(private modalService: NzModalService, private branchService: BranchService) {}

  public addBranch(): void {
    this.modalService
      .create({ nzContent: BranchSettingComponent })
      .afterClose.subscribe(({ content, action }: DialogRes = { content: null, action: null }) => {
        if (action === DialogAction.SAVE) {
          this.setSelection(content);
          this.branchService.add(content);
        }
      });
  }

  public setSelection(value: Branch) {
    this.selectedBranch = value;
    this.branchChange.emit(value);
  }

  public editBranch(e: Event, branch: Branch): void {
    const isEditSelectedBranch = this.selectedBranch.name === branch.name;
    this.modalService
      .create({
        nzContent: BranchSettingComponent,
        nzComponentParams: { branch, isEdit: true },
      })
      .afterClose.subscribe(({ content, action }: DialogRes = { content: null, action: null }) => {
        if (action === DialogAction.SAVE) {
          if (isEditSelectedBranch) {
            this.setSelection(content);
          }
          this.branchService.update(branch.id, content);
        } else if (action === DialogAction.DELETE) {
          if (isEditSelectedBranch) {
            this.setSelection(null);
          }
          this.branchService.delete(branch.id);
        }
      });
    e.stopPropagation();
  }

  ngOnInit() {
    // To get data initiatively
    this.branchService.branches$.subscribe((branches) => {
      if (branches?.length) {
        this.branches = cloneDeep(branches);
        if (!this.selectedBranch) {
          this.setSelection(this.branches[0]);
        } else {
          this.setSelection(this.branches.find((item) => item.name === this.selectedBranch.name));
        }
      } else {
        this.branches = [];
      }
    });
  }
}
