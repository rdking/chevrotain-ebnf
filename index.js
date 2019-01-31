const createClassHelpers = require("./lib/classHelpers");
const { Lexer, Parser, createToken, createSyntaxDiagramsCode } = require("chevrotain");
const fs = require("fs");
const Vocabulary = Object.freeze({
    NewLine: createToken({
        name: "NewLine",
        pattern: /(\r?\n)+/,
        // group: Lexer.SKIPPED
    }),
    WhiteSpace: createToken({
        name: "WhiteSpace",
        pattern: /[\t\s]+/,
        // group: Lexer.SKIPPED
    }),
    Letter: createToken({
        name: "Letter",
        pattern: /[A-Za-z]/
    }),
    Digit: createToken({
        name: "Digit",
        pattern: /\d/
    }),
    Symbol: createToken({
        name: "Symbol",
        pattern: /[~`!@#$%^&*\-+\\:<>?./]/
    }),
    Underscore: createToken({
        name: "Underscore",
        pattern: /_/
    }),
    SingleQuote: createToken({
        name: "SingleQuote",
        pattern: /'/
    }),
    DoubleQuote: createToken({
        name: "DoubleQuote",
        pattern: /"/
    }),
    OpenOption: createToken({
        name: "OpenOption",
        pattern: /\[/
    }),
    CloseOption: createToken({
        name: "CloseOption",
        pattern: /\]/
    }),
    OpenRepeat: createToken({
        name: "OpenRepeat",
        pattern: /\{/
    }),
    CloseRepeat: createToken({
        name: "CloseRepeat",
        pattern: /\}/
    }),
    OpenGroup: createToken({
        name: "OpenGroup",
        pattern: /\(/
    }),
    CloseGroup: createToken({
        name: "CloseGroup",
        pattern: /\)/
    }),
    Alternate: createToken({
        name: "Alternate",
        pattern: /\|/
    }),
    Conjoin: createToken({
        name: "Conjoin",
        pattern: /\,/
    }),
    Define: createToken({
        name: "Define",
        pattern: /\=/
    }),
    Terminator: createToken({
        name: "Terminator",
        pattern: /\;/
    })
});

const Tokens = [
    Vocabulary.NewLine,
    Vocabulary.WhiteSpace,
    Vocabulary.Letter,
    Vocabulary.Digit,
    Vocabulary.Underscore,
    Vocabulary.SingleQuote,
    Vocabulary.DoubleQuote,
    Vocabulary.OpenOption,
    Vocabulary.CloseOption,
    Vocabulary.OpenRepeat,
    Vocabulary.CloseRepeat,
    Vocabulary.OpenGroup,
    Vocabulary.CloseGroup,
    Vocabulary.Alternate,
    Vocabulary.Conjoin,
    Vocabulary.Define,
    Vocabulary.Terminator,
    Vocabulary.Symbol
];

module.exports = (function() {
    function pvtData() {
        return {
            tokens: null,
            grammar: null,
            astNodeTypes: null,
            generatedSource: null,
            compiler: null,
            options: null,
            createRules() {
                let p = getPrivate(this, "createRules", true);
                let $ = this;

                $.RULE("grammar", () => {
                    $.MANY(() => {
                        $.SUBRULE($.rule);
                        $.CONSUME(Vocabulary.NewLine);
                    });
                });

                $.RULE("rule", () => {
                    $.SUBRULE($.lhs);
                    $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                    $.CONSUME2(Vocabulary.Define);
                    $.OPTION1(() => { $.CONSUME3(Vocabulary.WhiteSpace); });
                    $.SUBRULE2($.rhs);
                    $.OPTION2(() => { $.CONSUME4(Vocabulary.WhiteSpace); });
                    $.CONSUME5(Vocabulary.Terminator);
                });

                $.RULE("lhs", () => {
                    $.SUBRULE($.identifier);
                });

                $.RULE("rhs", () => {
                    $.MANY_SEP({
                        SEP: Vocabulary.Conjoin,
                        DEF: () =>{
                            $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                            $.SUBRULE($.rhs_alternation);
                            $.OPTION1(() => { $.CONSUME1(Vocabulary.WhiteSpace); });
                        }
                    });
                });

                $.RULE("rhs_alternation", () => {
                    $.MANY_SEP({
                        SEP: Vocabulary.Alternate,
                        DEF: () => {
                            $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                            $.SUBRULE1($.rhs_element);
                            $.OPTION1(() => { $.CONSUME1(Vocabulary.WhiteSpace); });
                        }
                    })
                });

                $.RULE("rhs_element", () => {
                    $.OR([
                        { ALT: () => { $.SUBRULE($.rhs_optional); }},
                        { ALT: () => { $.SUBRULE($.rhs_repeated); }},
                        { ALT: () => { $.SUBRULE($.rhs_group); }},
                        { ALT: () => { $.SUBRULE($.terminal); }},
                        { ALT: () => { $.SUBRULE($.identifier); }}
                    ]);
                });

                $.RULE("rhs_optional", () => {
                    $.CONSUME(Vocabulary.OpenOption);
                    $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                    $.SUBRULE($.rhs);
                    $.OPTION1(() => { $.CONSUME1(Vocabulary.WhiteSpace); });
                    $.CONSUME(Vocabulary.CloseOption);
                });

                $.RULE("rhs_repeated", () => {
                    $.CONSUME(Vocabulary.OpenRepeat);
                    $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                    $.SUBRULE($.rhs);
                    $.OPTION1(() => { $.CONSUME1(Vocabulary.WhiteSpace); });
                    $.CONSUME(Vocabulary.CloseRepeat);
                });

                $.RULE("rhs_group", () => {
                    $.CONSUME(Vocabulary.OpenGroup);
                    $.OPTION(() => { $.CONSUME(Vocabulary.WhiteSpace); });
                    $.SUBRULE($.rhs);
                    $.OPTION1(() => { $.CONSUME1(Vocabulary.WhiteSpace); });
                    $.CONSUME(Vocabulary.CloseGroup);
                });

                $.RULE("terminal", () => {
                    $.OR([
                        { ALT: () => { $.SUBRULE($.dq_string); }},
                        { ALT: () => { $.SUBRULE($.sq_string); }}
                    ]);
                });

                $.RULE("dq_string", () => {
                    $.CONSUME(Vocabulary.DoubleQuote);
                    $.AT_LEAST_ONE(() => { $.SUBRULE($.dq_string_char); });
                    $.CONSUME1(Vocabulary.DoubleQuote);
                });

                $.RULE("sq_string", () => {
                    $.CONSUME(Vocabulary.SingleQuote);
                    $.AT_LEAST_ONE(() => { $.SUBRULE($.sq_string_char); });
                    $.CONSUME1(Vocabulary.SingleQuote);
                });

                $.RULE("dq_string_char", () => {
                    $.OR([
                        { ALT: () => { $.CONSUME(Variable.SingleQuote); } },
                        { ALT: () => { $.SUBRULE($.character); } }
                    ]);
                });

                $.RULE("sq_string_char", () => {
                    $.OR([
                        { ALT: () => { $.CONSUME(Variable.DoubleQuote); } },
                        { ALT: () => { $.SUBRULE($.character); } }
                    ]);
                });

                $.RULE("identifier", () => {
                    $.CONSUME(Vocabulary.Letter);
                    $.MANY(() => { $.SUBRULE($.identifier_character); });
                });

                $.RULE("identifier_character", () => {
                    $.OR([
                        { ALT: () => { $.CONSUME(Vocabulary.Letter) } },
                        { ALT: () => { $.CONSUME(Vocabulary.Digit); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Underscore); } }
                    ]);
                });

                $.RULE("character", () => {
                    $.OR([
                        { ALT: () => { $.CONSUME(Vocabulary.NewLine); } },
                        { ALT: () => { $.CONSUME(Vocabulary.WhiteSpace); } },
                        { ALT: () => { $.CONSUME(Vocabulary.OpenOption); } },
                        { ALT: () => { $.CONSUME(Vocabulary.CloseOption); } },
                        { ALT: () => { $.CONSUME(Vocabulary.OpenRepeat); } },
                        { ALT: () => { $.CONSUME(Vocabulary.CloseRepeat); } },
                        { ALT: () => { $.CONSUME(Vocabulary.OpenGroup); } },
                        { ALT: () => { $.CONSUME(Vocabulary.CloseGroup); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Alternate); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Conjoin); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Define); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Terminator); } },
                        { ALT: () => { $.CONSUME(Vocabulary.Symbol); } },
                        { ALT: () => { $.SUBRULE($.identifier_character); } }
                    ]);
                });
            },
            createParser(cst) {
                let p = getPrivate(this, "createAST", true);
                let Visitor = require("./lib/EBNFVisitor")(this.getBaseCstVisitorConstructor());
                let visitor = new Visitor({source: p.grammar, name: p.options.name});
                p.astNodeTypes = Visitor.Types;
                return visitor.visit(cst);
            },
            getTokenList(lexMap) {
                let retval = [];
                for (let mapping of lexMap) {
                    retval.push(createToken({
                        name: Object.keys(mapping)[0],
                        pattern: Object.values(mapping)[0]
                    }));
                }
                return retval;
            }
        };
    }

    function collectLexerErrors(errors) {
        let retval = "";
        for (let error of errors) {
            retval += `\nLexer Error: ${error.message} (line: ${error.line}, col: ${error.column})`;
        }
        return retval;
    }

    function collectParserErrors(errors) {
        let retval = "";
        for (let error of errors) {
            retval += `\nParser Error: ${error.message} (line: ${error.token.startLine}, col: ${error.token.startColumn})`;
        }
        return retval;
    }

    let EBNFParser = class EBNFParser extends Parser {
        constructor(ebnf, config) {
            let lexer = new Lexer(Tokens);            
            let lexResult = lexer.tokenize(ebnf);
            
            if (lexResult.errors.length > 0) {
                throw new Error(collectLexerErrors(tokens.errors));
            }

            super(Vocabulary, config);
            let p = makePrivates(this, new.target);

            p.tokens = lexResult.tokens;
            p.grammar = ebnf;
            p.createRules();
        }

        saveSyntaxDiagram(filename) {
            let serializedGrammar = this.getSerializedGastProductions();

            // create the HTML Text
            let htmlText = createSyntaxDiagramsCode(serializedGrammar);
            
            // Write the HTML file to disk
            fs.writeFileSync(filename, htmlText)
        }

        learnLanguage(name, tokenMap, asSource) {
            let p = getPrivate(this, "createParser");
            this.performSelfAnalysis();
            this.input = p.tokens;
            let cst = this.grammar();

            p.options = { name, tokenMap: p.getTokenList(tokenMap), asSource };

            if (this.errors.length > 0) {
                throw Error(collectParserErrors(this.errors));
            }

            return p.createParser(cst);
        }
    };

    let { makePrivates, getPrivate } = createClassHelpers({
        classDef: EBNFParser,
        privateData: pvtData
    });

    return EBNFParser;
})();
