/**
 * Enhanced ZeroPage with modern async/await patterns and better error handling
 */

export class ZeroPage {
  constructor(zeroFrame) {
    this.zeroFrame = zeroFrame;
    this.siteInfo = null;
    this.isReady = false;
  }

  async getSiteInfo() {
    if (!this.siteInfo) {
      this.siteInfo = await this.cmd('siteInfo');
    }
    return this.siteInfo;
  }

  async cmd(command, params = {}) {
    try {
      const result = await this.zeroFrame.cmd(command, params);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      console.error(`Command ${command} failed:`, error);
      throw error;
    }
  }

  async alert(message) {
    return this.cmd('wrapperNotification', ['info', message]);
  }

  async confirm(message) {
    return this.cmd('wrapperConfirm', [message]);
  }

  async prompt(message, defaultValue = '') {
    return this.cmd('wrapperPrompt', [message, defaultValue]);
  }

  error(error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('ZeroPage Error:', message);
    return this.cmd('wrapperNotification', ['error', message]);
  }

  async signContent(innerPath = 'content.json') {
    try {
      await this.cmd('siteSign', { inner_path: innerPath });
      await this.cmd('sitePublish', { inner_path: innerPath, sign: false });
      return true;
    } catch (error) {
      console.error('Failed to sign content:', error);
      throw error;
    }
  }

  async readFile(path) {
    try {
      return await this.cmd('fileGet', { inner_path: path });
    } catch (error) {
      console.error(`Failed to read file ${path}:`, error);
      throw error;
    }
  }

  async writeFile(path, content) {
    try {
      return await this.cmd('fileWrite', { 
        inner_path: path, 
        content_base64: btoa(unescape(encodeURIComponent(content)))
      });
    } catch (error) {
      console.error(`Failed to write file ${path}:`, error);
      throw error;
    }
  }

  async deleteFile(path) {
    try {
      return await this.cmd('fileDelete', { inner_path: path });
    } catch (error) {
      console.error(`Failed to delete file ${path}:`, error);
      throw error;
    }
  }

  async listDirectory(path = '') {
    try {
      const result = await this.cmd('dirList', { inner_path: path });
      return result || [];
    } catch (error) {
      console.error(`Failed to list directory ${path}:`, error);
      return [];
    }
  }

  async dbQuery(query, params = {}) {
    try {
      return await this.cmd('dbQuery', { query, params });
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  }

  // Utility methods
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) return 'just now';
    if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
    if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
    if (diff < week) return `${Math.floor(diff / day)} days ago`;
    if (diff < month) return `${Math.floor(diff / week)} weeks ago`;
    if (diff < year) return `${Math.floor(diff / month)} months ago`;
    return `${Math.floor(diff / year)} years ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}