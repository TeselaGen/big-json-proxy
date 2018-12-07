fs = require('fs');
bjf = require('./bigJsonFlattener')
rjc = require('./randomJsonCreator')

const jsonfile = 'demo.json';
const output = 'flatJson.txt';

function flattenDemo() {
    jstream = fs.createWriteStream(jsonfile);
    rjc.WriteRandomJson(jstream, {valueLengthMin: 100, valueLengthMax: 100, keyPrefix: "KEY_"});
    jstream.end(() => {
        rs = fs.createReadStream(jsonfile);
        ws = fs.createWriteStream(output);
        bjf.FlattenJson(rs, ws);
    });
}

flattenDemo();
