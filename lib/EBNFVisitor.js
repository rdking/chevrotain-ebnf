const createClassHelpers = require("./classHelpers");
const { createToken, generateParserModule, generateParserFactory, Alternation, 
        Flat, NonTerminal, Option, Repetition, RepetitionMandatory,
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
						name: `VocabTerm${p.terminals[term]}`,
						pattern: p.getRegex(term.value)
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
            let p = getPrivate(this, "grammar");
            let rules = [];
			for (let rule of ctx.rule) {
				rules.push(this.visit(rule));
			}

			let retval = (p.options.source) ? generateParserModule({
				name: p.options.name,
				rules
			}) : generateParserFactory({
				name: p.options.name,
				rules,
				tokenVocabulary: p.terminals
			});
			return retval;
        }

        rule(ctx) {
            let {lhs, rhs} = ctx;

            let retval = new Rule({
                name: this.visit(lhs[0]),
                definition: this.visit(rhs[0])
            });

            return retval;
        }

        lhs(ctx) {
            return this.visit(ctx.identifier).nonTerminalName;
        }

        rhs(ctx) {
            let retval = [];

            if ("rhs_alternation" in ctx) {
                for (let item of ctx.rhs_alternation) {
                    retval.push(this.visit(item));
                }
            }

            return retval;
        }
        
        rhs_alternation(ctx) {
            let list = [];
            if ("rhs_element" in ctx) {
                for (let item of ctx.rhs_element) {
                    list.push(this.visit(item));
                }
            }

            let retval = list[0];

            if (list.length > 1) {
                let definition = [];
                for (let item of list) {
                    definition.push(new Flat({
                        definition: [ item ]
                    }));
                }
                retval = new Alternation({ definition });
            }
            
            return retval;
        }
        
        rhs_element(ctx) {
            return this.visit(ctx[Object.keys(ctx)[0]]);
        }

        rhs_optional(ctx) {
            let retval = new Option({
                definition: [ this.visit(ctx.rhs) ]
            });
            return retval;
        }

        rhs_repeated(ctx) {
            let retval = new Repetition({
                definition: [ this.visit(ctx.rhs) ]
            });
            return retval;
        }

        rhs_group(ctx) {
            let retval = new Flat({
                definition: [ this.visit(ctx.rhs) ]
            });
            return retval;
        }

        rhs_list(ctx) {
            let retval = [];
            for (let i=0; i<ctx.rhs_separator.length; ++i) {
                let rhs = this.visit(ctx.rhs_separator[i])(this.visit(ctx.rhs[i]));
                retval = retval.concat(rhs);
            }
            return retval;
        }

        rhs_separator(ctx) {
            return function(definition) {
                return (("Alternate" in ctx)
                        ? [ new Alternation({ definition }) ]
                        : definition);
            };
        }

        terminal(ctx) {
            let p = getPrivate(this, "terminal");
            let keys = ["dq_string", "sq_string"];
            let token;

            for (let key of keys) {
                if (key in ctx) {
                    token = this.visit(ctx[key]);
                    break;
                }
            }

            return new Terminal({
                terminalType: p.getTerminalToken(token)
            });
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
            let nonTerminalName = ctx.Letter[0].image
            for (let char of ctx.identifier_character) {
                nonTerminalName += this.visit(char);
            }

            return new NonTerminal({
                nonTerminalName
            });
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
