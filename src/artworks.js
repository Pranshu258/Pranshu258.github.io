import React from 'react';
import { Route } from "react-router-dom";

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import art1 from './images/img1.jpg';
import art2 from './images/img2.jpg';
import art3 from './images/img3.jpg';
import art4 from './images/img4.jpg';
import art5 from './images/img5.jpg';
import art6 from './images/img6.jpg';
import art7 from './images/img7.jpg';
import art8 from './images/img12.jpg';
import art9 from './images/img13.jpg';
import art10 from './images/img14.jpg';

import banner from './images/banner.png';

export default class Artworks extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
    }
    render() {
        var globalStyle = {
            margin: "50px 0 50px 0",
        }
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="content">
                <div className="container">
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row">
                            <div className="col-lg-9">
                                <h1 className="big"><b>Artworks</b></h1>
                                <br></br>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art4} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Betta</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art1} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Dancing Beauty</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art3} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Toucan</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art5} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Watchtower</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art6} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>The Stare</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art7} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Dancing Beauty II</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art8} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>The Night King</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art9} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Touka: The Rabbit</b>
                                            <br></br>
                                            Watercolor on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art10} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Raccoons</b>
                                            <br></br>
                                            Color Pencil on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col">
                                        <img alt="" src={art2} className="img-fluid" style={bannerStyle}></img>
                                    </div>
                                    <div className="col">
                                        <p>
                                            <br></br>
                                            <b>Anne Hathaway</b>
                                            <br></br>
                                            Graphite on Paper
                                            <br></br>
                                            Original (12'x16')
                                        </p>
                                    </div>
                                </div>
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