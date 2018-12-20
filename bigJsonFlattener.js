// FlattenJson receives a json in a read stream (stream.Readable) and outputs the flattened data in the provided write stream (stream.Writable).
// It also writes an index pointing the starting position and the length of the value in the flattened json file 
// Flattening a json is explained by the following example. For the following json: {"a": {"b": [{d: 123}], "e": "p"}, "c": false} the flattened data would be:
// a.b[0].d = 123
// a.e = "p"
// c = false

// FlattenJson asumes (flattened paths, value) pairs in the json are of reasonable size (can be managed in memory).
// If the size of individual values is too big the program will run out of memory.

const bfj = require('bfj');
const fs = require('fs')
const lineReader = require('line-reader');
const Promise = require('bluebird')


function _WrapWriteStream(writeStream) {
    var clone = {};
    clone.written = 0;
    clone.write = function(chunk, encoding, callback) {
        clone.written += chunk.length;
        writeStream.write(chunk, encoding, callback);
    }
    return clone;
}

function UpdatePathAfterValue(pathArray) {
    const len = pathArray.length;
    if (len>0) {
        if (typeof(pathArray[len-1])=='string') pathArray.pop();
        else pathArray[len-1] += 1;
    }
}

function BuildPathString(pathArray) {
    var path = '';
    pathArray.forEach((v) => {
        if (typeof(v)=='string') path += '.' + v;
        else path += '[' + v + ']';
    });
    return '"' + path.substring(1) + '"';
}

exports.FlattenJson = function (readStream, writeStreamFlatten, writeStreamIndex) {
    const writeStream = _WrapWriteStream(writeStreamFlatten);
    const emitter = bfj.walk(readStream);
    var pathArray = [];

    function WriteOnStreams(value, quote) {
        value = JSON.stringify(value);
        const path = BuildPathString(pathArray);
        UpdatePathAfterValue(pathArray);
        const currentPosition = writeStream.written + path.length + 1;
        writeStream.write(path + '\t' + quote + value + quote + '\n');
        const absoluteValueLength = value.length + 2*quote.length;
        writeStreamIndex.write(path + '=' + currentPosition + ',' + absoluteValueLength +'\n');
    }

    emitter.on(bfj.events.array, () => { 
        pathArray.push(0);
     });
    emitter.on(bfj.events.object, () => {     });
    emitter.on(bfj.events.property, name => { 
        pathArray.push(name);
     });
    emitter.on(bfj.events.string, value => {
        WriteOnStreams(value, '');
     });
    emitter.on(bfj.events.number, value => { 
        WriteOnStreams(value, '');
     });
    emitter.on(bfj.events.literal, value => { 
        WriteOnStreams(value, '');
     });
    emitter.on(bfj.events.endArray, () => {
        pathArray.pop();
        UpdatePathAfterValue(pathArray);
     });
    emitter.on(bfj.events.endObject, () => {
        UpdatePathAfterValue(pathArray);
     });
    emitter.on(bfj.events.error, error => { 
        console.log(error.toString());
     });
    emitter.on(bfj.events.dataError, error => { 
        console.log("invalid json: " + error.toString());
     });
    return new Promise(resolve => {
        emitter.on(bfj.events.end, () => {
            writeStreamFlatten.end(() => {
                writeStreamIndex.end(() => {
                    resolve();
                });
            });
        });
    });
}

/**
 * Searches for the flattened key path in the flattenJsonFile using the provided index file. 
 * 
 * @param {string} flattenJsonFile - Path to a JSON file
 * @param {string} indexFile - An object with options for example what working directory to use
 */
exports.FindIndexedValue = async function(flattenJsonFile, indexFile, flattenKey, callback) {
    const index = {};
    var stop = false;
    flattenKey = flattenKey.startsWith('"') ? flattenKey : '"' + flattenKey;
    flattenKey = flattenKey.endsWith('"') ? flattenKey.slice(0, -1) : flattenKey;

    function GetChunkOfFile() {
        if(index.position>-1) {
            file = fs.openSync(flattenJsonFile, 'r');
            buffer = Buffer.from(new Array(index.length));
            fs.readSync(file, buffer, 0, index.length, index.position)
            index.value = buffer.toString();
            return index;
        }
    }

    // TODO: Current way of checking lines does account cases like keys containing their own dots or brackets
    // Need to fix these border cases. To do so, the index creation also requires a fix.
    async function ProcessMatchingLine(line) {
        var splitted = line.split('=');
        const key = splitted[0];
        if(!index.type && key.length>flattenKey.length+1) {
            if(key[flattenKey.length]=='.') {
                index.type = 'json';
                stop = true;
            }
            else if(key[flattenKey.length]=='[') {
                index.type = 'array'
            }
        }
        else if(index.type=='array') {
            lastBrackedPos = line.indexOf(']', flattenKey.length);
            index.elements = parseInt(line.substring(flattenKey.length+1, lastBrackedPos))+1;
        }
        else {
            splitted = splitted[1].split(',');
            index.position = parseInt(splitted[0]);
            index.length = parseInt(splitted[1]);
            index.type = 'value';
            stop = true;
        }
    }

    const eachLine = Promise.promisify(lineReader.eachLine);
    await eachLine(indexFile, function(line, lastLine) {
        if (line.startsWith(flattenKey)) {
            ProcessMatchingLine(line);
        }
        if (stop || lastLine) {
            GetChunkOfFile();
            return false;
        }
    });
    return index;
}
