const fs = require('fs');
const path = require('path');
const child = require('child_process');
const bjf = require('./bigJsonFlattener');

opts = {}
const thenCall = Symbol('then');


/**
 * Big JSON Proxy
 * @param {string} jsonFilePath - Path to a JSON file
 * @param {object} opts - An object with options for example what working directory to use
 * @returns {Promise} Promise of a Proxy wrapped object that emulates an object of the JSON in the file
 */
async function bigJSONProxy(jsonFilePath, opts={}) {
  // create working directory
  // generate flattened JSON and index file in working directory
  // read in index
  // create top level trap
  // return proxy
  //      inside proxy
  //          if tries to get a property
  //          lookup index and see if it exists
  //          if path exists return value from flattened file
  //          if not exists check to see if "path" matches the first part of any paths
  //          if it does match and it's an array return a new Proxy with traps for array functions like forEach, map, etc.
  //          if it matches and it's an object return a new instance of this Proxy
  //          if it doesn't match anything return undefined
  //
  const creator = new bigJSONProxyCreator(jsonFilePath, opts)
    //  Note that _ProcessJsonFile can take a long time for big files
  const proxy = await creator.CreateProxy();
  return proxy;
}

class bigJSONProxyCreator {

  constructor(jsonFilePath, opts={}) {
    this._workingDir = opts.workingDir || '';
    this._jsonFilePath = jsonFilePath;
    this._reuseFiles = opts.reuseFiles || false;
    this._filesCreated = false;
  }

  CreateProxySync() {
    this._CreateStreams();
    // Flattening a json can take long time for big files
    child.execFileSync('node', ['flattenerScript.js', this._jsonFilePath, this._workingDir]);

    const target = this._CreateTarget();
    const handler = this._CreateSyncHandler();
    const proxy = new Proxy(target, handler);
    return proxy;
  }

  _CreateSyncHandler() {
    const self = this;

    function FindValueSync(target, key) {
      var res;
      var std = child.execFileSync('node', ['findValueScript.js', target.flattenFilePath, target.indexFilePath, key]);
      var indexInfo = JSON.parse(std.toString());
      if(!indexInfo.type) res = undefined;
      else if(indexInfo.type && indexInfo.type!='value') res = self._CreateProxyChild(target, key, indexInfo);
      else res = indexInfo.value;
      return res;
    }

    this._handler = {
      get (target, key) {
        const isArray = target.type=='array';
        if(isArray && parseInt(key)+1) key = `[${key}]`;
  
        var res = undefined;
        if(typeof key!='string') res = target[key];
        else if(isArray && key=='forEach') {
          res = function(fn) {
            for(let i=0; i<target.elements; i++) {
              fn(self._handler.get(target, i), i, target);
            }
          }
        }
        else if(isArray && key=='map') {
          res = function(fn) {
            var arr = new Array(target.elements);
            for(let i=0; i<target.elements; i++) {
              arr[i] = fn(self._handler.get(target, i), i, target);
            }
            return arr;
          }
        }
        else {
          // if proxy is type array and the key doesn't start with a number between brackets do not even bother searching
          if(isArray && !/^\[\d+\]/.test(key.toString())) res = undefined;
          else res = FindValueSync(target, target.keyPrefix + key);          
        }
        return res;
      },

      set () {
        return false;
      }
    }
    return this._handler;
  }


  async CreateProxy() {
    this._CreateStreams();
    // _ProcessJsonFile can take a long time for big files
    await this._ProcessJsonFile();

    const target = this._CreateTarget();
    const handler = this._CreateHandler();
    const proxy = new Proxy(target, handler);
    return proxy;
  }

  async _ProcessJsonFile () {
    if(!this._filesCreated) {
      const startTime = Date.now();
      console.log('Creating index files for json');
      await bjf.FlattenJson(this._readStream, this._writeFlattenStream, this._writeIndexStream);
      const millis = Date.now() - startTime;
      console.log('FINISHED creating index files in ' + millis/1000);
    }
  }

  _CreateProxyChild(target, key, indexInfo) {
    const newTarget = Object.assign({}, target);
    newTarget.type = indexInfo.type;
    newTarget[thenCall] = -1;
    if(indexInfo.type=='json') newTarget.keyPrefix = key + '.';
    else if(indexInfo.type=='array') {
      newTarget.keyPrefix = key;
      newTarget.elements = indexInfo.elements
    }
    return new Proxy(newTarget, this._handler);
  }

  _CreateHandler () {
  
    const self = this;
  
    async function ValuePromise(target, key) {
      var value;
      var res = await bjf.FindIndexedValue(target.flattenFilePath, target.indexFilePath, key);
      if(res.type && res.type!='value') value = self._CreateProxyChild(target, key, res);
      else value = res.value;
      return value
    }
  
    this._handler = {
      get (target, key) {
        const isArray = target.type=='array';
        if(isArray && parseInt(key)+1) key = `[${key}]`;
  
        var res = undefined;
        // beause of promise resolution, 'then' key is asked for two times when awaiting answer
        if(key=='then' && target[thenCall]<1) target[thenCall]++;
        else if(typeof key!='string') return target[key];
        else if(isArray && key=='forEach') {
          res = async function(fn) {
            for(let i=0; i<target.elements; i++) {
              fn(await self._handler.get(target, i), i, target);
            }
          }
        }
        else if(isArray && key=='map') {
          res = async function(fn) {
            const arr = new Array(target.elements);
            for(let i=0; i<target.elements; i++) {
              arr[i] = fn(await self._handler.get(target, i), i, target);
            }
            return arr;
          }
        }
        else {
          // if proxy is type array and the key doesn't start with a number between brackets do not even bother searching
          if(isArray && !/^\[\d+\]/.test(key.toString())) res = undefined;
          else res = ValuePromise(target, target.keyPrefix + key);          
        }
        return res
      },

      set () {
        return false;
      }
    }
    return this._handler;
  }
  
  _CreateTarget () {
    this._target = {
      'flattenFilePath': this._flattenFilePath,
      'indexFilePath': this._indexFilePath,
      keyPrefix: '',
      type: 'json',
      [thenCall]: -1,
    };
    return this._target;
  }
  
  _CreateStreams () {
    const basename = path.basename(this._jsonFilePath);
    this._flattenFilePath = this._workingDir + 'flatten.' + basename;
    this._indexFilePath = this._workingDir + 'flatten.index.' + basename;
    if(this._reuseFiles && fs.existsSync(this._flattenFilePath) && fs.existsSync(this._indexFilePath)) this._filesCreated = true;
    else {
      this._readStream = fs.createReadStream(this._jsonFilePath);
      this._writeFlattenStream = fs.createWriteStream(this._flattenFilePath);
      this._writeIndexStream = fs.createWriteStream(this._indexFilePath);
    }
  }
}

// module.exports = bigJSONProxyCreator;

exports.bigJSONProxy = function (jsonfile) { return (new bigJSONProxyCreator(jsonfile)).CreateProxy() };
exports.bigJSONProxySync = function (jsonfile) { return (new bigJSONProxyCreator(jsonfile)).CreateProxySync() };
