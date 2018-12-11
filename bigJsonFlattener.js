// FlattenJson receives a json in a read stream (stream.Readable) and outputs the flattened data in the provided write stream (stream.Writable).
// It also writes an index pointing the starting position and the length of the value in the flattened json file 
// Flattening a json is explained by the following example. For the following json: {"a": {"b": [{d: 123}], "e": "p"}, "c": false} the flattened data would be:
// a.b[0].d = 123
// a.e = "p"
// c = false

// FlattenJson asumes (flattened paths, value) pairs in the json are of reasonable size (can be managed in memory).
// If the size of individual values is too big the program will crash.

const bfj = require('bfj');
const LineByLineReader = require('line-by-line');



function _WrapWriteStream(writeStream) {
    var clone = {written: 0};
    Object.assign(clone, writeStream);
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

exports.FlattenJson = function (readStream, writeStreamFlatten, writeStreamIndex, callback=()=>{}) {
    const writeStream = _WrapWriteStream(writeStreamFlatten);
    const emitter = bfj.walk(readStream);
    var pathArray = [];

    function WriteOnStreams(value, quote) {
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
        WriteOnStreams(value, '"');
     });
    emitter.on(bfj.events.number, value => { 
        WriteOnStreams(value, '');
     });
    emitter.on(bfj.events.literal, value => { 
        WriteOnStreams(JSON.stringify(value), '');
     });
    emitter.on(bfj.events.endArray, () => {
        pathArray.pop();
        UpdatePathAfterValue(pathArray);
     });
    emitter.on(bfj.events.endObject, () => {
        UpdatePathAfterValue(pathArray);
     });
    emitter.on(bfj.events.error, error => { 
        console.log("error parsing json: " + error.toString());
     });
    emitter.on(bfj.events.dataError, error => { 
        console.log("invalid json: " + error.toString());
     });
    emitter.on(bfj.events.end, () => {
        callback();
    });

}

exports.FindIndexedValue = function(flattenJsonFile, indexFile, flattenKey, callback) {
    
    flattenKey = flattenKey.startsWith('"') ? flattenKey : '"' + flattenKey + '"';

    function GetChunkOfFile(index) {
        file = fs.openSync(flattenJsonFile, 'r');
        buffer = Buffer.from(new Array(index.length))
        fs.read(file, buffer, 0, index.length, index.position, () => {
            callback(buffer.toString());
        });
    }

    function SearchPathInIndex() {
        const lr = new LineByLineReader(indexFile);
        var index = {};
        console.log('Searching flattened key path in index: ' + indexFile);
        lr.on('error', function (err) {
            console.log('Error processing the index file: ' + err.toString());
        });
        lr.on('line', function (line) {
            console.log(line);
            if (line.startsWith(flattenKey)) {
                var splitted = line.split('=');
                splitted = splitted[1].split(',');
                index = {
                    position: parseInt(splitted[0]),
                    length: parseInt(splitted[1])
                }
                lr.close();
            }
        });
        lr.on('end', () => {
            if ('position' in index) GetChunkOfFile(index);
            else callback(false);
        });
    }

    SearchPathInIndex();
}
