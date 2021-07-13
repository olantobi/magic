
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

// Angular and system imports.
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';

// Application specific imports.
import { FlatNode } from './models/flat-node.model';
import { FileNode } from './models/file-node.model';
import { TreeNode } from './models/tree-node.model';
import { Response } from 'src/app/models/response.model';
import { FileService } from '../files/services/file.service';
import { FeedbackService } from 'src/app/services/feedback.service';
import { EvaluatorService } from '../evaluator/services/evaluator.service';
import { MacroDefinition } from '../files/services/models/macro-definition.model';
import { PreviewFileDialogComponent } from './preview-file-dialog/preview-file-dialog.component';
import { ExecuteMacroDialogComponent } from './execute-macro-dialog/execute-macro-dialog.component';
import { Macro, SelectMacroDialogComponent } from './select-macro-dialog/select-macro-dialog.component';
import { FileObjectName, RenameFileDialogComponent } from './rename-file-dialog/rename-file-dialog.component';
import { FileObject, NewFileFolderDialogComponent } from './new-file-folder-dialog/new-file-folder-dialog.component';

// File types extensions.
import fileTypes from './../files/file-editor/file-types.json';

/**
 * IDE component for creating Hyperlambda apps.
 */
@Component({
  selector: 'app-ide',
  templateUrl: './ide.component.html',
  styleUrls: ['./ide.component.scss']
})
export class IdeComponent implements OnInit {

  // Known file extensions we've got editors for.
  private extensions = fileTypes;

  // Root tree node pointing to root folder.
  private root: TreeNode = {
    name: '/',
    path: '/',
    isFolder: true,
    children: [],
    level: 0,
  };

  // Transforms from internal data structure to tree control's expectations.
  private _transformer = (node: TreeNode, level: number) => {
    return {
      expandable: node.isFolder,
      name: node.name,
      level: level,
      node: node,
    };
  };

  // Flattens tree structure.
  private treeFlattener = new MatTreeFlattener(this._transformer, node => node.level, node => node.expandable, node => node.children);

  /**
   * Actual tree control for component.
   */
  public treeControl = new FlatTreeControl<FlatNode>(node => node.level, node => node.expandable);

  /**
   * Actual data source for tree control.
   */
  public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  /**
   * Currently edited files.
   */
  public files: FileNode[] = [];

  /**
   * Currently active edited file's full path.
   */
  public activeFile: string = '';

  /**
   * Currently active folder, which is dependent upon file selected, etc.
   */
   public activeFolder: string = '/';

  /**
   * Creates an instance of your component.
   * 
   * @param dialog Needed to create modal dialogs
   * @param cdRef Needed to mark component as having changes
   * @param fileService Needed to load and save files.
   * @param feedbackService Needed to display feedback to user
   * @param messageService Service used to publish messages to other components in the system
   * @param evaluatorService Needed to retrieve vocabulary from backend, in addition to executing Hyperlambda files
   */
  public constructor(
    private dialog: MatDialog,
    private cdRef:ChangeDetectorRef,
    private fileService: FileService,
    private feedbackService: FeedbackService,
    private evaluatorService: EvaluatorService) { }

  /**
   * OnInit implementation.
   */
  public ngOnInit() {

    // Retrieving files and folder from server.
    this.getFilesFromServer();
  }

  /**
   * Implementation of AfterViewInit
   */
   public ngAfterViewInit() {

    // Retrieving server's vocabulary.
    if (!window['_vocabulary']) {

      // Loading vocabulary from server before initializing editor.
      this.evaluatorService.vocabulary().subscribe((vocabulary: string[]) => {

        // Publishing vocabulary such that autocomplete component can reach it.
        window['_vocabulary'] = vocabulary;

      }, error => this.feedbackService.showError(error));
    }
  }

  /**
   * Invoked when files needs to be fetched from the server.
   */
   public getFilesFromServer() {

    // Common function object for adding folders and files to root graph object.
    const functor = (objects: string[], isFolder: boolean) => {

      // Adding folder to root graph object.
      for (const idx of objects) {

        // Finding parent node of currently iterated folder.
        const entities = idx.split('/').filter(x => x !== '');
        let parent = this.root;
        let level = 1;
        for (const idxPeek of entities.slice(0, entities.length - 1)) {
          parent = parent.children.filter(x => x.name === idxPeek)[0];
          level += 1;
        }

        // Adding folder to graph object, now under correct parent.
        parent.children.push({
          name: entities[entities.length - 1],
          path: idx,
          isFolder: isFolder,
          level: level,
          children: [],
        });
      }
    };

    // Retrieving files from backend.
    this.fileService.listFoldersRecursively('/').subscribe((folders: string[]) => {

      // Adding folder to root graph object.
      functor(folders, true);

      // Retrieving all files from backend.
      this.fileService.listFilesRecursively('/').subscribe((files: string[]) => {
        
        // Adding files to root graph object.
        functor(files, false);

        // Databinding tree control initially.
        this.dataSource.data = this.root.children;

      }, (error: any) => this.feedbackService.showError(error));

    }, (error: any) => this.feedbackService.showError(error));
  }

  /**
   * Invoked when user wants to create a new file or folder.
   */
  public createNewFileObject() {

    // Retrieving all existing folders in system to allow user to select folder to create object within.
    const folders = this.getFolders();

    // Retieving all existing files to prevent user from creating a new file that already exists.
    const files = this.getFiles();

    // Creating modal dialog responsible for asking user for name and type of object.
    const dialogRef = this.dialog.open(NewFileFolderDialogComponent, {
      width: '550px',
      data: {
        isFolder: false,
        name: '',
        path: this.activeFolder,
        folders: folders,
        files: files,
      },
    });

    // Subscribing to closed event and creating a new folder if we're given a folder name.
    dialogRef.afterClosed().subscribe((result: FileObject) => {

      // Verifying user clicked rename button
      if (result) {

        // Finding tree node for where file/folder is to be created, such that we can inject object into tree structure.
        const node = this.findTreeNodeFolder(this.root, result.path);

        // Common sorter object used for both files and folders branch.
        const sorter = () => {

          // Sorting children such that folder comes before files, and everything else is sorted case insensitively.
          node.children.sort((lhs: TreeNode, rhs: TreeNode) => {
            if (lhs.isFolder && !rhs.isFolder) {
              return -1;
            } else if (!lhs.isFolder && rhs.isFolder) {
              return 1;
            }
            const lhsLowers = lhs.path.toLowerCase();
            const rhsLowers = rhs.path.toLowerCase();
            if (lhsLowers < rhsLowers) {
              return -1;
            } else if (lhsLowers > rhsLowers) {
              return 1;
            }
            return 0;
          });
        };

        // Invoking backend to rename file or folder.
        let path = result.path + result.name;

        // Checking if we're creating a folder or a file.
        if (result.isFolder) {

          // Making sure we append end slash.
          path += '/';

          // We're supposed to create a folder.
          this.fileService.createFolder(path).subscribe(() => {

            // Showing user some feedback.
            this.feedbackService.showInfoShort('Folder successfully created');

            // Adding tree node for folder into tree node hierarchy to make sure tree control is updated.
            node.children.push({
              name: result.name,
              path: path,
              isFolder: true,
              level: result.path.split('/').filter(x => x !== '').length + 1,
              children: [],
            });

            // Making sure we sort nodes at level before we databind tree control again.
            sorter();

            // Databinding tree control again.
            this.dataBindTree();

          }, (error: any) => this.feedbackService.showError(error));

        } else {

          // Pushing file on to currently edited files list.
          const fileNode: FileNode = {
            name: result.name,
            path: path,
            options: this.getCodeMirrorOptions(result.name),
            content: result.template || '// File content here ...'
          };
          this.files.push(fileNode);

          // Adding tree node for folder into tree node hierarchy to make sure tree control is updated.
          node.children.push({
            name: result.name,
            path: path,
            isFolder: false,
            level: result.path.split('/').filter(x => x !== '').length + 1,
            children: [],
          });

          // Making sure file becomes active.
          this.activeFile = path;

          // Making sure we sort nodes at level before we databind tree control again.
          sorter();

          // Databinding tree control again.
          this.dataBindTree();

          // Marking document as clean.
          this.saveFile(fileNode);

          // Making sure we re-check component for changes to avoid CDR errors.
          this.cdRef.detectChanges();
        }
      }
    });
  }

  /**
   * Returns true if active file is dirty.
   */
  public activeFileIsClean() {

    // Retrieving active CodeMirror editor to check if its document is dirty or not.
    var activeWrapper = document.querySelector('.active-codemirror-editor');
    if (activeWrapper) {
      var editor = (<any>activeWrapper.querySelector('.CodeMirror'))?.CodeMirror;
      if (editor) {
        return editor.isClean();
      }
    }
    return true;
  }

  /**
   * Returns true if specified node has children.
   */
  public isExpandable(_: number, node: FlatNode) {
    return node.expandable;
  }

  /**
   * Invoked when user wants to open a file.
   * 
   * @param file Tree node wrapping file to open
   */
  public openFile(file: TreeNode) {

    // Checking if file is already opened.
    if (this.files.filter(x => x.path === file.path).length > 0) {

      // Yup, file already opened.
      this.activeFile = file.path;

      // Setting focus to active editor.
      this.setFocusToActiveEditor();

    } else {

      // Retrieving file's content from backend.
      this.fileService.loadFile(file.path).subscribe((content: string) => {

        // Pushing specified file into files currently being edited object.
        this.files.push({
          name: file.name,
          path: file.path,
          content: content,
          options: this.getCodeMirrorOptions(file.path),
        });
        this.activeFile = file.path;
        setTimeout(() => {
          var activeWrapper = document.querySelector('.active-codemirror-editor');
          var editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
          editor.doc.markClean();
        }, 1);

        // Making sure we re-check component for changes to avoid CDR errors.
        this.cdRef.detectChanges();

      }, (error: any) => this.feedbackService.showError(error));
    }

    // Changing active folder.
    this.activeFolder = file.path.substr(0, file.path.lastIndexOf('/') + 1);
  }

  /**
   * Invoked when user wants to open a folder.
   * 
   * @param folder Tree node wrapping folder to open
   */
   public openFolder(folder: TreeNode) {
     this.activeFolder = folder.path;
   }

   /**
    * Invoked when the currently selected file is changed.
    */
   public selectedFileChanged() {

    // Assigning model.
    this.activeFolder = this.activeFile.substr(0, this.activeFile.lastIndexOf('/') + 1);

    // Making sure we give focus to newly activated editor.
    this.setFocusToActiveEditor();
   }

  /**
   * Invoked when a file should be saved.
   * 
   * @param file File to save
   */
   public saveFile(file: FileNode) {

    // Saving file by invoking backend.
    this.fileService.saveFile(file.path, file.content).subscribe(() => {

      // Marking document as clean.
      var activeWrapper = document.querySelector('.active-codemirror-editor');
      var editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
      editor.doc.markClean();

      // Providing feedback to user.
      this.feedbackService.showInfoShort('File successfully saved');

    }, (error: any) => this.feedbackService.showError(error));
  }

  /**
   * Invoked when a file should be executed.
   * 
   * @param file File to execute
   */
   public executeFile(file: FileNode) {

    // Saving file by invoking backend before we execute it.
    this.fileService.saveFile(file.path, file.content).subscribe(() => {

      // Marking document as clean.
      var activeWrapper = document.querySelector('.active-codemirror-editor');
      var editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
      editor.doc.markClean();

      // Then executing file's content.
      this.evaluatorService.execute(file.content).subscribe(() => {

        // Providing feedback to user.
        this.feedbackService.showInfoShort('File successfully saved and executed');

      }, (error: any) => this.feedbackService.showError(error));

    }, (error: any) => this.feedbackService.showError(error));
  }

  /**
   * Invoked when a file should be previewed.
   * 
   * @param file File to preview
   */
   public previewFile(file: FileNode) {

    // Opening up a modal dialog to preview file.
    this.dialog.open(PreviewFileDialogComponent, {
      data: file.content,
    });
  }

  /**
   * Invoked when a file should be renamed.
   * 
   * @param file File to rename
   */
   public renameFile(file: FileNode) {

    // Opening up a modal dialog to preview file.
    const dialog = this.dialog.open(RenameFileDialogComponent, {
      width: '550px',
      data: {
        name: file.name,
      },
    });
    dialog.afterClosed().subscribe((data: FileObjectName) => {

      // Checking if user wants to rename file.
      if (data) {

        // Invoking backend to rename object.
        this.fileService.rename(file.path, data.name).subscribe(() => {

          // Updating treeview model.
          const treeNode = this.findTreeNodeFolder(this.root, file.path);          
          treeNode.name = data.name;
          treeNode.path = file.path.substr(0, file.path.lastIndexOf('/') + 1) + data.name;

          // Updating model.
          file.name = treeNode.name;
          file.path = treeNode.path;

          // Updating active file.
          this.activeFile = file.path;

          // Databinding tree again.
          this.dataBindTree();

          // Showing user some feedback.
          this.feedbackService.showInfoShort('File successfully renamed');

        }, (error: any) => this.feedbackService.showError(error));
      }
    });
  }

  /**
   * Invoked when a file should be deleted.
   * 
   * @param file File to delete
   */
   public deleteFile(file: FileNode) {

    // Asking user to confirm action.
    this.feedbackService.confirm('Confirm action', 'Are you sure you want to delete currently active file?', () => {

      // Deleting file by invoking backend.
      this.fileService.deleteFile(file.path).subscribe(() => {

        // Removing node from collection.
        if (this.removeNode(file.path)) {
      
          // This will databind the tree control again, making sure we keep expanded nodes as such.
          this.dataBindTree();

          // Closing file.
          this.closeFile(this.files.filter(x => x.path === file.path)[0], true);
        }

        // Providing feedback to user.
        this.feedbackService.showInfoShort('File successfully deleted');

      }, (error: any) => this.feedbackService.showError(error));
    });
  }

  /**
   * Invoked when a file should be closed.
   * 
   * @param file File to close
   * @param force If true user will not be warned about unsaved changes
   */
  public closeFile(file: FileNode, noDirtyWarnings: boolean = false) {

    // Checking if content is dirty.
    const shouldWarn = () => {
      if (noDirtyWarnings) {
        return false;
      }
      var activeWrapper = document.querySelector('.active-codemirror-editor');
      var editor = (<any>activeWrapper.querySelector('.CodeMirror')).CodeMirror;
      return !editor.doc.isClean();
    };
    if (!shouldWarn()) {

      // File has not been edited and we can close editor immediately.
      this.closeFileImpl(file);

    } else {

      // File has been edited, and we need to inform user allowing him to save it.
      this.feedbackService.confirm('File not saved', 'File has unsaved changes, are you sure you want to close the file?', () => {

        // User confirmed he wants to close file, even though the editor is dirty (has changes).
        this.closeFileImpl(file);
      });
    }
  }

  /**
   * Deletes the currently active folder.
   */
  public deleteActiveFolder() {

    // Asking user to confirm action.
    this.feedbackService.confirm('Confirm action', `Are you sure you want to delete the '${this.activeFolder}' folder?`, () => {

      // Invoking backend to actually delete folder.
      this.fileService.deleteFolder(this.activeFolder).subscribe(() => {

        // Showing feedback to user and updating treeview.
        this.removeNode(this.activeFolder);
        this.feedbackService.showInfoShort('Folder successfully deleted');

        // Making sure we remove all files existing within the folder that are currentl edited.
        this.files = this.files.filter(x => !x.path.startsWith(this.activeFolder));

        // Verifying that active file is not one of the files actually removed in above logic.
        if (this.files.filter(x => x.path === this.activeFile).length === 0) {

          // Verifying there are any open files left.
          if (this.files.length > 0) {
            this.activeFile = this.files[0].path;
          } else {
            this.activeFile = null;
          }
        }

        // Databinding tree again.
        this.dataBindTree();

      }, (error: any) => this.feedbackService.showError(error));
    });
  }

  /**
   * Invoked when user wants to execute a macro.
   */
  public selectMacro() {

    // Opening modal dialog allowing user to select macro.
    const dialogRef = this.dialog.open(SelectMacroDialogComponent, {
      width: '550px',
      data: {
        name: '',
      },
    });

    // Subscribing to closed event and creating a new folder if we're given a folder name.
    dialogRef.afterClosed().subscribe((result: Macro) => {

      // Verifying user selected a macro.
      if (result) {

        // User selected a macro, executing it.
        this.executeMacro(result.name);
      }
    });
  }

  /*
   * Private helper methods.
   */

  /*
   * Executes the specified macro.
   */
  private executeMacro(file: string) {

    // Retrieving macro's arguments and description.
    this.fileService.getMacroDefinition(file).subscribe((result: MacroDefinition) => {

      /*
       * Filling out default values for anything we can intelligently figure
       * out according to selected folder.
       */
      const splits = this.activeFolder.split('/');
      if (splits.length === 4 && splits[1] === 'modules') {
        const moduleArgs = result.arguments.filter(x => x.name === 'module' || x.name === 'database');
        if (moduleArgs.length > 0) {
          for (const idx of moduleArgs) {
            idx.value = splits[2];
          }
        }
      }

      // Opening modal dialog allowing user to select macro.
      const dialogRef = this.dialog.open(ExecuteMacroDialogComponent, {
        data: result,
      });

      // Subscribing to closed event and creating a new folder if we're given a folder name.
      dialogRef.afterClosed().subscribe((result: MacroDefinition) => {

        // Verifying user decorated the macro.
        if (result && result.name) {

          // User decorated macro, executing macro now by invoking backend.
          const payload = {};
          for (const idx of result.arguments.filter(x => x.value)) {
            payload[idx.name] = idx.value;
          }
          this.fileService.executeMacro(file, payload).subscribe((exeResult: Response) => {

            // Giving user some feedback.
            this.feedbackService.showInfoShort('Macro successfully executed');

            // Checking if macro changed folder or file structure in backend.
            if (exeResult.result === 'folders-changed') {

              // Asking user if he wants to refresh his folders.
              this.feedbackService.confirm(
                'Refresh folders?', 
                'Macro execution changed your file system, do you want to refresh your files and folders?',
                () => {

                  // Refreshing files and folder.
                  this.root.children = [];
                  this.getFilesFromServer();
              });
            }

          }, (error: any) => this.feedbackService.showError(error));

        } else if (result) {
          
          // Assuming user wants to select another macro.
          this.selectMacro();

        } // Else, do nothing ...
      });

    }, (error: any) => this.feedbackService.showError(error));
  }

  /*
   * Returns all folders in system to caller.
   */
  private getFolders(current: TreeNode = this.root) {

    // Finding all folders in currently iterated level.
    const result: string[] = [];
    if (current.isFolder) {
      result.push(current.path);
    }
    for (const idx of current.children.filter(x => x.isFolder)) {
      const inner = this.getFolders(idx);
      for (const idxInner of inner) {
        result.push(idxInner);
      }
    }
    return result;
  }

  /*
   * Returns all folders in system to caller.
   */
  private getFiles(current: TreeNode = this.root) {

    // Finding all files in currently iterated level.
    let result: string[] = [];
    for (const idx of current.children.filter(x => !x.isFolder)) {
      result.push(idx.path);
    }
    for (const idx of current.children.filter(x => x.isFolder)) {
      result = result.concat(this.getFiles(idx));
    }
    return result;
  }

  /*
   * Invoked when we need to find the specified tree node.
   */
  private findTreeNodeFolder(node: TreeNode, path: string) : TreeNode {

    // Checking if this is the guy we're looking for.
    if (node.path === path) {
      return node;
    }

    // Recursively searching through children nodes.
    for (const idx of node.children) {
      const tmpResult = this.findTreeNodeFolder(idx, path);
      if (tmpResult) {

        // This is our guy!
        return tmpResult
      }
    }
    return null;
  }

  /*
   * Invoked when a node should be removed from tree node collection.
   */
  private removeNode(path: string, node: TreeNode = this.root) {

    // Checking if node to be removed exists in current node's children collection.
    const toBeRemoved = node.children.filter(x => x.path === path);
    if (toBeRemoved.length > 0) {
      node.children.splice(node.children.indexOf(toBeRemoved[0]), 1);
      return true;
    }

    // Recursively iterate children collection.
    for (const idx of node.children.filter(x => path.startsWith(x.path))) {
      if (this.removeNode(path, idx)) {
        return true;
      }
    }
    return false;
  }

  /*
   * Databinds tree control such that expanded items stays expanded.
   */
  private dataBindTree() {

    // Storing all expanded items in tree control.
    const expanded: FlatNode[] = [];
    for (const idx of this.treeControl.dataNodes) {
      if (this.treeControl.isExpanded(idx)) {
        expanded.push(idx);
      }
    }

    // Re-databinding tree control.
    this.dataSource.data = this.root.children;

    // Expanding all items that was previously expanded.
    for (const idx of this.treeControl.dataNodes) {
      if (expanded.filter(x => (<any>x).node.path === (<any>idx).node.path).length > 0) {
        this.treeControl.expand(idx);
      }
    }
  }

  /*
   * Returns options for CodeMirror editor.
   */
  private getCodeMirrorOptions(path: string) {

    // We're supposed to create a file. Notice, we don't actually create the file, only open it in edit mode.
    const extension = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
    let options = this.extensions.filter(x => x.extensions.indexOf(extension) !== -1);
    if (options.length === 0) {

      // Oops, no editor for file type, defaulting to Markdown bugger.
      options = this.extensions.filter(x => x.options.mode === 'markdown');
    }

    // Turning on keyboard shortcuts.
    if (options[0].options.extraKeys) {

      // Alt+M maximises editor.
      options[0].options.extraKeys['Alt-M'] = (cm: any) => {

        // Toggling maximise mode.
        cm.setOption('fullScreen', !cm.getOption('fullScreen'));
      };

      // Alt+S saves the active file.
      options[0].options.extraKeys['Alt-S'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var activeWrapper = document.querySelector('.active-codemirror-editor');
        if (activeWrapper) {
          var btn = (<any>activeWrapper.querySelector('.save-file-btn'));
          if (btn) {
            btn.click();
          }
        }
      };

      // Alt+D deletes the active file.
      options[0].options.extraKeys['Alt-D'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var activeWrapper = document.querySelector('.active-codemirror-editor');
        if (activeWrapper) {
          var btn = (<any>activeWrapper.querySelector('.delete-file-btn'));
          if (btn) {
            btn.click();
          }
        }
      };

      // Alt+C deletes the active file.
      options[0].options.extraKeys['Alt-C'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var activeWrapper = document.querySelector('.active-codemirror-editor');
        if (activeWrapper) {
          var btn = (<any>activeWrapper.querySelector('.close-file-btn'));
          if (btn) {
            btn.click();
          }
        }
      };

      // Alt+R renames the active file.
      options[0].options.extraKeys['Alt-R'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var activeWrapper = document.querySelector('.active-codemirror-editor');
        if (activeWrapper) {
          var btn = (<any>activeWrapper.querySelector('.rename-file-btn'));
          if (btn) {
            btn.click();
          }
        }
      };

      // Alt+N opens up create new file object dialog.
      options[0].options.extraKeys['Alt-A'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var btn = <any>document.querySelector('.new-file-object-btn');
        if (btn) {
          if (btn) {
            btn.click();
          }
        }
      };

      // Alt+X deletes currently selected folder.
      options[0].options.extraKeys['Alt-X'] = (cm: any) => {

        // Retrieving active CodeMirror editor to check if its document is dirty or not.
        var btn = <any>document.querySelector('.delete-folder-btn');
        if (btn) {
          if (btn) {
            btn.click();
          }
        }
      };
    }
    return options[0].options;
  }

  /*
   * Actual method responsible for closing file.
   */
  private closeFileImpl(file: FileNode) {

    // Removing file from edited files.
    let idx = this.files.indexOf(file);
    this.files.splice(idx, 1);
    if (this.files.length === 0) {
      this.activeFile = null;
    } else {
      if (idx === 0) {
        this.activeFile = this.files[0].path;
      } else {
        this.activeFile = this.files[idx - 1].path;
      }
    }

    // Making sure we give focus to newly activated editor.
    this.setFocusToActiveEditor();
  }

  /*
   * Sets focus to active editor.
   */
  private setFocusToActiveEditor() {

    // Needs to be delayed.
    setTimeout(() => {
      var activeWrapper = document.querySelector('.active-codemirror-editor');
      if (activeWrapper) {
        var editor = (<any>activeWrapper.querySelector('.CodeMirror'))?.CodeMirror;
        if (editor) {
          editor.focus();
        }
      }
    }, 1);
  }
}
