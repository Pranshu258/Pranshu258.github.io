import React from 'react';
import { Route, Link } from "react-router-dom";
import { blogList } from './data/blogs'
import { projectList } from './data/projects'

import './styles/fonts.css';
import './styles/body.css';

import art1 from './images/img1.jpg';
import art3 from './images/img12.jpg';
import art4 from './images/img13.jpg';
import art5 from './images/img14.jpg';


import About from "./about";

export default class Body extends React.Component {
    render() {
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="body content">
                <div className="container">
                    <About />
                    <hr></hr>
                    <div className="row" id="blog">
                        <div className="col-md-3">
                            <br></br><br></br>
                            <h1 className="roboto">
                                BLOG
                            </h1>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    blogList.map((object, i) =>
                                        <div>
                                            <div className="featuredText">
                                                <Link className="blogLink" to={"blog/" + object.name.replace(/\s+/g, '-').toLowerCase()}>
                                                    <h3 className="roboto">{object.name}</h3>
                                                </Link>
                                                <p>{object.description}</p>
                                                {object.tags.map((tag, j) => <span className="blogpill">{tag}</span>)}
                                            </div>
                                            {i < blogList.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="projects">
                        <div className="col-md-3">
                            <br></br><br></br>
                            <h1 className="roboto">
                                PROJECTS
                            </h1>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    projectList.map((object, i) =>
                                        <div>
                                            <div className="featuredText">
                                                <a target="_blank" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name}</h3>
                                                </a>
                                                <p>{object.description}</p>
                                                {object.tags.map((tag, j) => <span className="projectpill">{tag}</span>)}
                                            </div>
                                            {i < projectList.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="artworks">
                        <div className="col-sm-12">
                            <br></br><br></br>
                            <h1 className="roboto">
                                ARTWORKS
                            </h1>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="row">
                                <div className="col-sm-3">
                                    <img alt="" src={art1} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art3} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art4} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art5} className="img-fluid" style={bannerStyle}></img>
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