import{R as t,j as e,q as r}from"./index-B-Jn5NXm.js";import{S as s}from"./sharer-NSgHI0Gy.js";import{P as a}from"./prism-GpaqQrGD.js";class c extends t.Component{componentDidMount(){window.scrollTo(0,0),document.title="Quirks of JavaScript - The Language of the Web | blog by Pranshu Gupta",a.highlightAll()}render(){return e.jsxs("div",{className:"language-javascript",children:[e.jsx("div",{className:"row bhead",children:e.jsx(r,{className:"bigger gt1"})}),e.jsxs("h1",{className:"title",children:["Quirks of JavaScript - ",e.jsx("br",{}),"The Language of the Web"]}),e.jsx("p",{children:"Pranshu Gupta, June 5, 2017"}),e.jsx(s,{link:window.location.href,title:"Quirks of JavaScript - The Language of the Web"}),e.jsx("p",{className:"introduction",children:"JavaScript is one of the most widely used programing languages in the world. It is the langauge that drives almost all the client side code on the internet. However, it has become a language which most people use but don't love. One of the main reasons behind this is that most people don't know the language well enough to appreciate its edge cases. In this article we will discuss some of these edge cases and try to understand why things are the way they are!"}),e.jsx("hr",{style:{backgroundColor:"white"}}),e.jsx("h3",{className:"headings",children:"The Abstract Equality Operator"}),e.jsx("p",{className:"montserrat",children:"JavaScript has two equality operators the Abstract Equality Operator '==' and Strict Equality Operator '==='. The abstract equality expressions are evaluated as per the abstract equality comparison algorithm. Let's look at some examples:"}),e.jsx("pre",{children:e.jsx("code",{children:`"2" == 2
true    // "2" is typcasted to a number
true == 1
true    // true is typcasted to a number`})}),e.jsx("p",{children:"As we can see, the abstract inequality operator does some implicit type conversions to get these results. This is fine, let's consider the following expressions:"}),e.jsx("pre",{children:e.jsx("code",{children:`true == []
false
![]
false`})}),e.jsxs("p",{children:["In the first example true is converted to a number i.e 1 and then [] is converted to its primitive form in this case a number i.e. 0. But then what happened in the second one? It turns out that in JS only 5 values when typecasted to boolean evaluate to false, they are: ",e.jsx("code",{children:'"", null, undefined, 0, false'}),". Others evaluate to true - such as ",e.jsx("code",{children:"[]"})," and ",e.jsx("code",{children:"{}"}),". Thus, resulting in the above behavior. Let's look at another example:"]}),e.jsx("pre",{children:e.jsx("code",{children:`[] == []
false`})}),e.jsxs("p",{children:["Now this is a good one, here ",e.jsx("code",{children:"[]"})," is an object and objects are always compared by reference, not by their value. Again in the following example"]}),e.jsx("pre",{children:e.jsx("code",{children:`[] == ![]
true`})}),e.jsxs("p",{children:["Here, the comparison is not happening between two objects. The RHS is first typecasted to a boolean i.e. ",e.jsx("code",{children:"false"}),". Then it is typecasted to a number i.e. 0. On the other hand, the LHS is typecasted to a number i.e. 0. Hence,the result is ",e.jsx("code",{children:"true"})]}),e.jsxs("p",{className:"montserrat",children:["Read more about The Abstract Equality Comparison Algorithm ",e.jsx("a",{href:"https://www.ecma-international.org/ecma-262/5.1/#sec-11.9.3",target:"_blank",rel:"noopener noreferrer",children:"here"}),"."]}),e.jsx("h3",{className:"headings",children:"Floating Point Math"}),e.jsxs("p",{className:"montserrat",children:["All the numbers is JavaScript (and other languages) are represented on the hardware using the IEEE 754 Standard for Floating Point Arithmetic. Javascript uses the 64 bit representation. Now, when representing decimal numbers in binary, any fraction whose denominator is not a power of two can not be represented exactly in binary. This forces the language to make approximations. Consider the expression ",e.jsx("code",{children:"0.2 + 0.1 == 0.3"}),", ideally it should evaluate to ",e.jsx("code",{children:"true"}),". However, because the binary representations of 0.1 and 0.2 are slightly larger than the true value and on the other hand the binary represenation of 0.3 is smaller than the true value, we get ",e.jsx("code",{children:"false"})," as the output. The number closest to 0.1 if we use double precision floating point representation is:"]}),e.jsx("pre",{children:e.jsx("code",{children:"0.1000000000000000055511151231257827021181583404541015625"})}),e.jsx("pre",{children:e.jsx("code",{children:`0.2 + 0.1 == 0.3
false
0.2 + 0.1
0.30000000000000004`})}),e.jsx("p",{children:"Therefore, this is not a problem with the language, but an inadequacy of the representation in hardware"}),e.jsx("h3",{className:"headings",children:"Strings and Numbers"}),e.jsxs("p",{className:"montserrat",children:["The expression ",e.jsx("code",{children:'"Hello" + 3'}),' evaluates to "Hello3", because the number 3 gets implicitly cast to a string and then it is concatenated to the string "Hello". What if we subtract a number from a string? e.g. ',e.jsx("code",{children:'"Hello" - 3'}),". In this case, we get ",e.jsx("code",{children:"NaN"}),`. Well, that's ok, subtracting two strings doesn't make "that" much sense. Let's do the following:`,e.jsx("pre",{children:e.jsx("code",{children:`"1" - 3
-2
"1" - -3
4`})}),"This time the left operand was typecasted to a number and thus the first expression evaluated to -2 and the second to 4. So, it turns out that JavaScript coerces a string to a number in subtraction operations and a number to a string in addition operations. See the following examples (left to right evaluation):"]}),e.jsx("pre",{children:e.jsx("code",{children:`"5" + 1 - 3
48
"5" - 3 + 1
3
-3 + "5" + 1
'-351'
1 + "5" - 3
12
-3 + 1 + "5"
'-25'
1 - 3 + "5"
'-25'`})}),e.jsx("h3",{className:"headings",children:"Objects and Addition Operator"}),e.jsx("p",{children:"In JavaScript the '+' operator either adds two numbers or concatenates two strings. If we add other things they are first converted to their primitive forms, if these forms are numbers then they are added, otherwise they are converted to strings and concatenated."}),e.jsx("pre",{children:e.jsx("code",{children:`[] + []
''
{} + {}
'[object Object][object Object]'
[] + {}
'[object Object]'`})}),e.jsx("p",{children:"These are expected results. But things are not so straight forward in JavaScript. Look at the following example:"}),e.jsx("pre",{children:e.jsx("code",{children:`{} + []
0`})}),e.jsxs("p",{children:["What happened here? In this case, the left operand ",e.jsx("code",{children:"{}"})," is parsed as an empty code block rather than an empty object. Then the empty array is implicitly typecasted to a number i.e. 0, which gives the observed result. Similarly:"]}),e.jsx("pre",{children:e.jsx("code",{children:`{} + [2]
2
{} + ['2']
2
{} + [22, 23]
NaN     // An array with more than one element can not be typecasted to a number`})}),e.jsx("pre",{children:e.jsx("code",{children:`[2] + {}
'2[object Object]'`})}),e.jsxs("p",{children:["In the above example, ",e.jsx("code",{children:"{}"})," is parsed as an object and hence, converted into its primitive form and then to a string. This string is then concatenated with the string that we get from the array. Smilarly:"]}),e.jsx("pre",{children:e.jsx("code",{children:`[2, 3] + {}
'2,3[object Object]'`})}),e.jsx("p",{}),e.jsx("h3",{className:"headings",children:"Closures in Loops"}),e.jsx("p",{children:"A closure is an inner function that has access to the outer (enclosing) function’s variables. A closure has access to its own scope (variables defined between its curly brackets), it has access to the outer function’s variables, and  the global variables."}),e.jsx("p",{children:`In the following example, we have created two closures addOne and addTwo, with the help of the outer function "createAdder". Inside "createAdder", we have defined the 'addxto' function which is returned (as a function) to the caller. The behavior of the addxto function is determined by the value of "toAdd" variable which the caller send as an argument to the "createAdder" function`}),e.jsx("pre",{children:e.jsx("code",{children:`function createAdder(x) {    
    var addNumber = x    
    function addxto(y) {    
        return addNumber + y    
    }    
    return addxto    
}
    
var addOne = createAdder(1)    
var addTwo = createAdder(2)    
    
console.log(addOne(1))    
console.log(addTwo(1))`})}),e.jsx("p",{children:'Both the closures are defined on the basis of addxto, however, they refer to different scope instances of createAdder i.e. they refer to different instances of "addNumber" variable. So, they behave differently and we get the output:'}),e.jsx("pre",{children:e.jsx("code",{children:`2
3`})}),e.jsx("p",{children:'In the following example, the outer function is same as the previous one, but we have made some changes in the inner. Here, the innner function returns an object with two members, one is the result of the addition the other is a function that can be used to change the value of "addNumber". Also, we change the value of addNumber using the member function from addOne closure. Note that because addOne and addTwo refer to different instances of "addNumber", only the value of addNumber for addOne will change and not for addTwo. This is because closures point to the parent scope by reference and not by value.'}),e.jsx("pre",{children:e.jsx("code",{children:`function createAdder(x) {                        
    var addNumber = x
    function addxto(y) {
        return {
                "result": addNumber + y,
                "changeAddNumber": function setAddNumber(z) {
                addNumber = z
            }
        }
    }
    return addxto
}

var addOne = createAdder(1)
var addTwo = createAdder(2)

console.log(addOne(1).result)
console.log(addTwo(1).result)

addOne().changeAddNumber(20)

console.log(addOne(1).result)
console.log(addTwo(1).result)`})}),e.jsx("p",{children:"Therefore, the output will be:"}),e.jsx("pre",{children:e.jsx("code",{children:`2
3
21
3`})}),e.jsx("p",{children:`In the following example, "myAdders" is and ARRAY of FUNCTIONS (closures). All of these closures were created in a single call to the outer function. That's why they refer to a single scope instance. Now, because the closures point to parent scope by reference, so if we somehow change the value of i for some closure, the behavior for that closure will change. In this case, all the ten closures point to the same "i", because we have only one "i" in the outer function. When the first closure is created, the value of i is 0, it becomes 1 for the creation of the second closure. But this changes the value of i for the first closure as well, because they share the same scope. So when all the closures have been created, the for loop ends and the value of i is finally 10. Now, when we call any of the closures (in line 13, 14, 15), we don't get the expected output because i is 10 for all of them, so the output is 11 for all the three calls.`}),e.jsx("pre",{children:e.jsx("code",{children:`function createAdders() {
    adders = []
    for (var i = 0; i < 10; i++) {
        adders[i] = function (x) {
            return x + i;
        }
    }
    return adders
}

myAdders = createAdders()

console.log(myAdders[0](1))
console.log(myAdders[1](1))
console.log(myAdders[2](1))`})}),e.jsx("p",{children:'Now, if we want to create closures using a loop, then we can enable block based scoping with the help of the let keyword. This creates a different lexical scope in each iteration of the loop. So the closures point to different scope instances of the same variable "i". This will give us the result we expected. (1, 2 and 3)'}),e.jsx("pre",{children:e.jsx("code",{children:`function createAdders() {
    adders = []
    for (let i = 0; i < 10; i++) {
        adders[i] = function (x) {
            return x + i;
        }
    }
    return adders
}

myAdders = createAdders()

console.log(myAdders[0](1))
console.log(myAdders[1](1))
console.log(myAdders[2](1))`})}),e.jsx("br",{}),e.jsx("br",{})]})}}export{c as default};
