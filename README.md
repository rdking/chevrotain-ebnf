# chevrotain-ebnf

This is an EBNF parser class with a built-in Lexer. The purpose of this module is to allow language developers to write LL(K) compatible grammars in EBNF syntax and automatically produce a parser for that grammar. Chevrotain is used as the backing library for both the EBNF parser as well as the parser for the target language. So familiarity with Chevrotain is a must.

## API
The EBNFParser class is the object received from requiring this module

```js
let EBNFParser = require("chevrotain-ebnf");
```

To use it, just create a new instance, passing your new language's EBNF text as the parameter.

```js
let ebnfParser = new EBNFParser(YOUR_EBNF_TEXT);
```

Although it's not always necessary (since chevrotain-ebnf will extract and name the tokens for you), it's usually better to provide your own token ordering. To do so, first create an array of objects. Each object should have a single key with the token name as the key and the regular expression to match that token as the value.

```js
let lexMap = [
    { Whitespace: /[\s\t\r\n]/ },
    { If: /if/ },
    { When: /when/ },
    ...
];
```

Use this array as the 2nd parameter when instantiating the EBNFParser.
```js
let ebnfParser = new EBNFParser(YOUR_EBNF_TEXT, lexMap);
```

That performs the lexing for your language using Chevrotain. Follow this by calling `learnLanguage()` with the name of your language as the parameter.

```js
let YourLangParser = ebnfParser.learnLanguage("YOUR_LANG_NAME");
```

If you specified your own token ordering, you should also provide that array to `learnLanguage()` as the 2nd parameter.
```js
let YourLangParser = ebnfParser.learnLanguage("YOUR_LANG_NAME", lexMap);
```

Now just instantiate that `YourLangParser` and you have the parser for your new language.

#### Important Note
To generate the parser object, Chevrotain uses `eval()`. If the Content Security Policy of your target environment does not allow the use of `eval`, you must use source code generation to get your parser's source and load that by whatever means allowed in your target environment.

For more details, see [Chevrotain: Code Generation](https://sap.github.io/chevrotain/docs/guide/custom_apis.html#code-generation).

## Using The New Parser
Since Chevrotain's `Lexer` requires you pass in your language's tokens, you can just fetch them from your new parser instance.

```js
let parser = new YourLangParser(chevrotain_options);
let lexer = new Lexer(Object.values(parser.tokensMap));
```

From here on out, just do what you would with any chevrotain lexer and parser.

```js
let lexResult = lexer.tokenize(YOUR_LANG_SOURCE_CODE);
if (lexResult.errors.length > 0) {
    throw new Error("Oh no! You've got syntax errors!");
}

parser.input = lexResult.tokens;
let cst = parser.Expression();
```

If you want to see this in action using a simple sample grammar, just look at the [example code](./test/index.js) in the test directory.

## Source Code Generation
If you would rather generate the source code for the parser instead of the parser object itself, set the 3rd parameter of `learnLanguage()` to `true`.

```js
let YourLangParser = ebnfParser.learnLanguage("YOUR_LANG_NAME", null, true);
```
or
```js
let YourLangParser = ebnfParser.learnLanguage("YOUR_LANG_NAME", lexMap, true);
```

## Supported EBNF Grammar
Unfortunately, there are just too many variations on a theme when it comes to the specific details of EBNF grammar. Fortunately, EBNF is easily described in EBNF. Below is the EBNF grammar supported by this module, in EBNF.

```
grammar = rule, newline;
rule = lhs, [ ws ], "=", rhs, ";";
lhs = identifier;
rhs = [ [ ws ], alternation, [ ws ], { ",", [ ws ], alternation, [ ws ] } ];
alternation = [ [ ws ], element, [ ws ], { "|", element, [ ws ] } ];
element = optional | repeated | group | terminal | identifier;
optional = "[", [ ws ], rhs, [ ws ], "]";
repeated = "{", [ ws ], rhs, [ ws ], "}";
group = "(", [ ws ], rhs, [ ws ], ")";
terminal = dq_string | sq_string;
dq_string = '"', dq_string_char, '"';
sq_string = "'", sq_string_char, "'";
dq_string_char = "'" | character;
sq_string_char = '"' | character;
identifier = letter, { identifier_character };
identifier_character = "_" | letter | digit;
letter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L"
       | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X"
       | "Y" | "Z" | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
       | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v"
       | "w" | "x" | "y" | "z";
digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
character = "[" | "]" | "{" | "}" | "(" | ")" | "|" | "," | "=" | ";"
          | symbol | newline | ws | identifier_character;
symbol = "~" | "`" | "!" | "@" | "#" | "$" | "%" | "^" | "&" | "*" | "-" | "+"
       | "\" | ":" | "<" | ">" | "?" | "." | "/";
newline = { [ "\r" ], "n" };
ws = { "\t" | " " };
```

## Installation
It's an ordinary node module that requires chevrotain, so...

```
npm i chevrotain --save
npm i chevrotain-ebnf --save
```

## CLI
This module also provides a command-line tool to generate a chevrotain module directly. 

```
Usage: ebnfConvert [options]

Options:
  -V, --version          output the version number
  -n, --name [name]      Name of the parser class
  -s, --source [source]  Path to the EBNF source file.
  -m, --map [map]        Path to a JSON formatted token map. [optional]
  -o, --output [module]  Path to the output file. If not specified, the module will be dumped to the console. [optional]
  -h, --help             output usage information
```
To convert an EBNF file to a Chevrotain module:
```js
./node_modules/bin/ebnfConvert -n <YourLangName> -s ebnfSource -o outputFile.js
```
or
```js
./node_modules/bin/ebnfConvert -n <YourLangName> -s ebnfSource >> outputFile.js
```

The second approach allows you to use ebnfConvert in pipelines by generating the target file on the fly.

## References
* [Chevrotain](https://sap.github.io/chevrotain/docs/) - the core grammar parsing API
* [Example Code](./test/index.js) - example logic used to test this module


### Have fun writing those new languages!
