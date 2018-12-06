const objToProxy = {
  message: "Hello!",
  sayMessage: msg => {
    console.log(msg);
  }
};

const trap = {
  get: getTrapRouter
  // set: setTrapRouter
};

const proxiedObj = new Proxy(objToProxy, trap);

console.log(`Current message: ${proxiedObj.message}`);

console.log(`sayMessage():`);
proxiedObj.sayMessage();

console.log(`sayMessage("Goodbye")`);
proxiedObj.sayMessage("Goodbye");

proxiedObj.message = "Hello World!";
console.log(`message="Hello world!" : ${proxiedObj.message}`);

console.log(`sayMessage():`);
proxiedObj.sayMessage();

console.log(`sayMessage("Goodbye")`);
proxiedObj.sayMessage("Goodbye");

function getTrapRouter(target, key) {
  let propOrMethod = target[key];
  if (typeof propOrMethod !== "undefined") {
    if (typeof propOrMethod === "function") {
      if (key === "sayMessage") {
        handleMethdAccess(target, key);
        return injectDefaultMessage(target, key);
      }
      return handleMethdAccess(target, key);
    } else {
      return handlePropAccess(target, key);
    }
  }
}

function handlePropAccess(target, key) {
  console.log(`[PROP-ACCESS] ${key}`);
  return target[key];
}

function handleMethdAccess(target, key) {
  console.log(`[METHOD-ACCESS] ${key}`);
  return target[key];
}

function injectDefaultMessage(target, key) {
  return inputMsg => {
    // console.log(`inputMsg: ${inputMsg}`);
    // console.log(`target.message: ${target.message}`);
    let msg = inputMsg || target.message;
    // console.log(`msg: ${msg}`);
    return target[key].apply(this, [msg]);
  };
}

// function validateMsg() {}
