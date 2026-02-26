import React from 'react';
import Sharer from '../sharer';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import AntForagingVisualization from '../antcolony/AntForagingVisualization';
import { FaArrowUpRightFromSquare as FaExternalLinkAlt, FaBugs } from 'react-icons/fa6';
import '../styles/blog.css';

export default class AntColonyOptimizationBlog extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Ant Colony Optimization | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div className="blog-content">
                <div className="row bhead">
                    <FaBugs className="bigger gt1" />
                </div>
                <h1 className="title">Ant Colony Optimization</h1>
                <p>Pranshu Gupta, February 25, 2026</p>
                <Sharer className="sharer" link={window.location.href} title={"Ant Colony Optimization"}></Sharer>
                <p className="introduction">
                    Nature is known to be the best optimizer. Natural processes most often than not reach an
                    optimal equilibrium. Scientists have always strived to understand and model such processes.
                    Thus, many algorithms exist today that are inspired by nature. Many of these algorithms
                    and heuristics can be used to solve problems for which no polynomial time algorithms exist,
                    such as the travelling salesman problem and many other Combinatorial Optimization problems.
                </p>
                <hr style={{ backgroundColor: "white" }} />
                {/* ── Foraging Simulation ────────────────────────────── */}
                <h2>Ant Colony Simulation</h2>
                <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                    <AntForagingVisualization />
                </div>
                <hr style={{ backgroundColor: "white" }} />
                <h2>Travelling Salesman Problem</h2>
                {/* ── TSP Solver ─────────────────────────────────────── */}
                <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                    <AntColonyVisualization />
                </div>
                <hr style={{ backgroundColor: "white" }} />
                <a href="https://arxiv.org/pdf/1903.01893.pdf"><button className="btn btn-danger">Read More &nbsp;<FaExternalLinkAlt /></button></a>
            </div>
        );
    }
}
