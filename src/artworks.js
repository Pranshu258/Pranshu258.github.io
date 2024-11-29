import React from 'react';
import { InstagramEmbed } from 'react-social-media-embed';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import './styles/fonts.css';
import './styles/body.css';
import './styles/blog.css';

import { artList } from './data/artworks'

export default class Artworks extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
    }
    render() {
        var globalStyle = {
            margin: "50px 0 50px 0",
        }
        var bannerStyle = {
            margin: "0 0 20px 0",
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
                            <div className="col-md-4">
                                <div style={{ display: 'flex', justifyContent: 'left' }}>
                                    <InstagramEmbed url="https://www.instagram.com/p/CySjN5TOvxF/" />
                                </div>
                                <br></br>
                            </div>
                            <div className="col-md-8">
                                <p>
                                    Art is my soul's expression, a journey through the vibrant hues and delicate strokes of watercolor, with gouache adding depth and brilliance. My landscapes are a heartfelt homage to the breathtaking Pacific Northwest, each piece a testament to the awe and wonder I feel in nature's embrace. My passion extends to movies and video games as well, where I channel my admiration into fan art that resonates with fellow enthusiasts. Through my art, I strive to capture not just the scene, but the very essence and emotion it evokes within me.
                                </p>
                                <h2 className='calligraffitti'><b>- Pranshu Gupta</b></h2>
                                <br></br>
                                <Carousel 
                                    showThumbs={true} 
                                    showStatus={false}
                                    infiniteLoop={true} 
                                    useKeyboardArrows={true} 
                                    autoPlay={true}
                                    showIndicators={false}
                                    swipeable={true}
                                    showArrows={false}
                                >
                                    {
                                        artList.map((object, i) =>
                                            <div key={i}>
                                                <img src={object.source} alt={`Thumbnail ${i}`} />
                                                <br></br><br></br>
                                                <p style={{ textAlign: 'left' }}>{object.description}</p>
                                            </div>
                                        )
                                    }
                                </Carousel>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}