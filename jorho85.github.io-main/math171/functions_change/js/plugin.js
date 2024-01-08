import {KaTeX} from "js/katex";
import {MathJax2} from "js/mathjax2";
import {MathJax3} from "js/mathjax3";
const defaultTypesetter = MathJax2;
export default Plugin = Object.assign(defaultTypesetter(), {KaTeX,MathJax2,MathJax3});