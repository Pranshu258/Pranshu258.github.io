import React from 'react';
import { Route } from "react-router-dom";

import Avatoom from './blogs/avatoom';
import Ovac from './blogs/ovac';
import Aibn from './blogs/aibn';
import Qoj from './blogs/qoj';
import Eohl from './blogs/eohl';
import Gitviz from './blogs/gitviz';
import Applemusic from './blogs/applemusic';

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import banner from './images/banner.png';
import blogPoster from './images/pablo-page-is-under-construction.png';

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
                    <div className="row" style={globalStyle}>
                        <h2 className="bigger playfair" style={{backgroundColor:"#dd1c77", padding:"10px 10px 20px 10px", color:"white", textAlign:"left"}}>Blog</h2>
                    </div>
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row-fluid">
                            <div className="col-lg-9">
                                <Route path="/blog/a-voyage-across-the-ocean-of-music" component={Avatoom} />
                                <Route path="/blog/on-virtualization-and-containers" component={Ovac} />
                                <Route path="/blog/algorithms-inspired-by-nature" component={Aibn} />
                                <Route path="/blog/quirks-of-javascript" component={Qoj} />
                                <Route path="/blog/evolution-of-human-languages" component={Eohl} />
                                <Route path="/blog/exploring-github-repositories" component={Gitviz} />
                                <Route path="/blog/analysing-apple-music-activity" component={Applemusic} />
                                <br></br><br></br>
                                <img alt="" src={blogPoster} className="img-fluid" style={bannerStyle}></img>
                                <h4 className="playfair">blog by Pranshu Gupta</h4>
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