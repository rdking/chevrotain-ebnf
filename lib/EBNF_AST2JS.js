const createClassHelpers = require("./classHelpers");
const ASTVisitor = require("./ASTVisitor");
const { generateParserModule, generateParserFactory, Alternation, Flat,
		NonTerminal, Optional, Repetition, RepetitionMandatory,
		RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Rule,
		Terminal } = require("chevrotain");

module.exports = (function() {
	function pvtData() {
		return {
			rules: [],
			terminals: {},
			options: null,
			getRegex(term) {
				let chars = term.split();

				for (let i=0; i<chars.length; ++i) {
					if ("{}()[]?>*+-".includes(chars[i])) {
						chars[i] = "\\" + chars[i];
					}
				}

				return RegExp(chars.join());
			},
			getTerminalToken(term) {
				let p = getPrivate(this, "getTerminalToken", true);
				if (!(term in p.terminals)) {
					p.terminals[term] = createToken({
						name: `VocabTerm${p.terminalMap.get(term)}`,
						pattern: p.getRegex(term)
					});
				}

				return p.terminals[term];
			}
		};
	}

	class EBNF_AST2JS extends ASTVisitor {
		constructor(types, options) {
			super(types);
			let p = makePrivates(this, new.target);
			p.options = options;

			this.validateVisitor();
		}

		Grammar(node) {
			let p = getPrivate(this, "Grammar");

			for (let rule of node.rules) {
				p.rules.push(this.visit(rule));
			}

			let retval = (p.options.source) ? generateParserModule({
				name: p.options.name,
				rules: p.rules
			}) : generateParserFactory({
				name: p.options.name,
				rules: p.rules,
				//Make the terminal map k
				tokenVocabulary: new Proxy({}, {
					get(target, prop, receiver) {
						return p.terminalMap.get(prop);
					},
					set(target, prop, value, receiver) {
						return !!p.terminalMap.set(prop, value);
					},
					has(target, prop) {
						return p.terminalMap.has(prop);
					},
					ownKeys(target) {
						let retval = [];
						for (let [key] of p.terminalMap)
							retval.push(key);

						return retval;
					},
					deleteProperty(target, prop) {
						p.terminalMap.delete(prop);
						return true;
					}
				})
			});
			return retval;
		}

		Rule(node) {
			let p = getPrivate(this, "Rule");
			return new Rule({
				definition: this.visit(node.definition),
				name: node.name.value
			});
		}

		Definition(node) {
			let p = getPrivate(this, "Definition");
			let needOR = node.alternatives.length > 1
			let definition = [];

			for (let alt of node.alternatives) {
				definition.push(this.visit(alt));
			}

			return 
			
			if (needOR) {
				retval += `${p.pad()}$.OR([\n`;
				++p.indent;
			}

				if (needOR) {
					if (first) {
						first = false;
					}
					else {
						retval += `${p.pad()}},\n`;					
					}
					retval += `${p.pad()}{\n`;
					++p.indent;
					retval += `${p.pad()}ALT: () => {\n`;
					++p.indent;
				}
				retval += this.visit(alt);
				if (needOR) {
					--p.indent;
					retval += `${p.pad()}}\n`;
					--p.indent;
				}
			}
			
			if (needOR) {
				retval += `${p.pad()}}\n`;
				--p.indent;
				retval += `${p.pad()}]);\n`;
			}

			return retval;
		}

		Sequence(node) {
			let retval = "";
			
			for (let element of node.value) {
				retval += this.visit(element);
			}

			return retval;
		}

		Alternate(node) {
			let retval = this.visit(node.value);
			return retval;
		}

		Optional(node) {
			let p = getPrivate(this, "Optional");
			let element = node.value[0];
			let retval = `${p.pad()}$.OPTION(() => {\n`;
			++p.indent;
			retval += this.visit(element);
			--p.indent;
			retval += `${p.pad()}});\n`
			return retval;
		}

		Repeated(node) {
			let p = getPrivate(this, "Repeated");
			let element = node.value[0];
			let retval = `${p.pad()}$.MANY(() => {\n`;
			++p.indent;
			retval += this.visit(element);
			--p.indent;
			retval += `${p.pad()}});\n`
			return retval;
		}

		Group(node) {
			let element = node.value[0];
			let retval = this.visit(element);
			return retval;
		}

		Identifier(node) {
			let p = getPrivate(this, "Identifier");
			return `${p.pad()}$.SUBRULE($.${node.value});\n`;
		}

		Terminal(node) {
			let p = getPrivate(this, "Terminal");
			let term = this.visit(node.value[0]);
			return `${p.pad()}$.CONSUME(Vocabulary.${p.getTerminalID(term)});\n`;
		}

		DQ_String(node) {
			let retval = node.value;
			return retval;
		}

		SQ_String(node) {
			let retval = node.value;
			return retval;
		}
	}

	let { makePrivates, getPrivate } = createClassHelpers({
		classDef: EBNF_AST2JS,
		privateData: pvtData
	});

	return EBNF_AST2JS;
})();
