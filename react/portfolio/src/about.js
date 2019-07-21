import React from 'react';

import techBanner from './images/Tech.png';

export default class About extends React.Component {
    render() {
        return (
            <div>
                <br></br>
                <div className="row">
                    <img src={techBanner} className="img-fluid"></img>
                </div>
                <br></br>
                <div className="row">
                    <p className="muli">
                        I am a masters student in Computer Science at Georgia Institute of Technology, Atlanta. I graduated from from Indian Institute of Technology Kanpur in 2017 and worked as a Software Engineer at Microsoft India Development Center for two years (2017-19).
                        <br></br><br></br>
                        I Love building Software, learning more about Computer Science and Painting.
                        <br></br><br></br>
                    </p>
                    <a rel="noopener noreferrer" target="_blank" href="https://pranshu258.github.io/PranshuGuptaResume.pdf"><button class="muli btn btn-primary">RÉSUME</button></a> &nbsp;
                    <a rel="noopener noreferrer" target="_blank" href="https://pranshu258.github.io/PranshuGuptaCV.pdf"><button class="muli btn btn-danger">CV</button></a>
                </div>
                <br></br><br></br>
            </div>
        );
    }
}