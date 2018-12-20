const { FlattenJson } = require('./bigJsonFlattener');
const fs = require('fs');
const path = require('path')

const out = process.stdout

async function Flatten() {
    jsonFile = process.argv[2];
    workDir = process.argv[3];
    const basename = path.basename(jsonFile);
    flattenFile = workDir + 'flatten.' + basename;
    indexFile = workDir + 'flatten.index.' + basename;
    await FlattenJson(fs.createReadStream(jsonFile), fs.createWriteStream(flattenFile), fs.createWriteStream(indexFile));
    out.write('Done.');
}

Flatten();
