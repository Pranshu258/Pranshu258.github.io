import React from 'react';

var headerStyle = {
    backgroundImage: "linear-gradient(-45deg, lightgreen, green, darkgreen)",
    padding: "30px 20px 20px 20px",
    color: "white",
    borderRadius: "5px"
}

export default class Photography extends React.Component {
    render() {
        return (
            <div>
                <br></br>
                <div className="row" style={headerStyle}>
                    <h1 className="bangers">PHOTOGRAPHY</h1>
                </div>
                <br></br>
                <div className="row">
                    <p className="muli">
                        I am a masters student in Computer Science at Georgia Institute of Technology, Atlanta. I graduated from from Indian Institute of Technology Kanpur in 2017 and worked as a Software Engineer at Microsoft India Development Center for two years (2017-19).
                        <br></br><br></br>
                        I Love building Software, learning more about Computer Science and Painting.
                        <br></br><br></br>
                    </p>
                </div>
                <br></br><br></br>
            </div>
        );
    }
}