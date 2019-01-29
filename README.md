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

That performs the lexing for your language using Chevrotain. Follow this by calling `learnLanguage()` with the name of your language as the parameter.

```js
let YourLangParser = ebnfParser("YOUR_LANG_NAME");
```

Now just instantiate that `YourLangParser` and you have the parser for your new language.

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

## Installation
It's an ordinary node module that requires chevrotain, so...

```
npm i chevrotain --save
npm i chevrotain-ebnf --save
```


### Have fun writing those new languages!
