const fs = require("fs");
const jsoncreator = require("./randomJsonCreator");

// const randomSequence = [0.1, 0, 0, 0.5, 0.9, 0.9, 0.9];

describe("Big Json Proxy test", () => {
    const filepath = 'testJson.txt';
    const jsonFile = fs.createWriteStream(filepath);
    describe("Generate Random Json File", () => {
        it("Will create a file with a random json.", () => {
            jsoncreator.WriteRandomJson(jsonFile);
            jsonFile.end(() => {
                const stats = fs.statSync(filepath);
                expect(stats.size).toBeGreaterThanOrEqual(jsoncreator.params.minTotalChars);
            });            
        })
    })
});
