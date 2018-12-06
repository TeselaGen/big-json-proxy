/**
 * Big JSON Proxy
 * @param {string} jsonFilePath - Path to a JSON file
 * @param {object} opts - An object with options for example what working directory to use
 * @returns {Proxy} Proxy wrapped object that will use the compute index to randomly access parts of the JSON file
 */
function bigJSONProxy(jsonFilePath) {
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
}
