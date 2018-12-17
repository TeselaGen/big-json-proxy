const fs = require('fs');
const path = require('path');
const bjf = require('./bigJsonFlattener');

opts = {}
const thenCall = Symbol('then');

/**
 * Big JSON Proxy
 * @param {string} jsonFilePath - Path to a JSON file
 * @param {object} opts - An object with options for example what working directory to use
 * @returns {Promise} Promise of a Proxy wrapped object that emulates an object of the JSON in the file
 */
function bigJSONProxy(jsonFilePath, opts={}) {
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
  this._workingDir = opts.workingDir || '';
  this._jsonFilePath = jsonFilePath;
  this._reuseFiles = opts.reuseFiles || false;
  this._filesCreated = false;

  const self = this;
  return new Promise(resolve => {
    self._CreateStreams();
    //  Note that _ProcessJsonFile can take a long time for big files
    self._ProcessJsonFile(() => {
      self._CreateTarget();
      self._CreateHandler();
      const proxy = new Proxy(self._target, self._handler);
      resolve(proxy)
    });
  });
}

bigJSONProxy.prototype._ProcessJsonFile = function (callback) {
  const self = this;
  if(!this._filesCreated) {
    const startTime = Date.now();
    console.log('Creating index files for json');
    bjf.FlattenJson(this._readStream, this._writeFlattenStream, this._writeIndexStream, () => {
      self._writeFlattenStream.end(()=> {
        self._writeIndexStream.end(() => {
          self._filesCreated = true
          const millis = Date.now() - startTime;
          console.log('FINISHED creating index files in ' + millis/1000);
          callback();
        });
      });
    });
  }
  else {
    callback();
  }
}

bigJSONProxy.prototype._CreateHandler = function () {

  const self = this;

  function ProxyIfKeyIsPrefix(target, key, indexInfo) {
    const newTarget = Object.assign({}, target);
    newTarget.type = indexInfo.type;
    newTarget[thenCall] = -1;
    if(indexInfo.type=='json') newTarget.keyPrefix = key + '.';
    else if(indexInfo.type=='array') {
      newTarget.keyPrefix = key;
      newTarget.elements = indexInfo.elements
    }
    return new Proxy(newTarget, self._handler);
  }

  function ValuePromise(target, key) {
    return new Promise(resolve => { 
      bjf.FindIndexedValue(target.flattenFilePath, target.indexFilePath, key, (res) => {
        if(res.type && res.type!='value') resolve(ProxyIfKeyIsPrefix(target, key, res));
        else resolve(res.value);
      });
    });
  }

  this._handler = {
    get (target, key) {
      const isArray = target.type=='array';
      if(isArray && parseInt(key)+1) key = `[${key}]`;

      var res = undefined;
      // beause of promise resolution, 'then' key is called two times when awaiting answer
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
          result = new Array(target.elements);
          for(let i=0; i<target.elements; i++) {
            result[i] = fn(await self._handler.get(target, i), i, target);
          }
          return result;
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
}

bigJSONProxy.prototype._CreateTarget = function () {
  this._target = {
    'flattenFilePath': this._flattenFilePath,
    'indexFilePath': this._indexFilePath,
    keyPrefix: '',
    type: 'json',
    [thenCall]: -1,
  };
}

bigJSONProxy.prototype._CreateStreams = function () {
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

module.exports = bigJSONProxy;
