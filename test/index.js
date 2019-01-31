const { Lexer } = require("chevrotain");
const EBNFParser = require("../index"); //require("chevrotain-ebnf");

const EBNF = `Expression = Operation;
SubExpression = ( "(", [ ws ], Expression, [ ws ], ")" );
ws = { " " | "\t" | "\n" | "\r" };
Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
Integer = Digit, { Digit };
Operation = ASValue, { [ ws ], ASOperation };
ASValue = MDValue, [ ws ], [ MDOperation ];
MDValue = Integer | SubExpression;
ASOperation = ASOP, [ ws ], ASValue;
ASOP = Addition | Subtraction;
Addition = "+";
Subtraction = "-";
MDOperation = MDOP, [ ws ], MDValue;
MDOP = Multiplication | Division;
Multiplication = "*";
Division = "/";
`;

function collectLexerErrors(errors) {
    let retval = "";
    for (let error of errors) {
        retval += `\nLexer Error: ${error.message} (line: ${error.line}, col: ${error.column})`;
    }
    return retval;
}

/**
 * @description A LexMapElement is a simple, single-keyed object with the name
 * of the key being the name given to the token during source generation, and
 * the value of that key being the regular expression used by Chevrotain to
 * match the token.
 * @typedef LexMapElement
 * @type {object}
 * @property <YourTokenName> - a RegExp object
 * 
 * @typedef LexMap
 * @type {LexMapElement[]}
 * 
 * You don't have to do this unless the order of your tokens is important.
 * Chevrotain-ebnf can automatically extract your tokens for you. However,
 * since the names given to them are arbitrary, it's recommended that you
 * provide your own token map.
 */
var lexMap = [
    { Space: / / },
    { Tab: /\t/ },
    { LineFeed: /\n/ },
    { NewLine: /\r/ },
    { OpenGroup: /\(/ },
    { CloseGroup: /\)/ },
    { Zero: /0/ },
    { One: /1/ },
    { Two: /2/ },
    { Three: /3/ },
    { Four: /4/ },
    { Five: /5/ },
    { Six: /6/ },
    { Seven: /7/ },
    { Eight: /8/ },
    { Nine: /9/ },
    { Plus: /\+/ },
    { Minus: /\-/ },
    { Asterisk: /\*/ },
    { Slash: /\// }
];

//First get a parser object....
var ebnfParser = new EBNFParser(EBNF);
var Parser = ebnfParser.learnLanguage("SimpleMath", lexMap);

const SOURCE = "1 + 2 * 3 - 4 / 5 + 6 / 7 - 8 * 9";
let parser = new Parser();
let lexer = new Lexer(Object.values(parser.tokensMap));
let lexResult = lexer.tokenize(SOURCE);

if (lexResult.errors.length > 0) {
    throw new Error(collectLexerErrors(tokens.errors));
}

parser.input = lexResult.tokens;
let cst = parser.Expression();
console.log(JSON.stringify(cst, null, '  '));

//Now get the source module
var moduleSource = ebnfParser.learnLanguage("SimpleMath", lexMap, true);
console.log("\n----------------------------------------\n");
console.log(moduleSource);
