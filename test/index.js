const chevrotain = require("chevrotain");
const EBNFParser = require("../index"); //require("chevrotain-ebnf");

const EBNF = String.raw
`Expression = SubExpression | Operation;
SubExpression = ( "(", [ ws ], Expression, [ ws ], ")" );
ws = { " " | "\t" | "\n" | "\r" };
Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
Integer = [ ws ], Digit, { Digit };
Operation = ASValue, { ASOperation };
ASValue = MDOperation | MDValue;
MDValue = SubExpression | Integer;
ASOperation = [ ws ], ASOP, [ ws ], ASValue;
ASOP = Addition | Subtraction;
Addition = "+";
Subtraction = "-";
MDOperation = MDValue, [ ws ], MDOP, [ ws ], MDValue;
MDOP = Multiplication | Division;
Multiplication = "*";
Division = "/";
`;

var ebnfParser = new EBNFParser(EBNF);
var parser = ebnfParser.learnLanguage();
parser.saveSyntaxDiagram("./EBNF.html");

/* The real language examination begins here.
   
   let ast = parser.parse(sourceFile);

 */
