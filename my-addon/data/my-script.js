// Get the source code of the web page for evaluating Scheme script
var generatedSource = new XMLSerializer().serializeToString(document);

// Build parser for parsing Scheme code. Parser is being built based on the provided grammar rules

var parser = PEG.buildParser(
' start = expression;\
  validchar = [a-zA-Z_?!+\\-=@#$%^&*/.];\
  spaces = \" \"*;\
  newline = [\\n]*;\
  digit = [0-9];\
  atom =    spaces newline chars:validchar+ spaces newline   { return chars.join(\"\"); }\
          / spaces newline numbers:digit+ spaces newline     { return parseInt(numbers.join(\"\")); };\
  list =    spaces newline \"(\" spaces newline expressions:expression+ newline spaces\")\" { return expressions; };\
  expression = atom / list');

/**------------------------------------------------------------------------------------------**/

var SIGMA={};// Store Varible <- This variable stores the value of variables declared in scheme code.
/* For example
if scheme code is: (define x 6) then SIGMA will store  { x: 6 }
 */

// lookup method takes store and variable and it returns the value of that variable

var lookup = function (sigma, variable) {

     if ('value_is' in sigma)
    {
        if (variable in sigma.value_is)
        {
            return sigma.value_is[variable];
        }
        else
        {
            return lookup(sigma.scope, variable);
        }
    }
    else {
      throw new Error('Variable \''+variable+ '\' is not defined!!!');
    }

};

// function update updates the value of variable.
var update = function (sigma, variable, value) {
     if ('value_is' in sigma)
    {
        if (variable in sigma.value_is)
        {
            sigma.value_is[variable] = value;
            return 0;
        }
        else
        {
            update(sigma.scope, variable, value);
        }
    }
    else {
      throw new Error('Variable \''+variable+ '\' is not defined!!!');
    }

};
// function add_binding will add new variable with its value in store
var add_binding = function (sigma, variable, value) {

    //Check we're not already defined
    var up = sigma;
    while('value_is' in up)
    {
        if (variable in up.value_is)
        {
            throw new Error("Variable -> \'"+variable + "\' is being redefined");
        }
        up = up.scope;
    }

    if ('value_is' in sigma === false)
    {
        sigma.value_is = {};
        sigma.scope = {};
    }

    sigma.value_is[variable] = value;
};


// fucntiona Evaluate takes the expression and store and recursively evaluates this expression

var Evaluate = function (expr, sigma) {
    // Numbers evaluate to themselves
    if (typeof expr === 'number') {
        return expr;
    }
    // Strings are variable references
    if (typeof expr === 'string') {
        //return sigma[expr];
        return lookup(sigma, expr);
    }

    // Look for the the first expression.
    switch (expr[0]) {

      // Declare a variable.
        case 'define':
             add_binding(sigma, expr[1], Evaluate(expr[2], sigma));
             return 0;

      //Modify the value of declaration
        case 'set!' :

             update(sigma, expr[1], Evaluate(expr[2], sigma));
            return 0;

      // Begin construct is use to declare sequential statements
        case 'begin' :

          var temp;
          for (var i in expr)
          {
              if (i > 0)
              {
                  temp = Evaluate(expr[i], sigma);
              }
          }
          return temp;
      // lambda construct
          case 'lambda':

              return function() {
                  var value_is = {};
                  for (var i in expr[1])
                  {
                      value_is[expr[1][i]] = arguments[i];
                  }
                  return Evaluate(expr[expr.length - 1], {
                      value_is: value_is,
                      scope: sigma
                  });
              };
        case 'lambda-one':
          return function(param) {
                 var value_is = {};
                 value_is[expr[1]] = param;
                 return Evaluate(expr[2], {
                     value_is: value_is,
                     scope: sigma
                 });
             };
         case 'let-one':
              var value_is = {};
               value_is[expr[1]] = Evaluate(expr[2], sigma);

               return Evaluate(expr[3], {
                   value_is: value_is,
                   scope: sigma
               });

        // Conditional Statement:
        case 'if':
                var res= Evaluate(expr[1],sigma);
                if (res === '#t' )
                {
                    return Evaluate(expr[2],sigma);
                }
                else
                {
                    return Evaluate(expr[3],sigma);
                }

        case 'quote' :
                return expr[1];

        // arithmatic Operations
        case '*':

            return Evaluate(expr[1], sigma) *
                   Evaluate(expr[2], sigma);
        case '/':

            return Evaluate(expr[1], sigma) /
                   Evaluate(expr[2], sigma);
        case '+':

            return Evaluate(expr[1], sigma) +
                   Evaluate(expr[2], sigma);
        case '-':

            return Evaluate(expr[1], sigma) -
                   Evaluate(expr[2], sigma);

       //Comparasion Operators:
       case '<':

            var LT =(Evaluate(expr[1], sigma) < Evaluate(expr[2], sigma));
            if (LT) return '#t';
            return '#f';
        case '>':

            var GT =(Evaluate(expr[1], sigma) > Evaluate(expr[2], sigma));
            if (GT) return '#t';
            return '#f';
        case '<=':

            var LTE =(Evaluate(expr[1], sigma) <= Evaluate(expr[2], sigma));
            if (LTE) return '#t';
            return '#f';
        case '>=':

            var GTE =(Evaluate(expr[1], sigma) >= Evaluate(expr[2], sigma));
            if (GTE) return '#t';
            return '#f';
        case '=':

            var EQ =(Evaluate(expr[1], sigma) === Evaluate(expr[2], sigma));
            if (EQ) return '#t';
            return '#f';

        //Operations on list

        //cons takes an element and a list and returns a new list with new element at the head of previous
        case 'cons':

            var rest= Evaluate(expr[2],sigma);
            rest.unshift(Evaluate(expr[1],sigma));
            return rest;
        // car takes a list and returns a first element from that list
        case 'car' :

            var head= Evaluate(expr[1],sigma);
            return head[0];
        //cdr takes a list and returns a list except the first element
        case 'cdr' :

            var last= Evaluate(expr[1],sigma);
            return last.slice(1);

        default:
               // New stuff here
            var args = expr.slice(1);
                   //Flatten
            for (var arg in args)
            {
                args[arg] = Evaluate(args[arg], sigma);
            }
            return Evaluate(expr[0], sigma).apply(null, args);
    }
};


// Look for script tag with scheme in the page source
var pattern_for_scheme= /<script type="text\/scheme"\s*>.*?<\/script>/gi;
// variable matches contains list of the source codes
var matches = generatedSource.match(pattern_for_scheme);
var result = "";
var res;
for (var i in matches){
  result += "Match:" + matches[i] + "\n";
  s= matches[i];
  s=s.replace(/<script type="text\/scheme"\s*?>/ig,"");
  s=s.replace(/<\/script>/ig,"");
  s=s.trim();
  var AST= parser.parse(s);
  console.log("Code: "+s);
  console.log("AST is:"+ AST);
  // evaluate every script tag
  SIGMA={};
  res=Evaluate(AST,SIGMA);
  console.log("\nEvaluating Scheme Program: "+res);
  //console.log("Evaluating Scheme program:"+ Evaluate(AST,SIGMA));
  //write back result to web page
  document.body.innerHTML = document.body.innerHTML+ "<div>Result of Scheme program is: "+res+"</div>";

}
