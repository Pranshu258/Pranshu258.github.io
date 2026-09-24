import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import { LuArrowUpRight } from 'react-icons/lu';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';
import './styles/artworks.css';

import { artList } from './data/artworks'

const INSTAGRAM_POST_URL = 'https://www.instagram.com/p/CySjN5TOvxF/';
const INSTAGRAM_SCRIPT_URL = 'https://www.instagram.com/embed.js';

export default class Artworks extends React.Component {
    constructor(props) {
        super(props);
        this.state = { mounted: false };
    }

    componentDidMount() {
        window.scrollTo(0, 0);
        this.setState({ mounted: true }, this.loadInstagramEmbed);
    }

    loadInstagramEmbed = () => {
        if (window.instgrm?.Embeds?.process) {
            window.instgrm.Embeds.process();
            return;
        }

        const existingScript = document.querySelector(`script[src="${INSTAGRAM_SCRIPT_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', this.processInstagramEmbed, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = INSTAGRAM_SCRIPT_URL;
        script.addEventListener('load', this.processInstagramEmbed, { once: true });
        document.body.appendChild(script);
    };

    processInstagramEmbed = () => {
        window.instgrm?.Embeds?.process();
    };

    render() {
        var globalStyle = {
            margin: "50px 0 50px 0",
        }
        return (
            <div className="content">
                <div className="container">
                    <div className="row-fluid" style={globalStyle}>
                        <div className="row">
                            <div className="col-lg-12">
                                <h1 className="big"><b>Artworks</b></h1>
                                <br></br>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-8">
                                <p>
                                    Art is my soul's expression, a journey through the vibrant hues and delicate strokes of watercolor, with gouache adding depth and brilliance. My landscapes are a heartfelt homage to the breathtaking Pacific Northwest, each piece a testament to the awe and wonder I feel in nature's embrace. My passion extends to movies and video games, where I channel my admiration into fan art that resonates with fellow enthusiasts. Through my art, I strive to capture not just the scene, but the very essence and emotion it evokes within me.
                                </p>
                                <h2 className='calligraffitti'><b>- Pranshu Gupta</b></h2>
                                <br></br>
                                {this.state.mounted && (
                                <Carousel
                                    showThumbs={true}
                                    showStatus={false}
                                    infiniteLoop={true}
                                    useKeyboardArrows={true}
                                    autoPlay={true}
                                    showIndicators={false}
                                    swipeable={true}
                                    showArrows={false}
                                    transitionTime={0}
                                    interval={6000}
                                    dynamicHeight={true}
                                >
                                    {
                                        artList.map((object, i) =>
                                            <div key={i}>
                                                <img
                                                    src={object.source}
                                                    alt={`Thumbnail ${i}`}
                                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                                />
                                                <br></br><br></br>
                                                <p style={{ textAlign: 'left' }}>{object.description}</p>
                                            </div>
                                        )
                                    }
                                </Carousel>
                                )}
                            </div>
                            <div className="col-md-4">
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <div className="instagram-embed-wrapper">
                                        <blockquote
                                            className="instagram-media"
                                            data-instgrm-permalink={`${INSTAGRAM_POST_URL}?utm_source=ig_embed&utm_campaign=loading`}
                                            data-instgrm-version="14"
                                        >
                                            <a href={INSTAGRAM_POST_URL} target="_blank" rel="noopener noreferrer">
                                                View post on Instagram <LuArrowUpRight aria-hidden="true" />
                                            </a>
                                        </blockquote>
                                    </div>
                                </div>
                                <br></br>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}