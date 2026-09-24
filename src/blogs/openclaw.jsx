import React from 'react';
import Sharer from '../sharer';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import AntForagingVisualization from '../antcolony/AntForagingVisualization';
import { FaBugs, FaCode, FaChevronDown, FaHeart } from 'react-icons/fa6';
import { GiCrabClaw } from "react-icons/gi";
import { SiClaude } from 'react-icons/si';
import Prism from 'prismjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/prism.css';
import '../styles/blog.css';
import logo from '../images/openclaw-dark.svg'

export default class OpenClawBlog extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "OpenClaw | blog by Pranshu Gupta";
        setTimeout(() => Prism.highlightAll(), 0);
    }

    render() {
        return (
            <div className="blog-content">
                <div className="row bhead">
                    <img src={logo} alt="OpenClaw Logo" className="gt1" style={{ height: '96px', width: 'auto' }} />
                </div>
                <h1 className="title">Diving into OpenClaw</h1>
                <p>Pranshu Gupta, {this.props.date}</p>
                <Sharer className="sharer" link={window.location.href} title={"Diving into OpenClaw"}></Sharer>
                <p className="introduction">
                    Nature is often the best optimizer. Many natural systems converge to efficient equilibria,
                    and computer scientists have long tried to model those dynamics algorithmically. Ant Colony
                    Optimization (ACO) is one such family of methods: simple agents exchange indirect signals and
                    collectively discover high-quality paths. These ideas are especially useful for hard combinatorial
                    problems, including the Traveling Salesman Problem.
                </p>
                <hr style={{ backgroundColor: "white" }} />

                
                <hr style={{ backgroundColor: "white" }} />
                <h2 className="headings" style={{ marginTop: '18px' }}>References</h2>
                <ol>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/585892">Dorigo, M., &amp; Gambardella, L. M. (1997). Ant colony system: A cooperative learning approach to the traveling salesman problem. <i>IEEE Transactions on Evolutionary Computation, 1(1)</i>, 53–66.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/1597059">Dorigo, M., Birattari, M., &amp; Stutzle, T. (2006). Ant colony optimization — artificial ants as a computational intelligence technique. <i>IEEE Computational Intelligence Magazine, 1(4)</i>, 28–39.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://books.google.com/books?vid=ISBN9780195131598">Bonabeau, E., Dorigo, M., &amp; Theraulaz, G. (1999). <i>Swarm Intelligence: From Natural to Artificial Systems</i>. Oxford University Press.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://arxiv.org/abs/1903.01893">Gupta, P. (2019). Algorithms inspired by nature: A survey. <i>arXiv:1903.01893 [cs.NE]</i>.</a></li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
                <p style={{ textAlign: 'center', opacity: 0.62, fontSize: '13px', letterSpacing: '0.5px', marginTop: '8px' }}>
                    written with <FaHeart style={{ color: '#e05', verticalAlign: 'middle', fontSize: '11px', margin: '0 2px' }} /> and <SiClaude style={{ verticalAlign: 'middle', fontSize: '13px', margin: '0 3px 0 2px', color: '#D97757' }} /> claude sonnet
                </p>
            </div>
        );
    }
}
