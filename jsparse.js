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

(function() {
    var mod = {};

    mod.foldl = function foldl(f, initial, seq) {
        for(var i=0; i< seq.length; ++i)
            initial = f(initial, seq[i]);
        return initial;
    }

    mod.memoize = true;

    mod.ParseState = (function() {
        function ParseState(input, index) {
            this.input = input;
            this.index = index || 0;
            this.length = input.length - this.index;
            this.cache = { };
            return this;
        }

        ParseState.prototype.from = function(index) {
            var r = new ParseState(this.input, this.index + index);
            r.cache = this.cache;
            r.length = this.length - index;
            return r;
        }

        ParseState.prototype.substring = function(start, end) {
            return this.input.substring(start + this.index, (end || this.length) + this.index);
        }

        ParseState.prototype.trimLeft = function() {
            var s = this.substring(0);
            var m = s.match(/^\s+/);
            return m ? this.from(m[0].length) : this;
        }

        ParseState.prototype.at = function(index) {
            return this.input.charAt(this.index + index);
        }

        ParseState.prototype.toString = function() {
            return 'PS"' + this.substring(0) + '"';
        }

        ParseState.prototype.getCached = function(pid) {
            if(!mod.memoize)
                return false;

            var p = this.cache[pid];
            if(p)
                return p[this.index];
            else
                return false;
        }

        ParseState.prototype.putCached = function(pid, cached) {
            if(!mod.memoize)
                return false;

            var p = this.cache[pid];
            if(p)
                p[this.index] = cached;
            else {
                p = this.cache[pid] = { };
                p[this.index] = cached;
            }
        }
        return ParseState;
    })()

    mod.ps = function ps(str) {
        return new mod.ParseState(str);
    }

    // 'r' is the remaining string to be parsed.
    // 'matched' is the portion of the string that
    // was successfully matched by the parser.
    // 'ast' is the AST returned by the successfull parse.
    mod.make_result = function make_result(r, matched, ast) {
        return { remaining: r, matched: matched, ast: ast };
    }

    mod.parser_id = 0;

    // 'token' is a parser combinator that given a string, returns a parser
    // that parses that string value. The AST contains the string that was parsed.
    mod.token = function token(s) {
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var r = state.length >= s.length && state.substring(0,s.length) == s;
            if(r)
                cached = { remaining: state.from(s.length), matched: s, ast: s };
            else
                cached = false;
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // Like 'token' but for a single character. Returns a parser that given a string
    // containing a single character, parses that character value.
    mod.ch = function ch(c) {
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;
            var r = state.length >= 1 && state.at(0) == c;
            if(r)
                cached = { remaining: state.from(1), matched: c, ast: c };
            else
                cached = false;
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // 'range' is a parser combinator that returns a single character parser
    // (similar to 'ch'). It parses single characters that are in the inclusive
    // range of the 'lower' and 'upper' bounds ("a" to "z" for example).
    mod.range = function range(lower, upper) {
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            if(state.length < 1)
                cached = false;
            else {
                var ch = state.at(0);
                if(ch >= lower && ch <= upper)
                    cached = { remaining: state.from(1), matched: ch, ast: ch };
                else
                    cached = false;
            }
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // Helper function to convert string literals to token parsers
    // and perform other implicit parser conversions.
    mod.toParser = function toParser(p) {
        return (typeof(p) == "string") ? mod.token(p) : p;
    }

    // Parser combinator that returns a parser that
    // skips whitespace before applying parser.
    mod.whitespace = function whitespace(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            cached = p(state.trimLeft());
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // Parser combinator that passes the AST generated from the parser 'p'
    // to the function 'f'. The result of 'f' is used as the AST in the result.
    mod.action = function action(p, f) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var x = p(state);
            if(x) {
                x.ast = f(x.ast);
                cached = x;
            }
            else {
                cached = false;
            }
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // Given a parser that produces an array as an ast, returns a
    // parser that produces an ast with the array joined by a separator.
    mod.join_action = function join_action(p, sep) {
        return mod.action(p, function(ast) { return ast.join(sep); });
    }

    // Given an ast of the form [ Expression, [ a, b, ...] ], convert to
    // [ [ [ Expression [ a ] ] b ] ... ]
    // This is used for handling left recursive entries in the grammar. e.g.
    // MemberExpression:
    //   PrimaryExpression
    //   FunctionExpression
    //   MemberExpression [ Expression ]
    //   MemberExpression . Identifier
    //   new MemberExpression Arguments
    mod.left_factor = function left_factor(ast) {
        return mod.foldl(function(v, action) {
                         return [ v, action ];
                     },
                     ast[0],
                     ast[1]);
    }

    // Return a parser that left factors the ast result of the original
    // parser.
    mod.left_factor_action = function left_factor_action(p) {
        return mod.action(p, mod.left_factor);
    }

    // 'negate' will negate a single character parser. So given 'ch("a")' it will successfully
    // parse any character except for 'a'. Or 'negate(range("a", "z"))' will successfully parse
    // anything except the lowercase characters a-z.
    mod.negate = function negate(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            if(state.length >= 1) {
                var r = p(state);
                if(!r)
                    cached =  mod.make_result(state.from(1), state.at(0), state.at(0));
                else
                    cached = false;
            }
            else {
                cached = false;
            }
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // 'end' is a parser that is successful if the input string is empty (ie. end of parse).
    mod.end = function end(state) {
        if(state.length == 0)
            return mod.make_result(state, undefined, undefined);
        else
            return false;
    }
    mod.end_p = mod.end;

    // 'nothing' is a parser that always fails.
    mod.nothing = function nothing(state) {
        return false;
    }
    mod.nothing_p = mod.nothing;

    // 'sequence' is a parser combinator that processes a number of parsers in sequence.
    // It can take any number of arguments, each one being a parser. The parser that 'sequence'
    // returns succeeds if all the parsers in the sequence succeeds. It fails if any of them fail.
    mod.sequence = function sequence() {
        var parsers = [];
        for(var i = 0; i < arguments.length; ++i)
            parsers.push(mod.toParser(arguments[i]));
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached) {
                return cached;
            }

            var ast = [];
            var matched = "";
            var i;
            for(i=0; i< parsers.length; ++i) {
                var parser = parsers[i];
                var result = parser(state);
                if(result) {
                    state = result.remaining;
                    if(result.ast != undefined) {
                        ast.push(result.ast);
                        matched = matched + result.matched;
                    }
                }
                else {
                    break;
                }
            }
            if(i == parsers.length) {
                cached = mod.make_result(state, matched, ast);
            }
            else
                cached = false;
            savedState.putCached(pid, cached);
            return cached;
        };
    }

    // Like sequence, but ignores whitespace between individual parsers.
    mod.wsequence = function wsequence() {
        var parsers = [];
        for(var i=0; i < arguments.length; ++i) {
            parsers.push(mod.whitespace(mod.toParser(arguments[i])));
        }
        return mod.sequence.apply(null, parsers);
    }

    // 'choice' is a parser combinator that provides a choice between other parsers.
    // It takes any number of parsers as arguments and returns a parser that will try
    // each of the given parsers in order. The first one that succeeds results in a
    // successfull parse. It fails if all parsers fail.
    mod.choice = function choice() {
        var parsers = [];
        for(var i = 0; i < arguments.length; ++i)
            parsers.push(mod.toParser(arguments[i]));
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached) {
                return cached;
            }
            var i;
            for(i=0; i< parsers.length; ++i) {
                var parser=parsers[i];
                var result = parser(state);
                if(result) {
                    break;
                }
            }
            if(i == parsers.length)
                cached = false;
            else
                cached = result;
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // 'butnot' is a parser combinator that takes two parsers, 'p1' and 'p2'.
    // It returns a parser that succeeds if 'p1' matches and 'p2' does not, or
    // 'p1' matches and the matched text is longer that p2's.
    // Useful for things like: butnot(IdentifierName, ReservedWord)
    mod.butnot = function butnot(p1,p2) {
        var p1 = mod.toParser(p1);
        var p2 = mod.toParser(p2);
        var pid = mod.parser_id++;

        // match a but not b. if both match and b's matched text is shorter
        // than a's, a failed match is made
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var br = p2(state);
            if(!br) {
                cached = p1(state);
            } else {
                var ar = p1(state);

                if (ar) {
                  if(ar.matched.length > br.matched.length)
                      cached = ar;
                  else
                      cached = false;
                }
                else {
                  cached = false;
                }
            }
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // 'difference' is a parser combinator that takes two parsers, 'p1' and 'p2'.
    // It returns a parser that succeeds if 'p1' matches and 'p2' does not. If
    // both match then if p2's matched text is shorter than p1's it is successfull.
    mod.difference = function difference(p1,p2) {
        var p1 = mod.toParser(p1);
        var p2 = mod.toParser(p2);
        var pid = mod.parser_id++;

        // match a but not b. if both match and b's matched text is shorter
        // than a's, a successfull match is made
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var br = p2(state);
            if(!br) {
                cached = p1(state);
            } else {
                var ar = p1(state);
                if(ar.matched.length >= br.matched.length)
                    cached = br;
                else
                    cached = ar;
            }
            savedState.putCached(pid, cached);
            return cached;
        }
    }


    // 'xor' is a parser combinator that takes two parsers, 'p1' and 'p2'.
    // It returns a parser that succeeds if 'p1' or 'p2' match but fails if
    // they both match.
    mod.xor = function xor(p1, p2) {
        var p1 = mod.toParser(p1);
        var p2 = mod.toParser(p2);
        var pid = mod.parser_id++;

        // match a or b but not both
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var ar = p1(state);
            var br = p2(state);
            if(ar && br)
                cached = false;
            else
                cached = ar || br;
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // A parser combinator that takes one parser. It returns a parser that
    // looks for zero or more matches of the original parser.
    mod.repeat0 = function repeat0(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;

        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached) {
                return cached;
            }

            var ast = [];
            var matched = "";
            var result;
            while(result = p(state)) {
                ast.push(result.ast);
                matched = matched + result.matched;
                if(result.remaining.index == state.index)
                    break;
                state = result.remaining;
            }
            cached = mod.make_result(state, matched, ast);
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // A parser combinator that takes one parser. It returns a parser that
    // looks for one or more matches of the original parser.
    mod.repeat1 = function repeat1(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;

        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;

            var ast = [];
            var matched = "";
            var result= p(state);
            if(!result)
                cached = false;
            else {
                while(result) {
                    ast.push(result.ast);
                    matched = matched + result.matched;
                    if(result.remaining.index == state.index)
                        break;
                    state = result.remaining;
                    result = p(state);
                }
                cached = mod.make_result(state, matched, ast);
            }
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // A parser combinator that takes one parser. It returns a parser that
    // matches zero or one matches of the original parser.
    mod.optional = function optional(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;
            var r = p(state);
            cached = r || mod.make_result(state, "", false);
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // A parser combinator that ensures that the given parser succeeds but
    // ignores its result. This can be useful for parsing literals that you
    // don't want to appear in the ast. eg:
    // sequence(expect("("), Number, expect(")")) => ast: Number
    mod.expect = function expect(p) {
        return mod.action(p, function(ast) { return undefined; });
    }

    mod.chain = function chain(p, s, f) {
        var p = mod.toParser(p);

        return mod.action(mod.sequence(p, mod.repeat0(mod.action(mod.sequence(s, p), f))),
                      function(ast) { return [ast[0]].concat(ast[1]); });
    }

    // A parser combinator to do left chaining and evaluation. Like 'chain', it expects a parser
    // for an item and for a seperator. The seperator parser's AST result should be a function
    // of the form: function(lhs,rhs) { return x; }
    // Where 'x' is the result of applying some operation to the lhs and rhs AST's from the item
    // parser.
    mod.chainl = function chainl(p, s) {
        var p = mod.toParser(p);
        return mod.action(mod.sequence(p, mod.repeat0(mod.sequence(s, p))),
                      function(ast) {
                          return mod.foldl(function(v, action) { return action[0](v, action[1]); }, ast[0], ast[1]);
                      });
    }

    // A parser combinator that returns a parser that matches lists of things. The parser to
    // match the list item and the parser to match the seperator need to
    // be provided. The AST is the array of matched items.
    mod.list = function list(p, s) {
        return mod.chain(p, s, function(ast) { return ast[1]; });
    }

    // Like list, but ignores whitespace between individual parsers.
    mod.wlist = function wlist() {
        var parsers = [];
        for(var i=0; i < arguments.length; ++i) {
            parsers.push(mod.whitespace(arguments[i]));
        }
        return mod.list.apply(null, parsers);
    }

    // A parser that always returns a zero length match
    mod.epsilon_p = function epsilon_p(state) {
        return mod.make_result(state, "", undefined);
    }

    // Allows attaching of a function anywhere in the grammer. If the function returns
    // true then parse succeeds otherwise it fails. Can be used for testing if a symbol
    // is in the symbol table, etc.
    mod.semantic = function semantic(f) {
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;
            cached = f() ? mod.make_result(state, "", undefined) : false;
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // The and predicate asserts that a certain conditional
    // syntax is satisfied before evaluating another production. Eg:
    // sequence(and("0"), oct_p)
    // (if a leading zero, then parse octal)
    // It succeeds if 'p' succeeds and fails if 'p' fails. It never
    // consume any input however, and doesn't put anything in the resulting
    // AST.
    mod.and = function and(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;
            var r = p(state);
            cached = r ? mod.make_result(state, "", undefined) : false;
            savedState.putCached(pid, cached);
            return cached;
        }
    }

    // The opposite of 'and'. It fails if 'p' succeeds and succeeds if
    // 'p' fails. It never consumes any input. This combined with 'and' can
    // be used for 'lookahead' and disambiguation of cases.
    //
    // Compare:
    // sequence("a",choice("+","++"),"b")
    //   parses a+b
    //   but not a++b because the + matches the first part and peg's don't
    //   backtrack to other choice options if they succeed but later things fail.
    //
    // sequence("a",choice(sequence("+", not("+")),"++"),"b")
    //    parses a+b
    //    parses a++b
    //
    mod.not = function not(p) {
        var p = mod.toParser(p);
        var pid = mod.parser_id++;
        return function(state) {
            var savedState = state;
            var cached = savedState.getCached(pid);
            if(cached)
                return cached;
            cached = p(state) ? false : mod.make_result(state, "", undefined);
            savedState.putCached(pid, cached);
            return cached;
        }
    }


    // For ease of use, it's sometimes nice to be able to not have to prefix all
    // of the jsparse functions with `jsparse.` and since the original version of
    // this library put everything in the toplevel namespace, this makes it easy
    // to use this version with old code.
    //
    // The only caveat there is that changing `memoize` MUST be done on
    // jsparse.memoize
    //
    // Typical usage:
    //   jsparse.inject_into(window)
    //
    mod.inject_into = function inject_into(into) {
        for (var key in mod) {
            if (typeof mod[key] === 'function') {
                into[key] = mod[key];
            }
        }
    }

    // Support all the module systems.
    if ( typeof module === "object" && typeof module.exports === "object" ) {
        module.exports = mod;

    } else if ( typeof define === "function" && define.amd ) {
        define( "jsparse", [], function () { return mod; } );

    } else if ( typeof window === "object" && typeof window.document === "object" ) {
        window.jsparse = mod;

    } else {
        throw 'could not find valid method to export jsparse';
    }
})());
