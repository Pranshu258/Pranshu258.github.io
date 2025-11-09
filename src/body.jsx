import React from 'react';
import { Link } from "react-router-dom";
import { blogList } from './data/blogs'
import { projectList } from './data/projects'
import { publicationList } from './data/publications'
import { createNextPageUpdater, createPreviousPageUpdater, getPageNumbers, getPageSlice, getTotalPages } from './utils/pagination';

import './styles/fonts.css';
import './styles/body.css';

const preloadedBlogs = new Set();

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
        this.blogSectionRef = React.createRef();
        this.publicationSectionRef = React.createRef();
        this.projectSectionRef = React.createRef();
        this.state = {
            currentPage: 1,
            blogsPerPage: 4,
            blogSectionHeight: 0,
            publicationCurrentPage: 1,
            publicationsPerPage: 2,
            publicationSectionHeight: 0,
            projectCurrentPage: 1,
            projectsPerPage: 3,
            projectSectionHeight: 0
        };
    }

    componentDidMount() {
        this.updateBlogSectionHeight();
        this.updatePublicationSectionHeight();
        this.updateProjectSectionHeight();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.currentPage !== this.state.currentPage || prevState.blogsPerPage !== this.state.blogsPerPage) {
            this.updateBlogSectionHeight();
        }
        if (prevState.publicationCurrentPage !== this.state.publicationCurrentPage || prevState.publicationsPerPage !== this.state.publicationsPerPage) {
            this.updatePublicationSectionHeight();
        }
        if (prevState.projectCurrentPage !== this.state.projectCurrentPage || prevState.projectsPerPage !== this.state.projectsPerPage) {
            this.updateProjectSectionHeight();
        }
    }

    handleNextPage = () => {
        this.setState(createNextPageUpdater(blogList.length, 'blogsPerPage', 'currentPage'));
    };

    handlePreviousPage = () => {
        this.setState(createPreviousPageUpdater('currentPage'));
    };

    handlePageClick = (pageNumber) => {
        this.setState({ currentPage: pageNumber });
    };

    handlePublicationNextPage = () => {
        this.setState(createNextPageUpdater(publicationList.length, 'publicationsPerPage', 'publicationCurrentPage'));
    };

    handlePublicationPreviousPage = () => {
        this.setState(createPreviousPageUpdater('publicationCurrentPage'));
    };

    handlePublicationPageClick = (pageNumber) => {
        this.setState({ publicationCurrentPage: pageNumber });
    };

    handleProjectNextPage = () => {
        this.setState(createNextPageUpdater(projectList.length, 'projectsPerPage', 'projectCurrentPage'));
    };

    handleProjectPreviousPage = () => {
        this.setState(createPreviousPageUpdater('projectCurrentPage'));
    };

    handleProjectPageClick = (pageNumber) => {
        this.setState({ projectCurrentPage: pageNumber });
    };

    handleBlogLinkHover = (blogEntry) => {
        if (!preloadedBlogs.has(blogEntry.slug)) {
            preloadedBlogs.add(blogEntry.slug);
            blogEntry.loader();
        }
    };

    updateBlogSectionHeight = () => {
        if (!this.blogSectionRef.current) {
            return;
        }
        const measuredHeight = this.blogSectionRef.current.clientHeight;
        if (measuredHeight > this.state.blogSectionHeight) {
            this.setState({ blogSectionHeight: measuredHeight });
        }
    };

    updatePublicationSectionHeight = () => {
        if (!this.publicationSectionRef.current) {
            return;
        }
        const measuredHeight = this.publicationSectionRef.current.clientHeight;
        if (measuredHeight > this.state.publicationSectionHeight) {
            this.setState({ publicationSectionHeight: measuredHeight });
        }
    };

    updateProjectSectionHeight = () => {
        if (!this.projectSectionRef.current) {
            return;
        }
        const measuredHeight = this.projectSectionRef.current.clientHeight;
        if (measuredHeight > this.state.projectSectionHeight) {
            this.setState({ projectSectionHeight: measuredHeight });
        }
    };

    render() {
        const {
            currentPage,
            blogsPerPage,
            blogSectionHeight,
            publicationCurrentPage,
            publicationsPerPage,
            publicationSectionHeight,
            projectCurrentPage,
            projectsPerPage,
            projectSectionHeight
        } = this.state;
        const currentBlogs = getPageSlice(blogList, currentPage, blogsPerPage);
        const currentPublications = getPageSlice(publicationList, publicationCurrentPage, publicationsPerPage);
        const currentProjects = getPageSlice(projectList, projectCurrentPage, projectsPerPage);

        const blogTotalPages = getTotalPages(blogList.length, blogsPerPage);
        const publicationTotalPages = getTotalPages(publicationList.length, publicationsPerPage);
        const projectTotalPages = getTotalPages(projectList.length, projectsPerPage);

        const blogPageNumbers = getPageNumbers(blogTotalPages);
        const publicationPageNumbers = getPageNumbers(publicationTotalPages);
        const projectPageNumbers = getPageNumbers(projectTotalPages);

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
                            <div
                                ref={this.publicationSectionRef}
                                style={{
                                    paddingLeft: "5px",
                                    minHeight: publicationSectionHeight || undefined
                                }}
                            >
                                {
                                    currentPublications.map((object, i) =>
                                        <div key={object.name}>
                                            <div className="featuredText">
                                                <a target="_blank" rel="noopener noreferrer" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name} <i style={{fontSize: '75%', marginLeft: '10px'}} className='fas fa-external-link-alt'></i></h3>
                                                </a>
                                                <p>{object.description}</p>
                                                <div>{object.tags.map((tag, j) => <span className="btn paperpill">{tag}</span>)}</div>
                                            </div>
                                            {i < currentPublications.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                            <div className="pagination">
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handlePublicationPreviousPage} disabled={publicationCurrentPage === 1}>
                                    <i className="fas fa-arrow-left paginationIcon" title={`go to previous page`}></i>
                                </button>
                                {publicationPageNumbers.map(number => (
                                    <button
                                        key={`publication-page-${number}`}
                                        style={{ margin: "0 10px 10px 0" }}
                                        className={`btn btn-dark ${publicationCurrentPage === number ? 'active' : ''}`}
                                        onClick={() => this.handlePublicationPageClick(number)}
                                    >
                                        <i className={`fas fa-${number} paginationIcon`} title={`go to page ${number}`}></i>
                                    </button>
                                ))}
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handlePublicationNextPage} disabled={publicationCurrentPage === publicationTotalPages || publicationTotalPages === 0}>
                                    <i className="fas fa-arrow-right paginationIcon" title={`go to next page`}></i>
                                </button>
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
                            <div
                                ref={this.blogSectionRef}
                                style={{
                                    paddingLeft: "5px",
                                    minHeight: blogSectionHeight || undefined
                                }}
                            >
                                {
                                    currentBlogs.map((object, i) =>
                                        <div key={object.name}>
                                            <div 
                                                className="featuredText"
                                                onMouseEnter={() => this.handleBlogLinkHover(object)}
                                                onTouchStart={() => this.handleBlogLinkHover(object)}
                                            >
                                                <Link className="blogLink" to={"blog/" + object.slug}>
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
                                {blogPageNumbers.map(number => (
                                    <button
                                        key={`blog-page-${number}`}
                                        style={{ margin: "0 10px 10px 0" }}
                                        className={`btn btn-dark ${currentPage === number ? 'active' : ''}`}
                                        onClick={() => this.handlePageClick(number)}
                                    >
                                        <i className={`fas fa-${number} paginationIcon`} title={`go to page ${number}`}></i>
                                    </button>
                                ))}
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handleNextPage} disabled={currentPage === blogTotalPages || blogTotalPages === 0}>
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
                            <div
                                ref={this.projectSectionRef}
                                style={{
                                    paddingLeft: "5px",
                                    minHeight: projectSectionHeight || undefined
                                }}
                            >
                                {
                                    currentProjects.map((object, i) =>
                                        <div key={object.name}>
                                            <div className="featuredText">
                                                <a target="_blank" rel="noopener noreferrer" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name} <i style={{fontSize: '75%', marginLeft: '10px'}} className='fas fa-external-link-alt'></i></h3>
                                                </a>
                                                <p>{object.description}</p>
                                                <div>{object.tags.map((tag, j) => <span className="btn projectpill">{tag}</span>)}</div>
                                            </div>
                                            {i < currentProjects.length - 1 ? <hr></hr> : null}
                                        </div>
                                    )
                                }
                            </div>
                            <br></br><br></br>
                            <div className="pagination">
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handleProjectPreviousPage} disabled={projectCurrentPage === 1}>
                                    <i className="fas fa-arrow-left paginationIcon" title={`go to previous page`}></i>
                                </button>
                                {projectPageNumbers.map(number => (
                                    <button
                                        key={`project-page-${number}`}
                                        style={{ margin: "0 10px 10px 0" }}
                                        className={`btn btn-dark ${projectCurrentPage === number ? 'active' : ''}`}
                                        onClick={() => this.handleProjectPageClick(number)}
                                    >
                                        <i className={`fas fa-${number} paginationIcon`} title={`go to page ${number}`}></i>
                                    </button>
                                ))}
                                <button style={{ margin: "0 10px 10px 0" }} className="btn btn-dark" onClick={this.handleProjectNextPage} disabled={projectCurrentPage === projectTotalPages || projectTotalPages === 0}>
                                    <i className="fas fa-arrow-right paginationIcon" title={`go to next page`}></i>
                                </button>
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