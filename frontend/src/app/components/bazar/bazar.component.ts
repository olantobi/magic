
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

// Angular and system imports.
import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog } from '@angular/material/dialog';

// Application specific imports.
import { AuthService } from '../auth/services/auth.service';
import { FileService } from '../files/services/file.service';
import { AppManifest } from '../config/models/app-manifest.model';
import { ConfigService } from '../config/services/config.service';
import { BackendService } from 'src/app/services/backend.service';
import { FeedbackService } from 'src/app/services/feedback.service';
import { ViewPublishedComponent } from './view-published/view-published.component';
import { DefaultDatabaseType } from '../config/models/default-database-type.model';
import { BazarDialogResult, ViewAppComponent } from './view-app/view-app.component';
import { InstallAppDialogComponent, ModuleInstall } from './install-app-dialog/install-app-dialog.component';

/**
 * Bazar component allowing you to obtain additional Micro Service backend
 * modules for your Magic installation.
 */
@Component({
  selector: 'app-bazar',
  templateUrl: './bazar.component.html',
  styleUrls: ['./bazar.component.scss']
})
export class BazarComponent implements OnInit {

  // Modules already installed.
  private folders: string[] = [];

  /**
   * Apps as returned from backend that can be installed directly into your backend.
   */
  public apps: AppManifest[] = [];

  /**
   * Bazar apps as published by the current server.
   */
  public publishedApps: AppManifest[] = [];

  /**
   * Default database backend is using.
   */
  public defaultDatabase: string;

  /**
   * Creates an instance of your component.
   * 
   * @param dialog Needed to be able to create modal dialogs
   * @param clipboard Needed to be able to put manifest URL into clipboard
   * @param authService Needed to check if user is logged in as root or not
   * @param fileService Needed to be able to figure out which modules are already installed
   * @param configService Needed to retrieve Bazar manifests
   * @param backendService Needed to be able to retrieve main backend URL
   * @param feedbackService Needed to display feedback to user
   */
  constructor(
    private dialog: MatDialog,
    private clipboard: Clipboard,
    public authService: AuthService,
    private fileService: FileService,
    private configService: ConfigService,
    private backendService: BackendService,
    private feedbackService: FeedbackService) { }

  /**
   * Implementation of OnInit.
   */
  public ngOnInit() {

    // Checking if user is root before we allow him to install bazar apps into current server.
    if (this.authService.isRoot) {

      // Retrieving default database from backend.
      this.configService.defaultDatabaseType().subscribe((result: DefaultDatabaseType) => {

        // Assigning model.
        this.defaultDatabase = result.default;

        // Retrieving already installed modules.
        this.fileService.listFolders('/modules/').subscribe((folders: string[]) => {

          // Assigning model.
          this.folders = folders.map(x => {
            const res = x.substr(9);
            return res.substr(0, res.length - 1);
          });

          // Retrieving Bazar modules from backend.
          this.configService.getBazarManifest().subscribe((result: AppManifest[]) => {

            // Assigning result to model.
            this.apps = result || [];

          }, (error: any) => this.feedbackService.showError(error));

        }, (error: any) => this.feedbackService.showError(error));

      }, (error: any) => this.feedbackService.showError(error));
    }

    // Retrieving Bazar apps published by the current server.
    this.configService.getPublishedBazarApps().subscribe((result: AppManifest[]) => {

      // Assigning model.
      this.publishedApps = result || [];
    });
  }

  /**
   * Returns true if module is already installed.
   * 
   * @param module Module to check
   */
  public isInstalled(module: AppManifest) {
    return this.folders.indexOf(module.module_name) !== -1;
  }

  /**
   * Returns true if app can be installed into backend.
   * 
   * @param module App to check
   */
  public canInstall(module: AppManifest) {

    // Verifying app supports the default database adapter used by backend.
    return !module.database_support || module.database_support.indexOf(this.defaultDatabase) !== -1;
  }

  /**
   * Installs the specified module into your modules folder.
   * 
   * @param module Module to install
   */
   public viewPublishedDetails(module: AppManifest) {

    // Opening up a modal dialog to show user details about the specified published app.
    const dialog = this.dialog.open(ViewPublishedComponent, {
      data: module,
      width: '80%'
    });
    dialog.afterClosed().subscribe((result: AppManifest) => {

      // Checking if app was removed.
      if (result) {

        // App was removed from local Bazar, hence updating model.
        this.publishedApps = this.publishedApps.filter(x => x.module_name !== module.module_name);
      }
    });
   }

   /**
    * Invoked when user wants to provide a direct URL to install a new app
    * into his backend.
    */
   public installApp() {

    // Showing modal dialog allowing user to provide us with the URL and name of module to install.
    const dialog = this.dialog.open(InstallAppDialogComponent, {
      width: '550px',
      data: {
        url: null,
        name: null,
      }
    });
    dialog.afterClosed().subscribe((result: ModuleInstall) => {

      // Checking if user clicked the install button.
      if (result) {

        // User wants to install module, hence invoking backend to download and extract zip file.
        this.configService.installBazarModule(result.url, result.name).subscribe(() => {

          // Then runnning installation scripts in folder.
          this.fileService.install('/modules/' + result.name + '/').subscribe(() => {

            // Providing feedback to user.
            this.feedbackService.showInfoShort('Module was successfully installed');

            // Making sure we track the newly installed module.
            this.folders.push(result.name);

          }, (error: any) => this.feedbackService.showError(error));

        }, (error: any) => this.feedbackService.showError(error));
      }
    });
   }

  /**
   * Installs the specified module into your modules folder.
   * 
   * @param module Module to install
   * @param noCheck If true does not check if module is already installed before installing it
   */
  public viewDetails(module: AppManifest, noCheck: boolean = false) {

    // Checking if module is already installed, at which point we return early.
    if (noCheck === false && this.isInstalled(module)) {

      // Oops, module already installed, asking user if he wants to uninstall his existing version.
      this.feedbackService.confirm(
        'Confirm action',
        'Module is already installed, do you want to uninstall your current version?',
        () => {

          // Uninstalling module.
          this.fileService.deleteFolder('/modules/' + module.module_name + '/').subscribe(() => {

            // Module was successfully uninstalled, showing user some feedback.
            this.feedbackService.showInfo('Module successfully uninstalled, click again to install new version');

            // Making sure we update UI.
            this.folders = this.folders.filter(x => x !== module.module_name);

          }, (error: any) => this.feedbackService.showError(error));
        });
      return;
    }

    // Opening modal dialog to display details about app.
    const dialog = this.dialog.open(ViewAppComponent, {
      data: {
        manifest: module,
        canInstall: this.canInstall(module),
      },
      width: '80%'
    });

    // Subscribing to close to do the heavy lifting in this component.
    dialog.afterClosed().subscribe((result: BazarDialogResult) => {

      // Verifying dialog returned a result.
      if (result) {

        // Sanity checking that we can install application.
        if (module.type !== 'module') {

          // Oops, currently we can only install moedules, and no other types.
          this.feedbackService.showInfoShort('Sorry, Magic only supports installing modules for now through the Bazar');
          return;
        }

        // Asking user to confirm installation.
        this.feedbackService.confirm(
          'Confirm installation',
          `This will install '${module.name}' into your backend. Are you sure you wish to proceed? Please make sure you trust the publisher of this module before clicking yes.`,
          () => {

            // Invoking backend to download and unzip file.
            this.configService.installBazarModule(module.url, module.module_name).subscribe(() => {

              // Invoking backend to run installation script for module.
              this.fileService.install('/modules/' + module.module_name + '/').subscribe(() => {
              
                // Providing feedback to user.
                this.feedbackService.showInfoShort('Module was successfully installed');

                // Removing module from list of modules.
                this.folders.push(module.module_name);

              }, (error: any) => this.feedbackService.showError(error));

            }, (error: any) => this.feedbackService.showError(error));
        });
      }
    });
  }

  /**
   * Invoked when user wants to copy manifest URL.
   */
  public getManifestUrl() {
    
    // Simply putting manifest URL into clipboard and providing some feedback to user.
    this.clipboard.copy(this.backendService.current.url + '/magic/modules/system/bazar/published');
    this.feedbackService.showInfoShort("Server's manifest URL can be found on your clipboard");
  }
}
