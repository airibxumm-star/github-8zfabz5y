/**
 * Modernized Git implementation with better error handling and async patterns
 */

export class Git {
  constructor(root, zeroPage) {
    this.root = root;
    this.zeroPage = zeroPage;
    this.packedIndex = [];
    this.objectCache = new Map();
  }

  async init() {
    try {
      const objects = await this.findPackedObjects();
      for (const object of objects) {
        await this.loadPackedIndex(object.index);
      }
    } catch (error) {
      console.warn('Failed to load packed objects:', error);
      // Continue without packed objects
    }
  }

  // Utility methods
  unpackInt32(buffer) {
    return (buffer[0] << 24) + (buffer[1] << 16) + (buffer[2] << 8) + buffer[3];
  }

  unpackSha(buffer) {
    return Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  packSha(shaString) {
    const result = [];
    for (let i = 0; i < shaString.length; i += 2) {
      result.push(parseInt(shaString.substr(i, 2), 16));
    }
    return result;
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
      // Fallback for older browsers
      return decodeURIComponent(escape(this.arrayToString(bytes)));
    }
  }

  encodeUTF8(str) {
    try {
      return Array.from(new TextEncoder().encode(str));
    } catch (error) {
      // Fallback for older browsers
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

  async readObject(id) {
    // Check cache first
    if (this.objectCache.has(id)) {
      return this.objectCache.get(id);
    }

    let object;
    try {
      if (this.packedIndex.some(packed => packed.id === id)) {
        object = await this.readPackedObject(id);
      } else {
        object = await this.readUnpackedObject(id);
      }
      
      // Cache the object
      this.objectCache.set(id, object);
      return object;
    } catch (error) {
      throw new Error(`Failed to read object ${id}: ${error.message}`);
    }
  }

  async readUnpackedObject(id) {
    const objectPath = `objects/${id.substr(0, 2)}/${id.substr(2)}`;
    const compressed = await this.readFile(objectPath);
    const decompressed = this.inflate(compressed);
    
    const spaceIndex = decompressed.indexOf(32); // space
    const nullIndex = decompressed.indexOf(0);
    
    const type = this.arrayToString(decompressed.slice(0, spaceIndex));
    const content = decompressed.slice(nullIndex + 1);
    
    return { type, content, id };
  }

  async writeObject(type, content) {
    const header = this.stringToArray(`${type} ${content.length}`);
    const data = [...header, 0, ...content];
    const id = this.sha(data);
    
    const compressed = this.deflate(data);
    const objectPath = `objects/${id.substr(0, 2)}/${id.substr(2)}`;
    
    await this.writeFile(objectPath, compressed);
    return id;
  }

  async readUnknownObject(id) {
    const object = await this.readObject(id);
    
    switch (object.type) {
      case 'blob':
        object.content = this.parseBlob(object);
        break;
      case 'tree':
        object.content = this.parseTree(object);
        break;
      case 'commit':
        object.content = this.parseCommit(object);
        break;
      case 'tag':
        object.content = this.parseTag(object);
        break;
    }
    
    return object;
  }

  parseBlob(object) {
    return object.content;
  }

  parseTree(object) {
    const items = [];
    let pos = 0;
    
    while (pos < object.content.length) {
      const spacePos = object.content.indexOf(32, pos); // space
      const mode = this.arrayToString(object.content.slice(pos, spacePos));
      pos = spacePos + 1;
      
      const nullPos = object.content.indexOf(0, pos);
      const name = this.decodeUTF8(object.content.slice(pos, nullPos));
      pos = nullPos + 1;
      
      const objectId = this.unpackSha(object.content.slice(pos, pos + 20));
      pos += 20;
      
      const type = mode.startsWith('100') ? 'blob' : 
                   mode.startsWith('160') ? 'submodule' : 'tree';
      
      items.push({ type, name, id: objectId });
    }
    
    return items;
  }

  parseCommit(object) {
    const lines = this.arrayToString(object.content).split('\n');
    const commit = {
      tree: '',
      parents: [],
      author: '',
      committer: '',
      message: ''
    };
    
    let messageStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '') {
        messageStart = i + 1;
        break;
      }
      
      const [key, ...valueParts] = line.split(' ');
      const value = valueParts.join(' ');
      
      switch (key) {
        case 'tree':
          commit.tree = value;
          break;
        case 'parent':
          commit.parents.push(value);
          break;
        case 'author':
          commit.author = this.decodeUTF8(value);
          break;
        case 'committer':
          commit.committer = this.decodeUTF8(value);
          break;
      }
    }
    
    commit.message = this.decodeUTF8(lines.slice(messageStart).join('\n'));
    return commit;
  }

  parseTag(object) {
    const lines = this.arrayToString(object.content).split('\n');
    const tag = {
      target: '',
      type: '',
      tag: '',
      tagger: '',
      message: ''
    };
    
    let messageStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '') {
        messageStart = i + 1;
        break;
      }
      
      const [key, ...valueParts] = line.split(' ');
      const value = valueParts.join(' ');
      
      switch (key) {
        case 'object':
          tag.target = value;
          break;
        case 'type':
          tag.type = value;
          break;
        case 'tag':
          tag.tag = value;
          break;
        case 'tagger':
          tag.tagger = this.decodeUTF8(value);
          break;
      }
    }
    
    tag.message = this.decodeUTF8(lines.slice(messageStart).join('\n'));
    return tag;
  }

  async readTreeItem(tree, path) {
    if (typeof path === 'string') {
      path = path.split('/').filter(part => part.length > 0);
    }
    
    if (path.length === 0) {
      return this.readUnknownObject(tree);
    }
    
    const treeObject = await this.readUnknownObject(tree);
    if (treeObject.type !== 'tree') {
      throw new Error(`${tree} is not a tree`);
    }
    
    const file = treeObject.content.find(item => item.name === path[0]);
    if (!file) {
      throw new Error(`Tree ${tree} has no object named ${path[0]}`);
    }
    
    return this.readTreeItem(file.id, path.slice(1));
  }

  // Compression utilities (would use pako library)
  inflate(data) {
    // Implementation would use pako.inflate
    return data; // Placeholder
  }

  deflate(data) {
    // Implementation would use pako.deflate
    return data; // Placeholder
  }

  sha(data) {
    // Implementation would use crypto-js or similar
    // For now, return a placeholder
    return 'placeholder_sha';
  }

  // Ref management
  async getRef(ref) {
    try {
      const content = await this.readFile(ref);
      const refContent = this.arrayToString(content).trim();
      
      if (refContent.startsWith('ref:')) {
        return this.getRef(refContent.substr(4).trim());
      }
      
      return refContent;
    } catch (error) {
      throw new Error(`Unknown ref: ${ref}`);
    }
  }

  async setRef(ref, commit) {
    return this.writeFile(ref, this.stringToArray(commit));
  }

  async getBranchCommit(branch) {
    if (this.isSha(branch)) {
      return branch;
    }
    
    if (branch === '') {
      const head = await this.getHead();
      return this.getBranchCommit(head);
    }
    
    try {
      return await this.getRef(`refs/heads/${branch}`);
    } catch (error) {
      try {
        return await this.getRef(`refs/tags/${branch}`);
      } catch (tagError) {
        throw new Error(`Could not find branch: ${branch}`);
      }
    }
  }

  async readBranchCommit(branch) {
    const commit = await this.getBranchCommit(branch);
    return this.readUnknownObject(commit);
  }

  async getHead() {
    try {
      const head = await this.readFile('HEAD');
      return this.arrayToString(head).replace(/^ref:\s*refs\/heads\//, '').trim();
    } catch (error) {
      throw new Error('No HEAD ref found');
    }
  }

  async getRefList() {
    const refs = [];
    
    try {
      const refsDir = await this.zeroPage.listDirectory(`${this.root}/refs`);
      refs.push(...refsDir.map(ref => `refs/${ref}`));
    } catch (error) {
      // No refs directory
    }
    
    try {
      const packedRefs = await this.readFile('packed-refs');
      const lines = this.arrayToString(packedRefs).split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [, ref] = line.split(' ');
          if (ref && !refs.includes(ref)) {
            refs.push(ref);
          }
        }
      }
    } catch (error) {
      // No packed-refs file
    }
    
    return refs;
  }

  // Placeholder methods for packed objects
  async findPackedObjects() {
    return [];
  }

  async loadPackedIndex(path) {
    // Implementation for loading pack index files
  }

  async readPackedObject(id) {
    // Implementation for reading packed objects
    throw new Error('Packed objects not implemented');
  }

  // Object writing methods
  async writeBlob(content) {
    return this.writeObject('blob', content);
  }

  async writeTree(items) {
    const sortedItems = items.sort((a, b) => {
      const aName = a.type === 'tree' ? `${a.name}/` : a.name;
      const bName = b.type === 'tree' ? `${b.name}/` : b.name;
      return aName.localeCompare(bName);
    });

    const content = [];
    for (const item of sortedItems) {
      const mode = item.type === 'tree' ? '040000' : '100644';
      const entry = [
        ...this.encodeUTF8(`${mode} ${item.name}`),
        0,
        ...this.packSha(item.id)
      ];
      content.push(...entry);
    }
    
    return this.writeObject('tree', content);
  }

  async writeCommit(commit) {
    const treeId = await this.writeTreeRecursive(commit.tree);
    
    let content = `tree ${treeId}\n`;
    for (const parent of commit.parents) {
      content += `parent ${parent}\n`;
    }
    content += `author ${commit.author}\n`;
    content += `committer ${commit.committer}\n\n`;
    content += commit.message;
    
    return this.writeObject('commit', this.encodeUTF8(content));
  }

  async writeTreeRecursive(items) {
    const processedItems = [];
    
    for (const item of items) {
      if (item.type === 'tree' && !item.id) {
        const treeId = await this.writeTreeRecursive(item.content);
        processedItems.push({
          type: 'tree',
          name: item.name,
          id: treeId
        });
      } else if (item.type === 'blob' && !item.id) {
        const blobId = await this.writeBlob(item.content);
        processedItems.push({
          type: 'blob',
          name: item.name,
          id: blobId
        });
      } else {
        processedItems.push(item);
      }
    }
    
    return this.writeTree(processedItems);
  }

  // Static initialization method
  static async init(root, zeroPage, name, email) {
    const git = new Git(root, zeroPage);
    
    // Initialize repository structure
    await git.writeFile('HEAD', git.stringToArray('ref: refs/heads/master'));
    await git.writeFile('description', git.stringToArray('Git Center repository'));
    
    const config = [
      '[core]',
      '\trepositoryformatversion = 0',
      '\tfilemode = false',
      '\tbare = true',
      '\tsymlinks = false',
      '\tignorecase = true',
      '[receive]',
      '\tadvertisePushOptions = true',
      '\tdenyDeleteCurrent = warn'
    ].join('\n');
    
    await git.writeFile('config', git.stringToArray(config));
    
    // Create initial commit
    const date = new Date();
    const tz = git.getTimezoneOffset();
    const author = `${name} <${email}> ${Math.floor(date.getTime() / 1000)} ${tz}`;
    
    const commitId = await git.writeCommit({
      tree: [],
      parents: [],
      author,
      committer: author,
      message: 'Initial commit'
    });
    
    await git.setRef('refs/heads/master', commitId);
    return git;
  }

  getTimezoneOffset() {
    const offset = new Date().getTimezoneOffset() * -1;
    const hours = Math.floor(Math.abs(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset >= 0 ? '+' : '-';
    
    return `${sign}${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
  }
}