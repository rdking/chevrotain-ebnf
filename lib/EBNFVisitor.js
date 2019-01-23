const createClassHelpers = require("./classHelpers");

module.exports = function getEBNFVisitor(base) {
    function pvtData() {
        return {
            getTerminalChar(ctx, keys) {
                let retval;

                for (let type of keys) {
                    if (type in ctx) {
                        if (type == "name") {
                            retval = this.visit(ctx[name]);
                        }
                        else {
                            retval = ctx[type][0].image;
                        }
                        break;
                    }
                }
    
                return retval;
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
        Group: Symbol("Group")
    });

    class EBNFVisitor extends base {
        constructor() {
            super();
            let p = makePrivates(this, new.target);
            this.validateVisitor();
        }

        static get Types() { return NodeTypes; }

        grammar(ctx) {
            let retval = {
                type: NodeTypes.Grammar,
                rules: []
            };

            for (let rule of ctx.rule) {
                retval.rules.push(this.visit(rule));
            }

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
                    let last = {
                        type: NodeTypes.Sequence,
                        elements: [part]
                    };

                    retval.alternatives.push(last);
                    break;
                }
            }

            if ("rhs_list" in ctx) {
                for (let item of ctx.rhs_list) {
                    let part = this.visit(item);
                    let last = {
                        type: NodeTypes.Sequence,
                        elements: part
                    };
                
                    if (part.type === NodeTypes.Sequence) {
                        last = retval.alternatives[retval.alternatives.length - 1] || last;
                    }
                    else {
                        retval.alternatives.push(last);
                    }
                    
                    last.elements.push(part.next);

                }
            }
            return retval;
        }

        rhs_optional(ctx) {
            let retval = {
                type: NodeTypes.Optional,
                alternatives: [this.visit(ctx.rhs)]
            };
            return retval;
        }

        rhs_repeated(ctx) {
            let retval = {
                type: NodeTypes.Repeated,
                alternatives: [this.visit(ctx.rhs)]
            };
            return retval;
        }

        rhs_group(ctx) {
            let retval = {
                type: NodeTypes.Group,
                alternatives: [this.visit(ctx.rhs)]
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
            let retval = "";

            for (let key of keys) {
                if (key in ctx) {
                    retval = this.visit(ctx[key]);
                    break;
                }
            }

            return retval;
        }

        dq_string(ctx) {
            let retval = this.visit(ctx.dq_string_char);
            return retval;
        }

        sq_string(ctx) {
            let retval = this.visit(ctx.sq_string_char);
            return retval;
        }

        dq_string_char(ctx) {
            let retval;

            if ("SingleQuote" in ctx) {
                retval = ctx.SingleQuote[0].image;
            }
            else if ("character" in ctx) {
                retval = this.visit(ctx.character);
            }

            return retval;
        }

        sq_string_char(ctx) {
            let retval;

            if ("DoubleQuote" in ctx) {
                retval = ctx.DoubleQuote[0].image;
            }
            else if ("character" in ctx) {
                retval = this.visit(ctx.character);
            }

            return retval;
        }

        identifier(ctx) {
            let retval = ctx.Letter[0].image;
            for (let char of ctx.identifier_character) {
                retval += this.visit(char);
            }
            return retval;
        }

        identifier_character(ctx) {
            let p = getPrivate(this, "identifier_character");
            return p.getTerminalChar(ctx, [ "Letter", "Digit", "Underscore" ]);
        }

        character(ctx) {
            let p = getPrivate(this, "character");
            let keys = [ "name", "NewLine", "WhiteSpace", "OpenOption",
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
