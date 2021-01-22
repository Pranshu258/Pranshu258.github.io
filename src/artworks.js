import React from 'react';

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import { artList } from './data/artworks'

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
            margin: "0 40px 0 0",
            height: "420px"
        }
        var wrapStyle = {
            flexWrap: "wrap",
            display: "flex"
        }
        return (
            <div className="content">
                <div className="container">
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row">
                            <div className="col-lg-12">
                                <h1 className="big"><b>Artworks</b></h1>
                                <br></br>
                                <div style={wrapStyle}>
                                    {
                                        artList.map((object, i) =>
                                            <span>
                                                <p>
                                                    <img alt="" src={object.source} className="img-fluid" style={bannerStyle}></img>
                                                </p>
                                                <p>
                                                    <b>{object.title}</b>
                                                    <br></br>
                                                    {object.medium}
                                                    <br></br>
                                                    {object.size}
                                                </p>
                                                <br></br>
                                            </span>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}