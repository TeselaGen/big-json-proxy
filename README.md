## big-json-proxy
This package uses JavaScript Proxies and file seeking to provide access to large JSON files

# random json creator
To create a random JSON create a WriteStream and call randomJsonCreator.WriteRandomJson(writeStream).
The JSON will be written in the supplied WriteStream.

Parameters to control the json creation, like json minimum size, value lengths, value types chances, etc
can be supplied with the optional options parameter.
Check randomJsonCreator.params to see which parameters are available.

# json flattener
