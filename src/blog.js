import React from 'react';
import { Route, Routes } from "react-router-dom";

import { blogList } from './data/blogs'

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import banner from './images/banner.png';
import blogPoster from './images/open-doodles-clumsy-man-dropping-documents-and-files.svg';

export default class Blog extends React.Component {
    render() {
        var globalStyle = {
            margin: "-12px 0 50px 0",
        }
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="content">
                <div className="container">
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row-fluid">
                            <div className="col-lg-9">
                                <Routes>
                                    {
                                        blogList.map((object, i) =>
                                            <Route path={object.name.replace(/\s+/g, '-').toLowerCase()} exact element={object.component} />
                                        )
                                    }
                                </Routes>
                                <br></br><br></br>
                                <img alt="" src={blogPoster} className="img-fluid" style={bannerStyle}></img>
                                <h4 className="montserrat" style={{fontWeight:"bold"}}>blog by Pranshu Gupta</h4>
                                <small>Illustration by <a href="https://icons8.com/illustrations/author/206397">Pablo Marquez Ouch!</a></small>
                            </div>
                            <div className="col-lg-3">
                                <br></br><br></br>
                                <img alt="" src={banner} className="img-fluid" style={bannerStyle}></img>
                                <br></br><br></br>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}