
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material';
import { PageEvent } from '@angular/material/paginator';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { HttpService } from 'src/app/services/http-service';
import { [[component-edit-modal-name]] } from './modals/[[filename]]-edit-modal';

@Component({
  selector: 'app-[[filename]]',
  templateUrl: './[[filename]].component.html',
  styleUrls: ['./[[filename]].component.scss']
})
export class [[component-name]] implements OnInit {
  private data: any;
  private displayedColumns: string[] = [[[columns-list]]];
  private displayedDetails: string[] = ['details'];
  private filter: any = {
    limit: 10
  };
  private count: number = 0;
  private debounce: number = 400;
  private viewDetails: any[] = [];
[[form-control-declarations]]
  constructor(
    private httpService: HttpService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog) {
  }

  ngOnInit() {
    this.getData();
[[form-control-value-subscriptions]]  }

  getData(countRecords: boolean = true) {
    this.viewDetails = [];
    this.httpService.[[service-get-method]](this.filter).subscribe(res => {
      this.data = res;
      let cloned = {};
      for(const idx in this.filter) {
        if (Object.prototype.hasOwnProperty.call(this.filter, idx)) {
          switch(idx) {
            case 'limit':
            case 'offset':
            case 'order':
            case 'direction':
              break; // Ignoring
            default:
              cloned[idx] = this.filter[idx];
              break;
          }
        }
      }
      if (countRecords) {
        this.httpService.[[service-count-method]](cloned).subscribe(res2 => {
          this.count = res2.count;
        }, error => {
          this.error(error.error.message);
        });
      }
    }, error => {
      this.error(error.error.message);
    });
  }

  showDetails(entity: any) {
    const indexOf = this.viewDetails.indexOf(entity);
    if (indexOf === -1) {
      this.viewDetails.push(entity);
    } else {
      this.viewDetails.splice(indexOf, 1);
    }
  }

  shouldDisplayDetails(entity: any) {
    if (this.viewDetails.indexOf(entity) != -1) {
      return true;
    }
    return false;
  }

  getClassForRecord(entity: any) {
    if (this.viewDetails.indexOf(entity) != -1) {
      return 'grid-row visible-details';
    }
    return 'grid-row';
  }

  getClassForDetails(entity: any) {
    if (this.viewDetails.indexOf(entity) != -1) {
      return 'details-row visible';
    }
    return 'details-row hidden';
  }

  editDetails(entity: any) {
    let data = {
      isEdit: true,
      entity: {},
    };
    for (var idx in entity) {
      if (Object.prototype.hasOwnProperty.call(entity, idx)) {
        data.entity[idx] = entity[idx];
      }
    }
    const dialogRef = this.dialog.open([[component-edit-modal-name]], {
      data
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res !== null && res !== undefined) {
        for (var idx in res) {
          if (Object.prototype.hasOwnProperty.call(res, idx)) {
            entity[idx] = res[idx];
          }
        }
        this.snackBar.open('[[filename]] successfully updated', 'Close', {
          duration: 2000,
        });
      }
    });
  }

  createNewRecord() {
    let data = {
      isEdit: false,
      entity: {},
    };
    const dialogRef = this.dialog.open([[component-edit-modal-name]], {
      data
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res !== null && res !== undefined) {
        this.getData();
        this.snackBar.open('[[filename]] successfully created', 'Close', {
          duration: 2000,
        });
      }
    });
  }

  delete(entity: any, ids: any) {
    this.httpService.[[service-delete-method]](ids).subscribe(res => {
      const indexOf = this.viewDetails.indexOf(entity);
      if (indexOf !== -1) {
        this.viewDetails.splice(indexOf, 1);
      }
      this.getData();
    }, error => {
      this.error(error.error.message);
    });
  }

  paged(e: PageEvent) {
    this.getData(false);
  }

  error(error: string) {
    this.snackBar.open(error, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }
}
