// FlattenJson asumes keys and paths in the json are of reasonable size (can be managed in memory).
// If the length of keys is too big the program will crash.


// var currentPath = ''



// function RecurseJson(readS, writeS) {
//     const startingPath = currentPath;
//     while (FindKey(readS)) {
//         valueType = FindType(readS);
//         if(valueType==1) {
//             fileW.write('"'+value+'"');
//             chars = value.length;
//         } else if(valueType==2) {
//             chars = CreateRandomJson(fileW, targetCharQuantity);
//         } else {
//             chars = CreateRandomArray(fileW, targetCharQuantity);
//         }
//     }
// }

// exports.FlattenJson = function (readStream, writeStream) {
    
// }


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
