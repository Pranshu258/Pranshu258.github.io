import React from 'react';
import { Route } from "react-router-dom";

import '../styles/fonts.css';
import '../styles/blog.css';

import banner from '../images/banner.png';

export default class Ovac extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0)
    }
    render() {
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="row">
                <div className="col-sm-9">

                </div>
                <div className="col-sm-3">
                    <br></br><br></br>
                    <img alt="" src={banner} className="img-fluid" style={bannerStyle}></img>
                    <br></br><br></br>
                </div>
            </div>
        )
    }
}