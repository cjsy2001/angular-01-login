import { Component, Inject } from '@angular/core';
import { faUser, faPowerOff } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '@auth0/auth0-angular';
import { AsyncPipe, DOCUMENT, NgIf } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  NgbCollapse,
  NgbDropdown,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css'],
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdown,
    NgbCollapse,
    AsyncPipe,
    NgIf,
    RouterLink,
  ],
})
export class NavBarComponent {
  isCollapsed = true;
  faUser = faUser;
  faPowerOff = faPowerOff;

  constructor(
    public auth: AuthService,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  loginWithRedirect(email?: string) {
    // Connection mapping for different domains/scenarios
    const connectionMap: { [key: string]: string } = {
      'p2es.com': 'p2devop-dev-aad',     // B2B guests from p2es.com
      'p2devops.com': 'p2devop-dev-aad', // Native p2devops users
    };

    // If email is provided, determine the connection based on domain
    if (email) {
      const domain = email.split('@')[1];
      const connection = connectionMap[domain];
      
      if (connection) {
        // Force specific enterprise connection
        this.auth.loginWithRedirect({
          authorizationParams: {
            connection: connection,
            login_hint: email,
            domain_hint: domain
          }
        });
        return;
      }
    }
    
    // Default behavior - let Auth0 determine the connection
    this.auth.loginWithRedirect();
  }
  
  // Quick method for testing B2B guest login
  loginAsB2BGuest() {
    this.loginWithRedirect('jxc0116@p2es.com');
  }
  
  // Method to force specific connection (for testing)
  loginWithConnection(connectionName: string) {
    this.auth.loginWithRedirect({
      authorizationParams: {
        connection: connectionName
      }
    });
  }

  logout() {
    this.auth.logout({ logoutParams: { returnTo: this.doc.location.origin } });
  }
}
