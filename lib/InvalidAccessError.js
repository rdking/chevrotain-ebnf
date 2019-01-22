module.export = class InvalidAccessError extends Error {
    constructor(cName, fnName, isPrivate) {
        super(`Invalid context object for ${cName? cName :'<anonymous>'}.${(isPrivate) ? "[[private]]" : "prototype" }.${fnName}`);
    }
};
