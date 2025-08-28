import { ZeroFrame } from './lib/ZeroFrame.js';
import { ZeroPage } from './lib/ZeroPage.js';
import { Repository } from './lib/Repository.js';
import { UIManager } from './utils/UIManager.js';

class GitCenterApp {
  constructor() {
    this.zeroFrame = new ZeroFrame();
    this.zeroPage = new ZeroPage(this.zeroFrame);
    this.uiManager = new UIManager();
    this.isInitialized = false;
  }

  async init() {
    try {
      await this.setupPermissions();
      await this.setupMergers();
      this.setupEventListeners();
      this.updateTitle();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Git Center:', error);
      this.uiManager.showError('Failed to initialize application');
    }
  }

  async setupPermissions() {
    const siteInfo = await this.zeroPage.getSiteInfo();
    
    const requiredPermissions = [
      'Merger:GitCenter',
      'Cors:1iD5ZQJMNXu43w1qLB8sfdHVKppVMduGz'
    ];

    for (const permission of requiredPermissions) {
      if (!siteInfo.settings.permissions.includes(permission)) {
        if (permission.startsWith('Merger:')) {
          await this.zeroPage.cmd('wrapperPermissionAdd', [permission]);
        } else if (permission.startsWith('Cors:')) {
          await this.zeroPage.cmd('corsPermission', [permission.split(':')[1]]);
        }
      }
    }
  }

  async setupMergers() {
    const mergerList = await this.zeroPage.cmd('mergerSiteList');
    
    const requiredSites = [
      '1RepoXU8bQE9m7ssNwL4nnxBnZVejHCc6', // Default repo
      '1iNDExENNBsfHc6SKmy1HaeasHhm3RPcL'  // Index
    ];

    for (const siteAddress of requiredSites) {
      if (!mergerList[siteAddress]) {
        await this.zeroPage.cmd('mergerSiteAdd', [siteAddress]);
      }
    }
  }

  setupEventListeners() {
    const createRepoButton = document.getElementById('create_repository');
    if (createRepoButton) {
      createRepoButton.classList.remove('btn-disabled');
      createRepoButton.addEventListener('click', this.handleCreateRepository.bind(this));
    }

    // Handle navigation
    document.addEventListener('click', this.handleNavigation.bind(this));
  }

  async handleCreateRepository() {
    try {
      await Repository.createRepo(this.zeroPage);
    } catch (error) {
      console.error('Failed to create repository:', error);
      this.uiManager.showError('Failed to create repository');
    }
  }

  handleNavigation(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.href.startsWith('http') || link.href.includes('://')) {
      return;
    }

    // Handle internal navigation if needed
    // This could be expanded for SPA-like behavior
  }

  updateTitle(title = '') {
    const fullTitle = title ? `${title} - Git Center` : 'Git Center';
    document.title = fullTitle;
    
    // Update title periodically to handle ZeroNet title changes
    setTimeout(() => {
      if (document.title === fullTitle) {
        this.zeroPage.cmd('wrapperSetTitle', [fullTitle]);
        setTimeout(() => this.updateTitle(title), 1000);
      }
    }, 100);
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const app = new GitCenterApp();
  await app.init();
  
  // Make app globally available for debugging
  window.gitCenter = app;
});

// Handle page load event
window.addEventListener('load', () => {
  // Additional initialization if needed
});