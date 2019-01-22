let InvalidAccessError = require("./InvalidAccessError.js");

/**
 * @typedef {Object} HelperResponse
 * 
 * @property {function} makePrivates - Creates a new private data store and
 * associates it with the given instance object.
 * @property {function} getPrivate - Returns the private data store given an
 * instance object.
 */

/**
 * @typedef {Object} HelperArg
 * 
 * @property {function} classDef - The constructor of the class.
 * @property {function} privateData - A function to generate a new copy of the 
 * private data for the class.
 * @property {Array} [protList] - a list of private members that are shared with
 * descendant classes.
 */

/* Creates a pair of accessor functions and a private data store for a class.
 * @param {HelperArg} - parameters to set up the helper methods
 * @returns {HelperResponse}
 */
module.exports = function createClassHelpers({classDef, privateData, protList}) {
    let PROTECTED = Symbol("Protected");
    let className = classDef.name;
    let pvt = new WeakMap();
    return {
        /**
         * Creates a new private data store and associates it with the given
         * instance object.
         * @param {object} context - The instance object that will own the
         * private data store.
         * @param {function} newTarget - The actual newTarget value from the
         * calling constructor.
         */
        makePrivates: function makePrivates(context, newTarget) {
            let handler = {
                get(target, prop, receiver) {
                    let retval = Reflect.get(target, prop, receiver);
                    if (typeof(retval) == "function") {
                        let fn = retval;
                        retval = new Proxy(fn, handler);
                        pvt.set(retval, fn);
                    }
                    return retval;
                },
                apply(target, context, args) {
                    let ctx = pvt.get(context) || context;
                    return Reflect.apply(target, ctx, args);
                }
            };

            let pd = privateData();
            let retval = new Proxy(pd, handler);

            pvt.set(retval, context);
            pvt.set(context, retval);

            let protData = {};
            if (Array.isArray(protList) && protList.length) {
                for (let name of protList) {
                    Object.defineProperty(protData, name, {
                        get() { return retval[name]; },
                        set(v) {
                            'use strict';
                            retval[name] = v;
                        }
                    });
                }
                Object.seal(protData);
            }

            Object.setPrototypeOf(pd, context[PROTECTED] || Object.prototype);

            if (newTarget.protoype instanceof classDef) {
                if (context[PROTECTED]) {
                    Object.setPrototypeOf(protData, context[PROTECTED] || Object.prototype);
                }
                context[PROTECTED] = protData;
            }
            else if (classDef === newTarget) {
                delete context[PROTECTED];
            }

            /* The private data may have been defined on top of accessor
             * properties. We need to fix this before returning.
             */
            let pdProps = Object.getOwnPropertyDescriptors(pd);
            for (let key in pdProps) {
                /* Don't touch accessor properties. */
                if ("value" in pdProps[key]) {
                    let data = pd[key];
                    delete pd[key];
                    pd[key] = data;
                }
            }

            Object.seal(pd);
            return retval;
        },

        /**
         * Returns the private data store given an instance object.
         * @param {Object} context - The instance object who's data store is
         * being requested.
         * @param {string} fnName - The name of the function (for error messages)
         * @param {boolean} [isPrivate] - set true if the calling function is a
         * private member.
         * @returns {Object} The private data store
         * @throws {InvalidAccessError} - if there is no private store for the
         * given instance object.
         */
        getPrivate: function getPrivate(context, fnName, isPrivate) {
            if (!pvt.has(context)) {
                throw new InvalidAccessError(className, fnName, !!isPrivate);
            }
            return pvt.get(context);
        }
    };
}
