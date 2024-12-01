import React from 'react';
import { Link } from "react-router-dom";
import { blogList } from './data/blogs'
import { projectList } from './data/projects'
import { publicationList } from './data/publications'

import './styles/fonts.css';
import './styles/body.css';

import art1 from './images/art/IMG_3918.jpg';
import art2 from './images/art/IMG_6977.jpg';
import art3 from './images/art/IMG_4609.jpg';
import art4 from './images/art/IMG_7411.jpg';
import art5 from './images/art/IMG_3748.jpg';
import art6 from './images/art/IMG_3725.jpg';
import art7 from './images/art/IMG_3476.jpg';
import art8 from './images/art/IMG_6424.jpg';
import art9 from './images/art/IMG_8235.jpg';
import art10 from './images/art/IMG_3730.jpg';

import About from "./about";

export default class Body extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentPage: 1,
            blogsPerPage: 5
        };
    }

    handleNextPage = () => {
        if (this.state.currentPage < this.totalPages()) {
            this.setState({ currentPage: this.state.currentPage + 1 });
        }
    };

    handlePreviousPage = () => {
        if (this.state.currentPage > 1) {
            this.setState({ currentPage: this.state.currentPage - 1 });
        }
    };

    handlePageClick = (pageNumber) => {
        this.setState({ currentPage: pageNumber });
    };

    totalPages = () => {
        return Math.ceil(blogList.length / this.state.blogsPerPage);
    };

    render() {
        const { currentPage, blogsPerPage } = this.state;
        const indexOfLastBlog = currentPage * blogsPerPage;
        const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
        const currentBlogs = blogList.slice(indexOfFirstBlog, indexOfLastBlog);

        const pageNumbers = [];
        for (let i = 1; i <= this.totalPages(); i++) {
            pageNumbers.push(i);
        }

        var bannerStyle = {
            margin: "20px 0 20px 0"
        }

        return (
            <div className="body content">
                <div className="container">
                    <About />
                    <hr></hr>
                    <div className="row" id="publications">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <i className="fas fa-scroll big gt4"></i>
                            <br></br><br></br>
                            <h2 className="roboto">
                                PAPERS
                            </h2>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    publicationList.map((object, i) =>
                                        <div>
                                            <div className="featuredText">
                                                <a target="_blank" rel="noopener noreferrer" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name} <i style={{fontSize: '75%', marginLeft: '10px'}} className='fas fa-external-link-alt'></i></h3>
                                                </a>
                                                <p>{object.description}</p>
                                                <div>{object.tags.map((tag, j) => <span className="btn paperpill">{tag}</span>)}</div>
                                            </div>
                                            {i < publicationList.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="blog">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <i className="fas fa-blog big gt1"></i>
                            <br></br><br></br>
                            <h2 className="roboto">
                                BLOG
                            </h2>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    currentBlogs.map((object, i) =>
                                        <div key={i}>
                                            <div className="featuredText">
                                                <Link className="blogLink" to={"blog/" + object.name.replace(/\s+/g, '-').toLowerCase()}>
                                                    <h3 className="roboto">{object.name} <i style={{fontSize: '75%', marginLeft: '10px'}} className='fas fa-arrow-right'></i></h3>
                                                </Link>
                                                <p>{object.description}</p>
                                                <div>{object.tags.map((tag, j) => <span className="btn blogpill">{tag}</span>)}</div>
                                            </div>
                                            {i < currentBlogs.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                            <div className="pagination">
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handlePreviousPage} disabled={currentPage === 1}>
                                    <i className="fas fa-arrow-left paginationIcon" title={`go to previous page`}></i>
                                </button>
                                {pageNumbers.map(number => (
                                    <button
                                        key={number}
                                        style={{ margin: "0 10px 10px 0" }}
                                        className={`btn btn-dark ${currentPage === number ? 'active' : ''}`}
                                        onClick={() => this.handlePageClick(number)}
                                    >
                                        <i className={`fas fa-${number} paginationIcon`} title={`go to page ${number}`}></i>
                                    </button>
                                ))}
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handleNextPage} disabled={currentPage === this.totalPages()}>
                                    <i className="fas fa-arrow-right paginationIcon" title={`go to next page`}></i>
                                </button>
                            </div>
                            <br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="projects">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <i className="fas fa-code big gt2" style={{ color: "#0075ff" }}></i>
                            <br></br><br></br>
                            <h2 className="roboto">
                                PROJECTS
                            </h2>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: "5px" }}>
                                {
                                    projectList.map((object, i) =>
                                        <div>
                                            <div className="featuredText">
                                                <a target="_blank" rel="noopener noreferrer" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name} <i style={{fontSize: '75%', marginLeft: '10px'}} className='fas fa-external-link-alt'></i></h3>
                                                </a>
                                                <p>{object.description}</p>
                                                <div>{object.tags.map((tag, j) => <span className="btn projectpill">{tag}</span>)}</div>
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
                            <br></br><br></br><br></br>
                            <i className="fas fa-palette big gt3"></i>
                            <br></br><br></br>
                            <h2 className="roboto">
                                ARTWORKS
                            </h2>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="row">
                                <div className="col-sm-4">
                                    <img alt="" src={art5} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-4">
                                    <img alt="" src={art6} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-4">
                                    <img alt="" src={art7} className="img-fluid" style={bannerStyle}></img>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-3">
                                    <img alt="" src={art1} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art2} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art3} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-3">
                                    <img alt="" src={art4} className="img-fluid" style={bannerStyle}></img>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-4">
                                    <img alt="" src={art8} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-4">
                                    <img alt="" src={art9} className="img-fluid" style={bannerStyle}></img>
                                </div>
                                <div className="col-sm-4">
                                    <img alt="" src={art10} className="img-fluid" style={bannerStyle}></img>
                                </div>
                            </div>
                            <br></br>
                            <Link to="artworks/">
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-warning">
                                    <b>ARTIST'S BIO</b><i style={{marginLeft: '10px'}} className='fas fa-arrow-right'></i>
                                </button>
                            </Link>
                            <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/pranshu.paints/">
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-warning">
                                    <b>FOLLOW ON INSTAGRAM</b> &nbsp;<i class="fa-solid fa-external-link-alt"></i>
                                </button>
                            </a>
                            <br></br><br></br><br></br>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}