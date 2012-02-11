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

try {
    var jsparse = require("./jsparse");
} catch (e) {}


var passed = [];
var failed = [];

var print = print || function print(str) {
    console.log(str);
}

function assertTrue(msg, test) {
    if(test)
	passed.push(msg);
    else
	failed.push(msg);
}

function assertTrue2(test) {
    if(eval(test))
	passed.push(test);
    else
	failed.push(test);
}

function assertFalse(msg, test) {
    if(test)
	failed.push(msg);
    else
	passed.push(msg);
}

function assertEqual(msg, value1, value2) {
    if(value1 == value2)
	passed.push(msg);
    else
	failed.push(msg);
}

function assertNotEqual(msg, value1, value2) {
    if(value1 != value2)
	passed.push(msg);
    else
	failed.push(msg);
}

function assertFullyParsed(parser, string) {
    var msg = parser + " did not fully parse: " + string;
    try {
    	var result = eval(parser)(jsparse.ps(string));
    	if(result && result.remaining.length == 0)
    	    passed.push(msg);
    	else
    	    failed.push(msg);
    }
    catch(e) {
        console.log(e);
    	failed.push(msg);
    }
}

function assertParseFailed(parser, string) {
    var msg = parser + " succeeded but should have failed: " + string;
    try {
    	var result = eval(parser)(jsparse.ps(string));
    	if(!result)
    	    passed.push(msg);
    	else
    	    failed.push(msg);
        }
    catch(e) {
        console.log(e);
    	failed.push(msg);
    }
}

function assertParseMatched(parser, string, expected) {
    var msg = parser + " parse did not match: " + string;
    try {
    	var result = eval(parser)(jsparse.ps(string));
    	if(result && result.matched == expected)
    	    passed.push(msg);
    	else
    	    failed.push(msg + " got [" + result.matched + "] expected [" + expected + "]");
    }
    catch(e) {
    	failed.push(msg);
    }
}

function time(func) {
    var start = +new Date();
    var r =  func();
    var end = +new Date();
    print("Time: " + (end-start) + "ms");
    return r;
}

function runTests(func) {
    passed = [];
    failed = [];
    func();
    var total = passed.length + failed.length;
    for(var i=0; i < failed.length; ++i)
	print(failed[i]);
    print(total + " tests: " + passed.length + " passed, " + failed.length + " failed");
}

function ParserTests() {
    // Token
    assertFullyParsed("jsparse.token('a')", "a");
    assertFullyParsed("jsparse.token('abcd')", "abcd");
    assertParseMatched("jsparse.token('abcd')", "abcdef", "abcd");
    assertParseFailed("jsparse.token('a')", "b");

    // ch
    assertParseMatched("jsparse.ch('a')", "abcd", "a");
    assertParseFailed("jsparse.ch('a')", "bcd");

 //    // range
    for(var i=0; i < 10; ++i) {
    	assertParseMatched("jsparse.range('0','9')", "" + i, i);
    }
    assertParseFailed("jsparse.range('0','9')", "a");

 //    // whitespace
    assertFullyParsed("jsparse.whitespace(jsparse.token('ab'))", "ab");
    assertFullyParsed("jsparse.whitespace(jsparse.token('ab'))", " ab");
    assertFullyParsed("jsparse.whitespace(jsparse.token('ab'))", "  ab");
    assertFullyParsed("jsparse.whitespace(jsparse.token('ab'))", "   ab");

 //    // negate
    assertFullyParsed("jsparse.negate(jsparse.ch('a'))", "b");
    assertParseFailed("jsparse.negate(jsparse.ch('a'))", "a");

 //    // end
    assertParseFailed("jsparse.end", "ab");
    assertFullyParsed("jsparse.end", "");

 //    // nothing
    assertParseFailed("jsparse.nothing", "abcd");
    assertParseFailed("jsparse.nothing", "");

 //    // sequence
    assertFullyParsed("jsparse.sequence('a', 'b')", "ab");
    assertParseFailed("jsparse.sequence('a', 'b')", "b");
    assertParseFailed("jsparse.sequence('a', 'b')", "a");
    assertParseMatched("jsparse.sequence('a', jsparse.whitespace('b'))", "a b", "ab");
    assertParseMatched("jsparse.sequence('a', jsparse.whitespace('b'))", "a  b", "ab");
    assertParseMatched("jsparse.sequence('a', jsparse.whitespace('b'))", "ab", "ab");

 //    // choice
    assertFullyParsed("jsparse.choice('a', 'b')", "a");
    assertFullyParsed("jsparse.choice('a', 'b')", "b");
    assertParseMatched("jsparse.choice('a', 'b')", "ab", "a");
    assertParseMatched("jsparse.choice('a', 'b')", "bc", "b");

 //    // repeat0
    assertParseMatched("jsparse.repeat0(jsparse.choice('a','b'))", "adef", "a");
    assertParseMatched("jsparse.repeat0(jsparse.choice('a','b'))", "bdef", "b");
    assertParseMatched("jsparse.repeat0(jsparse.choice('a','b'))", "aabbabadef", "aabbaba");
    assertParseMatched("jsparse.repeat0(jsparse.choice('a','b'))", "daabbabadef", "");

 //    // repeat1
    assertParseMatched("jsparse.repeat1(jsparse.choice('a','b'))", "adef", "a");
    assertParseMatched("jsparse.repeat1(jsparse.choice('a','b'))", "bdef", "b");
    assertParseMatched("jsparse.repeat1(jsparse.choice('a','b'))", "aabbabadef", "aabbaba");
    assertParseFailed("jsparse.repeat1(jsparse.choice('a','b'))", "daabbabadef");

 //    // optional
    assertParseMatched("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "abd", "abd");
    assertParseMatched("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "acd", "acd");
    assertParseMatched("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "ad", "ad");
    assertParseFailed("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "aed");
    assertParseFailed("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "ab");
    assertParseFailed("jsparse.sequence('a', jsparse.optional(jsparse.choice('b','c')), 'd')", "ac");

 //    // list
    assertParseMatched("jsparse.list(jsparse.choice('1','2','3'),',')", "1,2,3", "1,2,3");
    assertParseMatched("jsparse.list(jsparse.choice('1','2','3'),',')", "1,3,2", "1,3,2");
    assertParseMatched("jsparse.list(jsparse.choice('1','2','3'),',')", "1,3", "1,3");
    assertParseMatched("jsparse.list(jsparse.choice('1','2','3'),',')", "3", "3");
    assertParseFailed("jsparse.list(jsparse.choice('1','2','3'),',')", "5,6,7");

 //    // and
    assertParseMatched("jsparse.sequence(jsparse.and('0'), '0')", "0", "0");
    assertParseFailed("jsparse.sequence(jsparse.and('0'), '1')", "0");
    assertParseMatched("jsparse.sequence('1',jsparse.and('2'))", "12", "1");

 //    // not
    assertParseMatched("jsparse.sequence('a',jsparse.choice('+','++'),'b')", "a+b", "a+b");
    assertParseFailed("jsparse.sequence('a',jsparse.choice('+','++'),'b')", "a++b");
    assertParseMatched("jsparse.sequence('a',jsparse.choice(jsparse.sequence('+',jsparse.not('+')),'++'),'b')", "a+b", "a+b");
    assertParseMatched("jsparse.sequence('a',jsparse.choice(jsparse.sequence('+',jsparse.not('+')),'++'),'b')", "a++b", "a++b");

 //    // butnot
    assertFullyParsed("jsparse.butnot(jsparse.range('0','9'), '6')", "1");
    assertParseFailed("jsparse.butnot(jsparse.range('0','9'), '6')", "6");
    assertParseFailed("jsparse.butnot(jsparse.range('0','9'), 'x')", "x");
    assertParseFailed("jsparse.butnot(jsparse.range('0','9'), 'y')", "x");
}


time(function() { runTests(ParserTests); });

try {
  process.exit(failed.length)
} catch(e) {}

