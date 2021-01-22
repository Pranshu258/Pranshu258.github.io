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
                                {
                                    artList.map((object, i) =>
                                        <div className="row">
                                            <div className="col">
                                                <img alt="" src={object.source} className="img-fluid" style={bannerStyle}></img>
                                            </div>
                                            <div className="col">
                                                <p>
                                                    <br></br>
                                                    <b>{object.title}</b>
                                                    <br></br>
                                                    {object.medium}
                                                    <br></br>
                                                    {object.size}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                }
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