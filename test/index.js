const chevrotain = require("chevrotain");
const EBNFParser = require("../index"); //require("chevrotain-ebnf");

const EBNF = String.raw
`Expression = SubExpression | Operation;
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

var ebnfParser = new EBNFParser(EBNF);
var Parser = ebnfParser.learnLanguage("SimpleMath");

const SOURCE = "1 + 2 * 3 - 4 / 5 + 6 / 7 - 8 * 9";
var parser = new Parser(SOURCE);
parser.saveSyntaxDiagram("./TestLanguage.html");

