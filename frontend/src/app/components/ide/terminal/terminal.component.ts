
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

// Angular and system imports.
import { Terminal } from 'xterm';
import { Subscription } from 'rxjs';
import { HubConnection, HubConnectionBuilder} from '@aspnet/signalr';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';

// Application specific imports.
import { Message } from 'src/app/models/message.model';
import { MessageService } from 'src/app/services/message.service';
import { BackendService } from 'src/app/services/backend.service';

/**
 * Terminal component for allowing user to use the terminal through a web based interface
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss']
})
export class TerminalComponent implements OnInit, OnDestroy {

  // Subscription for message service.
  private subscription: Subscription;

  // Actual XTerm instance.
  private term: Terminal;

  // SignalR hub connection
  private hubConnection: HubConnection;

  // Buffer for text currently typed into terminal.
  private buffer: string = '';

  /**
   * Current working folder for terminal script.
   */
  public currentFolder = '/';

  /**
   * Wrapper div for terminal.
   */
  @ViewChild('terminal', {static: true}) terminal: ElementRef;

   /**
    * Creates an instance of your component.
    * 
    * @param messageService Service used to publish messages to other components in the system
    * @param backendService Needed to retrieve the root URL for backend used by SignalR.
    */
  public constructor(
    private messageService: MessageService,
    private backendService: BackendService) { }

  /**
   * Implementation of OnInit.
   */
  public ngOnInit() {

    // Making sure we subscribe to relevant messages.
    this.subscription = this.messageService.subscriber().subscribe((msg: Message) => {

      // Checking if this is an interesting message.
      if (msg.name === 'terminal.current-folder.set') {

        // Creating our XTerm component.
        this.term = new Terminal();
        this.term.open(this.terminal.nativeElement);
        this.term.focus();

        // Settings current working folder.
        this.currentFolder = <string>msg.content;
        this.term.writeln('Hyper terminal');
        this.term.writeln('');
        this.term.write('$ ');

        // Subscribing to key events.
        this.term.onKey((key) => {

          // Checking if user clicked CR.
          if (key.key === '\r') {

            // Invoking backend using SignalR.
            if (this.buffer.length > 0) {
              this.hubConnection.invoke('execute', '/system/ide/bash-command', JSON.stringify({
                cmd: this.buffer,
              }));
            }

            // Adding CR sequence into terminal, and starting new line, clearing buffer.
            this.term.writeln('');
            this.term.write('$ ');
            this.buffer = '';
    
          } else {

            // Appending text to buffer.
            this.buffer += key.key;
            this.term.write(key.key);
          }
        });

        // Connecting to SignalR socket.
        this.connectToTerminal();
      }
    });
  }

  /**
   * Implementation of OnDestroy.
   */
   public ngOnDestroy() {

    // Unsubscribing to message subscription.
    this.subscription.unsubscribe();

    // Closing SignalR connection, making sure we stop terminal on server first.
    this.hubConnection.invoke('execute', '/system/ide/bash-stop', null).then(() => {

      // Closing SignalR socket connection.
      this.hubConnection.stop();
    });
  }

  /**
   * Invoked when terminal should be closed.
   */
  public closeTerminal() {

    // Transmitting message to inform subscribers of that terminal window should be closed.
    this.messageService.sendMessage({
      name: 'terminal.close'
    });
  }

  /*
   * Private helper methods.
   */

  /*
   * Connects to SignalR socket.
   */
  private connectToTerminal() {

    // Creating our hub connection.
    let builder = new HubConnectionBuilder();
    this.hubConnection = builder.withUrl(this.backendService.current.url + '/signalr', {
        accessTokenFactory: () => this.backendService.current.token
      }).build();

    /*
     * Subscribing to [ide.terminal] messages which are transmitted by
     * the backend once some terminal output is ready.
     */
    this.hubConnection.on('ide.terminal.out', (args) => {
      
      // Writing result to xterm instance.
      const json = JSON.parse(args);
      this.term.writeln(json.result);

      // Making sure we prepend next line with some terminal lookalike characters.
      this.term.write('$ ');
    });

    // Connecting to SignalR
    this.hubConnection.start().then(() => {

      // When connected over socket we need to spawn a terminal on the server.
      this.hubConnection.invoke('execute', '/system/ide/bash-start', null);
    });
  }
}