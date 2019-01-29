const { Lexer } = require("chevrotain");
const EBNFParser = require("../index"); //require("chevrotain-ebnf");

const EBNF = String.raw
`Expression = Operation;
SubExpression = ( "(", [ ws ], Expression, [ ws ], ")" );
ws = { " " | "\t" | "\n" | "\r" };
Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
Integer = Digit, { Digit };
Operation = ASValue, [ ws ], { ASOperation };
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

var ebnfParser = new EBNFParser(EBNF);
var Parser = ebnfParser.learnLanguage("SimpleMath");

const SOURCE = "1 + 2 * 3 - 4 / 5 + 6 / 7 - 8 * 9";
let parser = new Parser();
let lexer = new Lexer(Object.values(parser.tokensMap));
let lexResult = lexer.tokenize(SOURCE);

if (lexResult.errors.length > 0) {
    throw new Error(collectLexerErrors(tokens.errors));
}

parser.input = lexResult.tokens;
let cst = parser.Expression();
console.log(cst);

