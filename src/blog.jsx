import React, { Suspense } from 'react';
import { Route, Routes } from "react-router-dom";

import { blogList } from './data/blogs'

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import banner from './images/banner.png';
import blogPoster from './images/open-doodles-clumsy-man-dropping-documents-and-files.svg';

export default class Blog extends React.Component {
    constructor(props) {
        super(props);
        this.lazyComponents = blogList.reduce((accumulator, entry) => {
            accumulator[entry.slug] = React.lazy(entry.loader);
            return accumulator;
        }, {});
    }

    render() {
        var globalStyle = {
            margin: "-12px 0 50px 0",
        }
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="content blog-content">
                <div className="container">
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row-fluid">
                            <div className="col-lg-9">
                                <Routes>
                                    {
                                        blogList.map((object, i) =>
                                            {
                                                const BlogComponent = this.lazyComponents[object.slug];
                                                return (
                                                    <Route
                                                        key={object.slug}
                                                        path={object.slug}
                                                        element={
                                                            <Suspense fallback={<div className="blog-loading">Loading article...</div>}>
                                                                <BlogComponent />
                                                            </Suspense>
                                                        }
                                                    />
                                                );
                                            }
                                        )
                                    }
                                </Routes>
                                <br></br>
                                <img alt="" src={blogPoster} className="img-fluid" style={bannerStyle}></img>
                                <h4 className="montserrat" style={{fontWeight:"bold"}}>blog by Pranshu Gupta</h4>
                                <small>Illustration by <a href="https://icons8.com/illustrations/author/206397">Pablo Marquez Ouch!</a></small>
                                <div className='row-fluid'>
                                    <nav style={{marginTop: '30px'}}>
                                        <h6 className="montserrat" style={{fontWeight: 'bold'}}>More Articles</h6>
                                        <ul style={{listStyle: 'none', padding: 0}}>
                                            {blogList.map((object, i) => {
                                                // Compute previous and next
                                                const next = blogList[i - 1];
                                                const prev = blogList[i + 1];
                                                // Only show for the current blog route
                                                // Use window.location.pathname to get current path
                                                const currentPath = window.location.pathname.split('/').pop();
                                                const thisPath = object.slug;
                                                if (currentPath === thisPath) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {prev && (
                                                                <li>
                                                                    &larr; Previous: <a href={"/blog/" + prev.slug}>{prev.name}</a>
                                                                </li>
                                                            )}
                                                            {next && (
                                                                <li style={{marginTop: '10px'}}>
                                                                    &rarr; Next: <a href={"/blog/" + next.slug}>{next.name}</a>
                                                                </li>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                            <div className="col-lg-3">
                                <br></br>
                                <img alt="" src={banner} className="img-fluid" style={bannerStyle}></img>
                                <br></br>
                                <br></br>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}