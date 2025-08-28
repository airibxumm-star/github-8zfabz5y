/**
 * Modern Repository class with improved structure and error handling
 */

import { Git } from './Git.js';
import { Hg } from './Hg.js';

export class Repository {
  constructor(address, zeroPage) {
    this.address = address;
    this.zeroPage = zeroPage;
    this.content = null;
    this.vcs = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      this.content = await this.getContent();
      
      if (this.content.git) {
        this.vcs = new Git(`merged-GitCenter/${this.address}/${this.content.git}`, this.zeroPage);
      } else if (this.content.hg) {
        this.vcs = new Hg(`merged-GitCenter/${this.address}/${this.content.hg}`, this.zeroPage);
      } else {
        throw new Error('Repository type not supported');
      }

      await this.vcs.init();
      this.isInitialized = true;
    } catch (error) {
      console.error('Repository initialization failed:', error);
      throw error;
    }
  }

  async getContent() {
    if (this.content) return this.content;

    try {
      const contentStr = await this.zeroPage.readFile(`merged-GitCenter/${this.address}/content.json`);
      this.content = JSON.parse(contentStr);
      return this.content;
    } catch (error) {
      console.error('Failed to load repository content:', error);
      throw new Error('Repository not found or inaccessible');
    }
  }

  async getBranches() {
    await this.init();
    return this.vcs.getRefList();
  }

  async getFiles(branch, path = '') {
    await this.init();
    
    try {
      const commit = await this.vcs.readBranchCommit(branch);
      return this.vcs.readTreeItem(commit.content.tree, path);
    } catch (error) {
      console.error(`Failed to get files for ${branch}:${path}:`, error);
      throw error;
    }
  }

  async getFile(branch, path) {
    await this.init();
    
    try {
      const commit = await this.vcs.readBranchCommit(branch);
      const file = await this.vcs.readTreeItem(commit.content.tree, path);
      
      if (file.type !== 'blob') {
        throw new Error('Path is not a file');
      }
      
      return file.content;
    } catch (error) {
      console.error(`Failed to get file ${branch}:${path}:`, error);
      throw error;
    }
  }

  async saveFile(path, content, branch, message) {
    await this.init();
    
    try {
      const auth = await this.getAuth();
      const author = await this.getAuthorString(auth);
      
      const commit = {
        tree: [{
          name: path,
          type: 'blob',
          content: content
        }],
        parents: [await this.vcs.getBranchCommit(branch)],
        author,
        committer: author,
        message
      };

      const commitId = await this.vcs.writeCommit(commit);
      await this.vcs.setRef(`refs/heads/${branch}`, commitId);
      
      return commitId;
    } catch (error) {
      console.error(`Failed to save file ${path}:`, error);
      throw error;
    }
  }

  async getAuth() {
    // This would integrate with ZeroID authentication
    // For now, return a placeholder
    return {
      address: 'user_address',
      user: 'username@zeroid.bit'
    };
  }

  async getAuthorString(auth) {
    const profile = await this.getUserProfile(auth.address);
    const name = profile.commitName || auth.user.split('@')[0];
    const email = profile.commitEmail || auth.user;
    const timestamp = Math.floor(Date.now() / 1000);
    const timezone = this.getTimezoneOffset();
    
    return `${name} <${email}> ${timestamp} ${timezone}`;
  }

  async getUserProfile(address) {
    try {
      const profileStr = await this.zeroPage.readFile(`data/users/${address}/data.json`);
      return JSON.parse(profileStr);
    } catch (error) {
      return {};
    }
  }

  getTimezoneOffset() {
    const offset = new Date().getTimezoneOffset() * -1;
    const hours = Math.floor(Math.abs(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset >= 0 ? '+' : '-';
    
    return `${sign}${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
  }

  async isSignable(path = 'content.json') {
    try {
      const siteInfo = await this.zeroPage.getSiteInfo();
      return siteInfo.settings.own || false;
    } catch (error) {
      return false;
    }
  }

  async fork() {
    try {
      await this.zeroPage.cmd('mergerSiteClone', [this.address]);
      this.zeroPage.alert('Repository forked successfully!');
    } catch (error) {
      console.error('Fork failed:', error);
      throw new Error('Failed to fork repository');
    }
  }

  // Static method for creating new repositories
  static async createRepo(zeroPage) {
    try {
      const result = await zeroPage.cmd('mergerSiteClone', ['1RepoXU8bQE9m7ssNwL4nnxBnZVejHCc6']);
      
      if (result && result.address) {
        window.location.href = `/install/?${result.address}`;
      } else {
        throw new Error('Failed to create repository');
      }
    } catch (error) {
      console.error('Repository creation failed:', error);
      throw error;
    }
  }

  // Utility methods for rendering
  renderMarkdown(content) {
    // This would use the marked library
    // Implementation depends on how marked is integrated
    return content; // Placeholder
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}