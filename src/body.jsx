import React from 'react';
import { Link } from "react-router-dom";
import { blogList } from './data/blogs'
import { projectList } from './data/projects'
import { publicationList } from './data/publications'
import { createNextPageUpdater, createPreviousPageUpdater, getPageNumbers, getPageSlice, getTotalPages } from './utils/pagination';
import {
    FaArrowLeft,
    FaArrowRight,
    FaBlog,
    FaCode,
    FaPalette,
    FaScroll,
} from 'react-icons/fa6';

import { VscGithubProject } from "react-icons/vsc";
import { LuNotebookPen, LuArrowUpRight } from "react-icons/lu";

import './styles/fonts.css';
import './styles/body.css';
import './styles/projects.css';

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
        this.state = {
            currentPage: 1,
            blogsPerPage: 4,
            blogSectionHeight: 0,
        };
    }

    componentDidMount() {
        this.updateBlogSectionHeight();
        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', this.handleHashChange);
            this.scrollToHash(window.location.hash);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.currentPage !== this.state.currentPage || prevState.blogsPerPage !== this.state.blogsPerPage) {
            this.updateBlogSectionHeight();
        }
    }

    componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('hashchange', this.handleHashChange);
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

    handleHashChange = () => {
        if (typeof window === 'undefined') {
            return;
        }
        this.scrollToHash(window.location.hash);
    };

    scrollToHash = (hash) => {
        if (!hash || typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }
        const targetId = hash.replace(/^#/, '');
        if (!targetId) {
            return;
        }
        const target = document.getElementById(targetId);
        if (!target) {
            return;
        }
        const navbarOffset = 70;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    };

    render() {
        const {
            currentPage,
            blogsPerPage,
            blogSectionHeight,
        } = this.state;
        const currentBlogs = getPageSlice(blogList, currentPage, blogsPerPage);
        const blogTotalPages = getTotalPages(blogList.length, blogsPerPage);
        const blogPageNumbers = getPageNumbers(blogTotalPages);


        return (
            <div className="body content">
                <div className="container">
                    <About />
                    <hr></hr>
                    <div className="row" id="publications">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <FaScroll className="big gt4" />
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
                                        <div key={object.name} style={{ marginBottom: i < publicationList.length - 1 ? '36px' : 0 }}>
                                            <div className="featuredText pub-card">
                                                <div className="pub-venue-row">
                                                    <span className="pub-venue">{object.venue}</span>
                                                    <span className="pub-role">{object.role}</span>
                                                </div>
                                                <a target="_blank" rel="noopener noreferrer" className="blogLink" href={object.link}>
                                                    <h3 className="roboto">{object.name} <LuArrowUpRight style={{ fontSize: '75%', marginLeft: '8px' }} /></h3>
                                                </a>
                                                <p>{object.description}</p>
                                            </div>
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
                            <LuNotebookPen className="big gt1" />
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
                                        <div
                                            key={object.name}
                                            style={{ marginBottom: i < currentBlogs.length - 1 ? '36px' : 0 }}
                                            onMouseEnter={() => this.handleBlogLinkHover(object)}
                                            onTouchStart={() => this.handleBlogLinkHover(object)}
                                        >
                                            <div className="featuredText blog-card">
                                                <div className="pub-venue-row">
                                                    {object.tags.map((tag, j) => <span key={j} className="blog-tag">#{tag}</span>)}
                                                    <span className="pub-role">{object.date}</span>
                                                </div>
                                                <Link className="blogLink" to={"blog/" + object.slug}>
                                                    <h3 className="roboto">{object.name} <FaArrowRight style={{ fontSize: '70%', marginLeft: '8px' }} /></h3>
                                                </Link>
                                                <p>{object.description}</p>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                            <br></br>
                            <div className="pagination-minimal">
                                <button className="pagination-nav" onClick={this.handlePreviousPage} disabled={currentPage === 1}>
                                    <FaArrowLeft style={{ fontSize: '0.7rem', marginRight: '6px' }} />Newer
                                </button>
                                <span className="pagination-info">Page {currentPage} of {blogTotalPages}</span>
                                <button className="pagination-nav" onClick={this.handleNextPage} disabled={currentPage === blogTotalPages || blogTotalPages === 0}>
                                    Older<FaArrowRight style={{ fontSize: '0.7rem', marginLeft: '6px' }} />
                                </button>
                            </div>
                            <br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="projects">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <VscGithubProject className="big gt2" />
                            <br></br><br></br>
                            <h2 className="roboto">
                                PROJECTS
                            </h2>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ paddingLeft: '5px' }}>
                                {projectList.map((object, i) =>
                                    <div key={object.name} className="pub-card project-card" style={{ marginBottom: i < projectList.length - 1 ? '36px' : 0 }}>
                                        <div className="pub-venue-row">{object.tags.map((tag, j) => <span key={j} className="blog-tag">#{tag}</span>)}</div>
                                        <h3 className="roboto">{object.name}</h3>
                                        <p>{object.description}</p>
                                        <a href={object.link} target="_blank" rel="noopener noreferrer" className="accordion-link">
                                            View on GitHub <LuArrowUpRight style={{ marginLeft: '4px' }} />
                                        </a>
                                    </div>
                                )}
                            </div>
                            <br></br><br></br>
                        </div>
                    </div>
                    <hr></hr>
                    <div className="row" id="artworks">
                        <div className="col-md-3">
                            <br></br><br></br><br></br>
                            <FaPalette className="big gt3" />
                            <br></br><br></br>
                            <h2 className="roboto">
                                ARTWORKS
                            </h2>
                            <br></br>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                                <Link to="artworks/" className="accordion-link">
                                    Artist's Bio <FaArrowRight style={{ marginLeft: '6px' }} />
                                </Link>
                                <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/pranshu.paints/" className="accordion-link">
                                    Follow on Instagram <LuArrowUpRight style={{ marginLeft: '6px' }} />
                                </a>
                            </div>
                        </div>
                        <div className="col-md-9">
                            <br></br><br></br>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                {[[art1,art5,art4],[art6,art8,art2,art10],[art7,art3,art9]].map((col, ci) => (
                                    <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {col.map((src, i) => (
                                            <img key={i} alt="" src={src} style={{ width: '100%', display: 'block', borderRadius: '4px', transition: 'opacity 0.25s ease, transform 0.25s ease' }}
                                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <br></br><br></br><br></br>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}