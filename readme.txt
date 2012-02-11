jsparse
=======

This is a simple library of parser combinators for Javascript based on
Packrat parsers [1] and Parsing expression grammars [2].

[1] http://pdos.csail.mit.edu/~baford/packrat/
[2] http://en.wikipedia.org/wiki/Parsing_expression_grammar

The only documentation currently available in these blog entries:

http://www.bluishcoder.co.nz/2007/10/javascript-packrat-parser.html
http://www.bluishcoder.co.nz/2007/10/javascript-parser-combinators.html

Examples:

tests.js
  Various tests to ensure things are working

examples/example1.js
  Simple expression example from wikipedia article on PEGs.

examples/example2.js
  Expression example with actions used to produce AST.

examples/example3.js
  Expression example with actions used to evaluate as it parses.

examples/es3.js
  Incomplete/work-in-progress ECMAScript 3 parser

examples/es3_tests.js
  Tests for ECMAScript 3 parser

It has been updated to work in nodejs as well as in the browser.
