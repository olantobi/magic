
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

// Angular and system imports.
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Application specific imports.
import { IdeComponent } from './components/ide/ide.component';
import { LogComponent } from './components/log/log.component';
import { SqlComponent } from './components/sql/sql.component';
import { AuthComponent } from './components/auth/auth.component';
import { HomeComponent } from './components/home/home.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { BazarComponent } from './components/bazar/bazar.component';
import { FilesComponent } from './components/files/files.component';
import { AboutComponent } from './components/about/about.component';
import { ConfigComponent } from './components/config/config.component';
import { CryptoComponent } from './components/crypto/crypto.component';
import { SocketsComponent } from './components/sockets/sockets.component';
import { TerminalComponent } from './components/terminal/terminal.component';
import { CrudifierComponent } from './components/crudifier/crudifier.component';
import { EndpointsComponent } from './components/endpoints/endpoints.component';
import { EvaluatorComponent } from './components/evaluator/evaluator.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { DiagnosticsComponent } from './components/diagnostics/diagnostics.component';
import { ConfirmEmailComponent } from './components/auth/confirm-email/confirm-email.component';
import { ChangePasswordComponent } from './components/auth/change-password/change-password.component';

/**
 * Routes for application.
 */
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'sql', component: SqlComponent },

  // Avoids re-initializing component as user opens and closes view details / URL link
  { path: 'log', redirectTo: 'log/' },
  { path: 'log/:id', component: LogComponent },
  { path: 'ide', component: IdeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'tasks', component: TasksComponent },
  { path: 'bazar', component: BazarComponent },
  { path: 'about', component: AboutComponent },
  { path: 'config', component: ConfigComponent },
  { path: 'crypto', component: CryptoComponent },
  { path: 'sockets', component: SocketsComponent },
  { path: 'terminal', component: TerminalComponent },
  { path: 'file-system', component: FilesComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'endpoints', component: EndpointsComponent },
  { path: 'evaluator', component: EvaluatorComponent },
  { path: 'crudifier', component: CrudifierComponent },
  { path: 'diagnostics', component: DiagnosticsComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },
  { path: 'change-password', component: ChangePasswordComponent },
];

/**
 * Main module for application.
 */
@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
