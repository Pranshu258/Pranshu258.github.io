import React from 'react';
import { Link } from "react-router-dom";

import './styles/blogs.css';

import blogData from './data/blogs';
import blogBanner from './images/featured.png';

var headerStyle = {
    backgroundImage: "linear-gradient(-45deg, rgba(255,0,0,0.5), rgba(255,0,0,1), maroon)",
    padding: "30px 20px 20px 20px",
    color: "white",
    borderRadius: "5px"
}

export default class Blog extends React.Component {
    render() {
        return (
            <div>
                <br></br>
                <div className="row" style={headerStyle}>
                    <h1 className="bangers">THINKING THROUGH</h1>
                </div>
                <br></br>
                <div className="row">
                    <div className="row-fluid">
                        <img alt="" src={blogBanner} className="img-fluid"></img>
                        <br></br><br></br>
                    </div>
                    <h2 className="roboto"><b>{blogData.featured.name}</b></h2>
                    <p className="muli">{blogData.featured.description}</p>
                    <p className="roboto">
                        <Link to={blogData.featured.link}>Read Article &nbsp;&nbsp;&rarr;</Link>
                    </p>
                </div>
                <div className="container-fluid allBlogs">
                    <h1 className="bangers">All Stories</h1>
                    <div className="row-fluid topBorder">
                        {
                            blogData.blogList.map((entry) => {
                                return <Link to={entry.link}>
                                    <div className="row-fluid blogItem">
                                        <h6 className="muli">{entry.category + " / " + entry.date}</h6>
                                        <h4 className="roboto">{entry.name}</h4>
                                        <p className="muli">{entry.description}</p>
                                    </div>
                                </Link>
                            })
                        }
                    </div>
                </div>
                <br></br><br></br>
            </div>
        );
    }
}