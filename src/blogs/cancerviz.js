import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import cdclogo from '../images/cdclogo.png';
import datagovlogo from '../images/datagov.png';

const markdown = `
## Introduction
`;

export default class CancerViz extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Exploring cancer incidence data from CDC | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-staff-snake bigger gt1"></i>
                </div>
                <h1 className="title">Exploring cancer incidence data from CDC</h1>
                <p>Pranshu Gupta, Dec 5, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Exploring cancer incidence data from CDC"}></Sharer>
                <p className="introduction">
                    The United States Cancer Statistics (USCS) online databases in WONDER provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends and patterns in cancer incidences across the United States of America for leading cancer sites in the human body.
                    <br></br>
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <ReactMarkdown remarkPlugins={[remarkGfm]} children={markdown}></ReactMarkdown>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h5>Acknowledgements</h5>
                <p>This article was made possible by the public data provided by the Centers for Disease Control and Prevention (CDC) and the data.gov initiative.</p>
                <img src={cdclogo} style={{height: '40px', marginRight: '10px'}} alt="CDC Logo" className="img-fluid"></img>
                <img src={datagovlogo} style={{height: '40px', marginRight: '10px'}} alt="data gov Logo" className="img-fluid"></img>
                <hr style={{ backgroundColor: "white" }}></hr>
            </div>
        )
    }
}