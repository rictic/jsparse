// Copyright (C) 2007 Chris Double.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// DEVELOPERS AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
// OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
// OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

// From http://en.wikipedia.org/wiki/Parsing_expression_grammar
//
// Value   := [0-9]+ / '(' Expr ')'
// Product := Value (('*' / '/') Value)*
// Sum     := Product (('+' / '-') Product)*
// Expr    := Sum
//

//to run in both node and browser
try {
  var jp = require("../jsparse")
} catch(e) {
  var jp = jsparse;
}

// Forward definitions required due to lack of laziness in JS
var Expr = function(state) { return Expr(state); }

var Value = jp.choice(jp.repeat1(jp.range('0','9')), Expr);
var Product = jp.sequence(Value, jp.repeat0(jp.sequence(jp.choice('*', '/'), Value)));
var Sum = jp.sequence(Product, jp.repeat0(jp.sequence(jp.choice('+', '-'), Product)));
var Expr = Sum;

console.log(JSON.stringify(Expr(jp.ps("1+2*3-4")).ast))
//Yields: [[["1"],[]],[["+",[["2"],[["*",["3"]]]]],["-",[["4"],[]]]]]
