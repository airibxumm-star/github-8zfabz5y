/**
 * Modernized Mercurial implementation
 */

export class Hg {
  constructor(root, zeroPage) {
    this.root = root;
    this.zeroPage = zeroPage;
    this.indexCache = new Map();
    this.hgFileName = new HgFileName();
  }

  async init() {
    // Initialize Mercurial-specific structures
  }

  // Utility methods similar to Git but adapted for Mercurial
  unpackInt32(buffer) {
    return (buffer[0] << 24) + (buffer[1] << 16) + (buffer[2] << 8) + buffer[3];
  }

  unpackSha(buffer) {
    return Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  arrayToString(array) {
    if (typeof array === 'string') return array;
    return Array.from(array).map(byte => String.fromCharCode(byte)).join('');
  }

  stringToArray(string) {
    return string.split('').map(char => char.charCodeAt(0));
  }

  isSha(str) {
    return /^[a-f0-9]{40}$/.test(str);
  }

  decodeUTF8(bytes) {
    try {
      return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (error) {
      return decodeURIComponent(escape(this.arrayToString(bytes)));
    }
  }

  encodeUTF8(str) {
    try {
      return Array.from(new TextEncoder().encode(str));
    } catch (error) {
      return this.stringToArray(unescape(encodeURIComponent(str)));
    }
  }

  async readFile(path) {
    try {
      const content = await this.zeroPage.readFile(`${this.root}/${path}`);
      return new Uint8Array(content.split('').map(char => char.charCodeAt(0)));
    } catch (error) {
      throw new Error(`Failed to read file: ${path}`);
    }
  }

  async writeFile(path, content) {
    const contentString = Array.from(content).map(byte => String.fromCharCode(byte)).join('');
    return this.zeroPage.writeFile(`${this.root}/${path}`, contentString);
  }

  // Mercurial-specific methods
  async getBranchList() {
    const branches = [];
    
    try {
      const visibleBranches = await this.loadBranchList('cache/branch2-visible', true);
      branches.push(...visibleBranches);
    } catch (error) {
      // Continue without visible branches
    }
    
    return branches
      .filter((branch, index, arr) => 
        arr.findIndex(b => b.name === branch.name && b.id === branch.id) === index
      )
      .map(branch => branch.name)
      .sort();
  }

  async loadBranchList(file, shift) {
    try {
      const content = await this.readFile(file);
      let lines = this.arrayToString(content).split('\n');
      
      if (shift) {
        lines.shift();
      }
      
      return lines
        .map(line => {
          const parts = line.split(' ');
          return {
            name: parts[2] || parts[1],
            id: parts[0]
          };
        })
        .filter(branch => branch.name);
    } catch (error) {
      return [];
    }
  }

  async getHead() {
    return 'default';
  }

  async getBranchCommit(branch) {
    if (branch === '') {
      const head = await this.getHead();
      return this.getBranchCommit(head);
    }
    
    if (this.isSha(branch)) {
      return branch;
    }
    
    // Implementation for finding branch commit in Mercurial
    return branch; // Placeholder
  }

  async readBranchCommit(branch) {
    const commit = await this.getBranchCommit(branch);
    return this.readCommit(commit);
  }

  async readCommit(sha) {
    // Implementation for reading Mercurial commits
    return {
      type: 'commit',
      content: {
        tree: 'placeholder',
        author: 'Unknown',
        committer: 'Unknown',
        message: 'Placeholder commit',
        parents: []
      },
      id: sha
    };
  }

  // Static initialization method
  static async init(root, zeroPage, name, email) {
    const hg = new Hg(root, zeroPage);
    
    // Initialize Mercurial repository
    await hg.writeFile('00changelog.i', hg.stringToArray('\x00\x00\x00\x02dummy'));
    await hg.writeFile('requires', hg.stringToArray('dotencode\nfncache\ngeneraldelta\nrevlogv1\nstore\n'));
    
    return hg;
  }
}

class HgFileName {
  constructor() {
    // Initialize encoding/decoding maps for Mercurial filenames
    this.initializeMaps();
  }

  initializeMaps() {
    this.cmap = {};
    this.dmap = {};
    
    // Build character mapping for filename encoding
    for (let i = 0; i < 256; i++) {
      if (i < 32 || i >= 126) {
        const hex = i.toString(16).padStart(2, '0');
        this.cmap[i] = `~${hex}`;
      } else {
        this.cmap[i] = String.fromCharCode(i);
      }
    }
    
    // Special character mappings
    const specialChars = '\\:*?"<>|';
    for (const char of specialChars) {
      const code = char.charCodeAt(0);
      const hex = code.toString(16).padStart(2, '0');
      this.cmap[code] = `~${hex}`;
    }
    
    // Uppercase mappings
    for (let i = 65; i <= 90; i++) { // A-Z
      this.cmap[i] = `_${String.fromCharCode(i).toLowerCase()}`;
    }
    
    this.cmap[95] = '__'; // underscore
    
    // Build reverse mapping
    for (const [key, value] of Object.entries(this.cmap)) {
      this.dmap[value] = parseInt(key);
    }
  }

  encode(name) {
    return Array.from(name)
      .map(char => this.cmap[char.charCodeAt(0)] || char)
      .join('')
      .replace(/\.hg\//, '.hg.hg/')
      .replace(/\.i\//, '.i.hg/')
      .replace(/\.d\//, '.d.hg/');
  }

  decode(name) {
    let result = '';
    let pos = 0;
    
    while (pos < name.length) {
      let found = false;
      for (let len = 1; len <= 3; len++) {
        const substr = name.substr(pos, len);
        if (this.dmap[substr] !== undefined) {
          result += String.fromCharCode(this.dmap[substr]);
          pos += len;
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Invalid filename: ${name}`);
      }
    }
    
    return result;
  }
}