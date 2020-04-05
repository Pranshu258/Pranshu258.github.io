import React from 'react';
import { Route, Link } from "react-router-dom";

import { blogList } from './data/blogs'

import './styles/fonts.css';
import './styles/body.css';

import art2 from './images/img2.jpg';
import art3 from './images/img12.jpg';
import art4 from './images/img13.jpg';
import art5 from './images/img14.jpg';

import photo1 from './images/photo1.jpg';
import photo2 from './images/photo2.jpg';
import photo3 from './images/photo3.jpg';
import photo4 from './images/photo4.jpg';

import About from "./about";

export default class Body extends React.Component {
    render() {
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        console.log(blogList.length);
        return (
            <div className="body content">
                <div className="container">
                    <About />
                    <hr></hr>
                    <div className="row">
                        <div className="col-md-4">
                            <br></br><br></br>
                            <h1 className="roboto">
                                BLOG
                            </h1>
                        </div>
                        <div className="col-md-8">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    blogList.map((object, i) => 
                                        <div>
                                            <div className="featuredText">
                                                <Link className="blogLink" to={"blog/"+object.name.replace(/\s+/g, '-').toLowerCase()}>
                                                    <h3 className="roboto">{object.name}</h3>
                                                </Link>
                                                <p>{object.description}</p>
                                                {object.tags.map((tag, j) => <span className="blogpill">{tag}</span>)}
                                            </div>
                                            {i < blogList.length-1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row">
                        <div className="col-md-4">
                            <br></br><br></br>
                            <h1 className="roboto">
                                PROJECTS
                            </h1>
                        </div>
                        <div className="col-md-8">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                <div className="featuredText">
                                    <h3 className="roboto">Deep Image Captioning</h3>
                                    <p>Image Captioning is the task of assigning a short textual description to an image. New techniques have emerged recently in which reinforcement learning is employed on top of state of the art models to achieve better results. This project is an attempt to reproduce "Deep reinforcement learning-based captioning with embedding reward" by Ren et. al.</p>
                                    <span className="projectpill">Reinforcement Learning</span>
                                    <span className="projectpill">Deep Learning</span>
                                    <span className="projectpill">Pytorch</span>
                                </div>
                                <hr></hr>
                                <div className="featuredText">
                                    <h3 className="roboto">Image Completion with Statistics of Patch Offsets</h3>
                                    <p>Image Completion is the task of filling missing parts of a given image with the help of information from the known parts of the image. Implemented an application that takes an image with a missing part as input and gives a completed image as the result.</p>
                                    <span className="projectpill">Computer Vision</span>
                                    <span className="projectpill">Image Processing</span>
                                    <span className="projectpill">OpenCV</span>
                                </div>
                                <hr></hr>
                                <div className="featuredText">
                                    <h3 className="roboto">PyCS: A Compiler for C# in Python</h3>
                                    <p>A simple compiler for C# built using PLY (Python Lex-Yacc) and implements integers, loops, arrays, selection, functions, variable scopes and standard input and a few other semantics of the language</p>
                                    <span className="projectpill">Compiler Design</span>
                                    <span className="projectpill">Lex Yacc</span>
                                </div>
                                <hr></hr>
                                <div className="featuredText">
                                    <h3 className="roboto">Crowd Behavior Analysis based on Trajectories</h3>
                                    <p>Crowd behavior analysis is an important field of research in modern world. It has wide applications in surveillance and public safety. Implemented a system that takes a set of individual trajectories obtained from crowd data and detects the outliers to infer any abnormal behavior in the crowd.</p>
                                    <span className="projectpill">Artificial Intelligence</span>
                                </div>
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row">
                        <div className="col-md-4">
                            <br></br><br></br>
                            <h1 className="roboto">
                                ARTWORKS
                        </h1>
                        </div>
                        <div className="col-md-8">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                <div className="row">
                                    <div className="col-sm-6">
                                        <img alt="" src={art4} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col-sm-6">
                                        <img alt="" src={art5} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-sm-6">
                                        <img alt="" src={art2} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col-sm-6">
                                        <img alt="" src={art3} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                </div>
                            </div>
                            <br></br>
                            <br></br>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}