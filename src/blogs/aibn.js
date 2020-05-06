import React from 'react';
import Sharer from '../sharer';

import '../styles/fonts.css';
import '../styles/blog.css';

export default class Aibn extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0)
    }
    render() {
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div>
                <h1 className="title">Algorithms Inspired by Nature</h1>
                <p>Pranshu Gupta, Feb 22, 2019</p>
                <Sharer link={window.location.href}></Sharer>
                <br></br>
                <p className="introduction">
                    Nature is known to be the best optimizer. Natural processes most often than not reach an
                    optimal equilibrium. Scientists have always strived to understand and model such processes.
                    Thus, many algorithms exist today that are inspired by nature. Many of these algorithms
                    and heuristics can be used to solve problems for which no polynomial time algorithms exist,
                    such as Job Shop Scheduling and many other Combinatorial Optimization problems. We will
                    discuss some of these algorithms and heuristics and how they help us solve complex problems
                    of practical importance.
                </p>
                <a href="https://arxiv.org/pdf/1903.01893.pdf"><button className="btn btn-danger">Full PDF Article</button></a>
                <br></br><br></br>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Heuristics and Metaheuristics</h3>
                <p>
                    A heuristic can be thought of as a rule of thumb that will hopefully find a good solution for a given problem. These techniques are mainly applied to complex convex multivariate
                    constrained combinatorial optimization problems which are usually NP complete or harder.
                    </p>
                <p>
                    A metaheuristic is a higher-level procedure or heuristic designed to nd, generate,
                    or select a heuristic that may provide a succiently good solution to an optimization problem,
                    especially with incomplete or imperfect information or limited computation capacity." [Bianchi
                    et al. (2009)]
                    </p>
                <h3 className="headings">Ant Colony Optimization</h3>
                <p>
                    Ant Colony Optimization utilizes a family of heuristics inspired by the foraging behavior of
                    Ants. Ants are highly co-operative social insects, they search for food in huge groups and com-
                    municate indirectly using a chemical called pheromone. These heuristics model individual ants
                    as independent solution nders roaming in the solution space of a problem and communicating
                    via a shared variable(s) i.e. the pheromone.
                    </p>
                <h3 className="headings">Simulated Annealing</h3>
                <p>
                    When a liquid is cooled slowly, its particles arrange themselves in some configuration that
                    allows minimum energy state - this process is called annealing. Simulated Annealing tries to
                    model this phenomenon by drawing an analogy between between the behavior of multi-body
                    systems (e.g. liquids) in thermal equilibrium at a nite temperature and the behaviour of the
                    objective function of a combinatorial optimization problem at different values of the variables
                    involved. [Kirkpatrick et al. (1983)]
                    </p>
                <h3 className="headings">Particle Swarm Optimization</h3>
                <p>
                    Particle Swarm Optimization is a another optimization heuristic. It relies on a swarm of
                    particles that are initialized with some configuration in the solution space of a given prob-
                    lem. These particles then explore the solution space individually while communicating with
                    other particles around them to nd the best solution. After some iterations these particles
                    are expected to make swarms around optimal solution(s). PSO relies on randomization in the
                    movement of particles to avoid getting stuck in local optima.
                    </p>
                <h3 className="headings">Evolutionary Algorithms</h3>
                <p>
                    Evolutionary Algorithms are a family of algorithms inspired from Neo-Darwinism paradigm
                    of biological evolution.
                    </p>
                <p style={{ textAlign: "center", border: "solid black", padding: "10px" }}>
                    Neo-Darwininsm = Darwinism + Selectionism + Mendelian Genetics
                    </p>
                <p>
                    These algorithms model solutions as individual species with their genetic code representing
                    the solution itself. These individuals later reproduce to create new individuals with different
                    genetic code. Reproduction involves choosing healthy parents and then crossing over their genes
                    to create an offspring. The optimality of the solution instance represented by the genetic code
                    of the offspring determines its fifitness. Then the notion of "survival of the fifittest" comes into
                    play. The best individuals survive and then they reproduce for the next generational cycle.
                    Thus, this model utilizes both exploration and exploitation of the solution space.
                    Genetic Algorithms, Evolutionary Strategies, Differential Evolution etc., are a few variants
                    of EAs.
                    </p>
            </div>
        )
    }
}