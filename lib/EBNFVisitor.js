const createClassHelpers = require("./classHelpers");
const { generateParserModule, generateParserFactory, Alternation, Flat,
        NonTerminal, Optional, Repetition, RepetitionMandatory,
        RepetitionMandatoryWithSeparator, RepetitionWithSeparator, Rule,
        Terminal } = require("chevrotain");

module.exports = function getEBNFVisitor(base) {
    function pvtData() {
        return {
            options: null,
            terminals: {},
            getTerminalChar(ctx, keys) {
                let retval;

                for (let type of keys) {
                    if (type in ctx) {
                        if (type == "name") {
                            retval = this.visit(ctx[name]);
                        }
                        else if (type == "identifier_character") {
                            retval = this.visit(ctx.identifier_character[0]);
                        }
                        else {
                            retval = ctx[type][0].image;
                        }
                        break;
                    }
                }
    
                return retval;
            },
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

    const NodeTypes = Object.freeze({
        Grammar: Symbol("Grammar"),
        Rule: Symbol("Rule"),
        Definition: Symbol("Definition"),
        Sequence: Symbol("Sequence"),
        Alternate: Symbol("Alternate"),
        Optional: Symbol("Optional"),
        Repeated: Symbol("Repeated"),
        Group: Symbol("Group"),
        Identifier: Symbol("Identifier"),
        Terminal: Symbol("Terminal"),
        DQ_String: Symbol("DQ_String"),
        SQ_String: Symbol("SQ_String")
    });

    class EBNFVisitor extends base {
        constructor(options) {
            super();
            let p = makePrivates(this, new.target);
            p.options = options;
            this.validateVisitor();
        }

        static get Types() { return NodeTypes; }

        grammar(ctx) {
            let rules = [];
			for (let rule of node.rules) {
				rules.push(this.visit(rule));
			}

			let retval = (p.options.source) ? generateParserModule({
				name: p.options.name,
				rules
			}) : generateParserFactory({
				name: p.options.name,
				rules,
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

        rule(ctx) {
            let {lhs, rhs} = ctx;
            let retval = {
                type: NodeTypes.Rule
            };

            retval.name = this.visit(lhs[0]);
            retval.definition = this.visit(rhs[0]);

            return retval;
        }

        lhs(ctx) {
            let retval = this.visit(ctx.identifier);
            return retval;
        }

        rhs(ctx) {
            let retval = {
                type: NodeTypes.Definition,
                alternatives: []
            };
            let keys = [ "rhs_optional", "rhs_repeated", "rhs_group",
                         "terminal", "identifier" ];
            
            for (let key of keys) {
                if (key in ctx) {
                    let part = this.visit(ctx[key]);
                    let node = {
                        type: NodeTypes.Sequence,
                        value: [part]
                    };

                    retval.alternatives.push(node);
                    break;
                }
            }

            if ("rhs_list" in ctx) {
                for (let item of ctx.rhs_list) {
                    let list = this.visit(item);

                    for (let element of list) {
                        let node;
                        let type = element.type;
                        element = element.next.alternatives[0];
                        if (type === NodeTypes.Sequence) {
                            node = retval.alternatives.pop();
                            node.value.push(element.value[0]);
                        }
                        else {
                            node = {
                                type: NodeTypes.Sequence,
                                value: [element.value[0]]
                            };
                        }
                        retval.alternatives.push(node);
                    }
                }
            }
            return retval;
        }

        rhs_optional(ctx) {
            let retval = {
                type: NodeTypes.Optional,
                value: [this.visit(ctx.rhs)]
            };
            return retval;
        }

        rhs_repeated(ctx) {
            let retval = {
                type: NodeTypes.Repeated,
                value: [this.visit(ctx.rhs)]
            };
            return retval;
        }

        rhs_group(ctx) {
            let retval = {
                type: NodeTypes.Group,
                value: [this.visit(ctx.rhs)]
            };
            return retval;
        }

        rhs_list(ctx) {
            let retval = [];
            for (let i=0; i<ctx.rhs_separator.length; ++i) {
                retval.push(this.visit(ctx.rhs_separator[i]));
                retval[i].next = this.visit(ctx.rhs[i]);
            }
            return retval;
        }

        rhs_separator(ctx) {
            return {
                type: NodeTypes[("Alternate" in ctx) ? "Alternate" : "Sequence"]
            };
        }

        terminal(ctx) {
            let keys = ["dq_string", "sq_string"];
            let retval = {
                type: NodeTypes.Terminal,
                value: []
            };

            for (let key of keys) {
                if (key in ctx) {
                    retval.value.push(this.visit(ctx[key]));
                    break;
                }
            }

            return retval;
        }

        dq_string(ctx) {
            let retval = {
                type: NodeTypes.DQ_String,
                value: ""//"`"
            };

            for (let char of ctx.dq_string_char) {
                retval.value += this.visit(char);
            }
            
            // retval.value += "`";

            return retval;
        }

        sq_string(ctx) {
            let retval = {
                type: NodeTypes.SQ_String,
                value: ""//"`"
            };

            for (let char of ctx.sq_string_char) {
                retval.value += this.visit(char);
            }

            // retval.value += "`";

            return retval;
        }

        dq_string_char(ctx) {
            let retval;

            if ("SingleQuote" in ctx) {
                retval = ctx.SingleQuote[0].image;
            }
            else if ("character" in ctx) {
                for (let char of ctx.character) {
                    retval = this.visit(char);
                }
            }

            return retval;
        }

        sq_string_char(ctx) {
            let retval;

            if ("DoubleQuote" in ctx) {
                retval = ctx.DoubleQuote[0].image;
            }
            else if ("character" in ctx) {
                for (let char of ctx.character) {
                    retval = this.visit(char);
                }
            }

            return retval;
        }

        identifier(ctx) {
            let retval = {
                type: NodeTypes.Identifier,
                value: ctx.Letter[0].image
            };
            for (let char of ctx.identifier_character) {
                retval.value += this.visit(char);
            }
            return retval;
        }

        identifier_character(ctx) {
            let p = getPrivate(this, "identifier_character");
            return p.getTerminalChar(ctx, [ "Letter", "Digit", "Underscore" ]);
        }

        character(ctx) {
            let p = getPrivate(this, "character");
            let keys = [ "name", "identifier_character", "NewLine", "WhiteSpace", "OpenOption",
                         "CloseOption", "OpenRepeat", "CloseRepeat",
                         "OpenGroup", "CloseGroup", "Alternate", "Conjoin",
                         "Define", "Terminator", "Symbol" ];
            return p.getTerminalChar(ctx, keys);
        }
    }

    let { makePrivates, getPrivate } = createClassHelpers({
        classDef: EBNFVisitor,
        privateData: pvtData
    });

    return EBNFVisitor;
};
