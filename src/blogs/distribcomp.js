import React from 'react';
import Sharer from "../sharer";

import Gist from 'super-react-gist';

import '../styles/fonts.css';
import '../styles/blog.css';

export default class DistribComp extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
    }
    render() {
        return (
            <div className="language-go">
                <div className="row bhead">
                    <i className="fas fa-network-wired bigger gt1"></i>
                </div>
                <h1 className="title">Distributed Computing with MapReduce</h1>
                <p>Pranshu Gupta, May 20, 2020</p>
                <Sharer link={window.location.href} title={"Distributed Computing with MapReduce"}></Sharer>
                <br></br>
                <p className="introduction">
                    
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Distributed Computing</h2>
                <p>
                    
                </p>
                <h2 className="headings">MapReduce</h2>
                <p>
                    
                </p>
                <div>
                    {/* <Gist url="https://gist.github.com/Pranshu258/c1ad56f279d5741a1f1adc110acaff44" file="request_headers.py" /> */}
                </div>
                <br></br>
                <hr style={{ backgroundColor: "white" }}></hr>
                <div>
                    <svg width="48" viewBox="0 0 73 39" version="1.1" xmlns="http://www.w3.org/2000/svg" className="mit-logo site-nav__logo">
                        <polygon className="logo-color--primary" points="52.785 8.063 72.785 8.063 72.785 0.063 52.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="13.785 26.063 21.785 26.063 21.785 0.063 13.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="26.785 38.063 34.785 38.063 34.785 0.063 26.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="0.785 38.063 8.785 38.063 8.785 0.063 0.785 0.063"></polygon>
                        <polygon className="logo-color--primary" points="52.785 38.063 60.785 38.063 60.785 13.063 52.785 13.063"></polygon>
                        <polygon className="logo-color--primary" points="39.785 8.063 47.785 8.063 47.785 0.063 39.785 0.063"></polygon>
                        <polygon className="logo-color--secondary" points="40 38 48 38 48 13 40 13"></polygon>
                    </svg>
                    <br></br>
                    <p>6.824 Distributed Systems, <a href="https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB">Video Lectures (YouTube)</a>, <a href="https://pdos.csail.mit.edu/6.824/">Course Details</a></p>
                    
                </div>
            </div >
        )
    }
}