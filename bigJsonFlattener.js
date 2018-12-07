// FlattenJson receives a json in a read stream (stream.Readable) and outputs the flattened data in the provided write stream (stream.Writable)
// Flattening a json is explained by the following example. For the following json: {"a": {"b": [{d: 123}], "e": "p"}, "c": false} the flattened data would be:
// a.b[0].d = 123
// a.e = "p"
// c = false

// FlattenJson asumes (flattened paths, value) pairs in the json are of reasonable size (can be managed in memory).
// If the size of individual values is too big the program will crash.

const bfj = require('bfj');

var currentPath = [];

function UpdatePathAfterValue() {
    const len = currentPath.length;
    if (len>0) {
        if (isNaN(currentPath[len-1])) currentPath.pop();
        else currentPath[len-1] += 1;
    }
}

function CurrentPath() {
    var path = '';
    currentPath.forEach((v) => {
        if (isNaN(v)) path += '.' + v;
        else path += '[' + v + ']';
    })
    return path.substring(1);
}

exports.FlattenJson = function (readStream, writeStream) {
    const emitter = bfj.walk(readStream);

    emitter.on(bfj.events.array, () => { 
        currentPath.push(0);
     });
    emitter.on(bfj.events.object, () => {     });
    emitter.on(bfj.events.property, name => { 
        currentPath.push(name);
     });
    emitter.on(bfj.events.string, value => {
        writeStream.write(CurrentPath() + ' = "' + value + '"\n');
        UpdatePathAfterValue();
     });
    emitter.on(bfj.events.number, value => { 
        writeStream.write(CurrentPath() + ' = ' + value + '\n');
        UpdatePathAfterValue();
     });
    emitter.on(bfj.events.literal, value => { 
        writeStream.write(CurrentPath() + ' = ' + value + '\n');
        UpdatePathAfterValue();
     });
    emitter.on(bfj.events.endArray, () => { 
        currentPath.pop();
     });
    emitter.on(bfj.events.endObject, () => { 
        UpdatePathAfterValue();
     });
    emitter.on(bfj.events.error, error => { 
        console.log("error parsing json: " + error.toString());
     });
    emitter.on(bfj.events.dataError, error => { 
        console.log("invalid json: " + error.toString());
     });
    emitter.on(bfj.events.end, () => { /* ... */ });
}
