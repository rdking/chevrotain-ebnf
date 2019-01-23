const createClassHelpers = require("./classHelpers");

module.exports = (function() {
	function pvtData() {
		return {
			types: null,
		};
	}

	class ASTVisitor {
		constructor(types) {
			let p = makePrivates(this, new.target);
			p.types = types;
		}

		validateVisitor() {
			let p = getPrivate(this, "visit", true);
			let keys = Object.keys(p.types);

			if (!keys.length) {
				throw new TypeError(`Invalid Visitor! No known node types.`);
			}

			let errors = "";

			for (let key of keys) {
				if (!(key in this)) {
					errors += `Expected method "this.${key}(node)" not found.\n`;
				}
			}

			if (errors.length) {
				throw new TypeError(errors);
			}
		}

		visit(node) {
			if (!(node && (typeof(node) == "object"))) {
				throw TypeError(`Invalid node. Node is not an object.`);
			}

			let p = getPrivate(this, "visit", true);
			let key = Object.keys(p.types)[Object.values(p.types).indexOf(node.type)];

			if (!key) {
				throw new TypeError(`Invalid node. Unknown node type: ${node.type.toString()}.`);
			}

			this[key](node);
		}
	}

	let { makePrivates, getPrivate } = createClassHelpers({
		classDef: ASTVisitor,
		privateData: pvtData
	});

	return ASTVisitor;
})();
