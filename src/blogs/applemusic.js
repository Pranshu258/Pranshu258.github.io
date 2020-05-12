import React from 'react';
import { Route } from "react-router-dom";
import Prism from "prismjs";
import Sharer from "../sharer";

import "../styles/prism.css";

import '../styles/fonts.css';
import '../styles/blog.css';

import plot1 from '../images/track_play_frequency_per_genre.png';
import plot2 from '../images/play_end_type_freq.png';
import plot3 from '../images/track_play_duration_per_genre.png';
import plot4 from '../images/top_three_genre_duration.png';
import plot5 from '../images/track_play_frequency_per_artist.png';
import plot6 from '../images/track_play_duration_per_artist.png';
import plot7 from '../images/monthly_track_frequencies.png';
import plot8 from '../images/monthly_track_durations.png';
import plot9 from '../images/hourly_play_durations.png';

export default class Applemusic extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        Prism.highlightAll();
    }
    render() {
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div className="language-python">
                <h1 className="title">Analysing Apple Music Activity</h1>
                <p>Pranshu Gupta, May 2, 2020</p>
                <Sharer link={window.location.href}></Sharer>
                <br></br>
                <p className="introduction">
                    In this post we will explore apple music data of a user collected over a duration of two years. We will try to infer listening habits and other music specific traits of user from the data. You can perform a similar analysis of your own apple music data, which can be obtained by submitting a request at <a href="https://privacy.apple.com/">https://privacy.apple.com/</a> under the Apple Media Services information category.
                </p>
                <p>
                    The code for this post is available as a jupyter notebook on Google Colab.<br></br><br></br>
                    <button className="btn btn-warning"><a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://colab.research.google.com/drive/16cWFwa_f9KO7M9PBX4sk18KP3Jjrqa2M?usp=sharing"><b style={{ padding: "0 10px 0 0px" }}>Open in Google Colab</b><i class="fas fa-external-link-alt"></i></a></button>
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Exploring the Dataset</h3>
                <p>
                    Apple music dataset consists of multiple files, out of which we are only concerned about <b>Apple Music Play Activity.csv</b> in the <b>Apple Music Activity</b> activity folder. This file contains details about the playback history of the user across all of their devices on which apple music app is being used.
                </p>
                <p>
                    Following are the attributes that apple records for each track that is played by the user on a device:
                </p>
                <pre>
                    <code>
                        {
                            `Apple Id Number
Apple Music Subscription
Artist Name
Build Version
Client IP Address
Content Name
Content Provider
Content Specific Type
Device Identifier
End Position In Milliseconds
End Reason Type
Event End Timestamp
Event Reason Hint Type
Event Received Timestamp
Event Start Timestamp
Event Type
Feature Name
Genre
Item Type
Media Duration In Milliseconds
Media Type
Metrics Bucket Id
Metrics Client Id
Milliseconds Since Play
Offline
Original Title
Play Duration Milliseconds
Source Type
Start Position In Milliseconds
Store Country Name
UTC Offset In Seconds`
                        }
                    </code>
                </pre>
                <br></br>
                <h3 className="headings">Playback Statistics</h3>
                <p>
                To start with, we can look the listening habits of the user, such as, the number tracks played, the total play duration for each month in the dataset, helping us understand how the user's affinity towards music has changed over the years. We can look at the play duration by each hour of the day, to see when the user likes to listen to music every day. 
                </p>
                <figure>
                    <img className="img-fluid" src={plot7} />
                    <figcaption>Number of Tracks played per Month</figcaption>
                </figure>
                <figure>
                    <img className="img-fluid" src={plot8} />
                    <figcaption>Play Duration (hours) per Month</figcaption>
                </figure>
                <figure>
                    <img className="img-fluid" src={plot9} />
                    <figcaption>Total Play duration by Hour of the Day</figcaption>
                </figure>
                <p>
                    Often, when we are on music app, we skip a song to get to the next one, or skip ahead whithin the song. This reduced the play duration of that particular track. Apple music records these events whenever they happen. In the plot below, we can see that a large number of tracks are skipped ahead before completion. However, naturally ending tracks are close second, as one would expect. 
                </p>
                <figure>
                    <img className="img-fluid" src={plot2} />
                    <figcaption>Play End Reason</figcaption>
                </figure>
                <h3 className="headings">Genre Statistics</h3>
                <p>
                A genre can be described as a collection of patterns. Songs that share these patterns can be
                    considered as belonging to the same genre. These patterns mainly depend on the rhythm, speed, key,
                    instrumentation and other musical dynamics.
                </p>
                <figure>
                    <img className="img-fluid" src={plot1} />
                    <figcaption>Play Frequency per Genre</figcaption>
                </figure>
                <p>
                    The plot above shows the number of times any title belonging to a particular genre was played over the period of two years. However, an average user often skips a track before it completes playing. Therefore, we should also look at the cumulative play durations for each genre, rather than just the number of tracks in order to get a better picture. 
                </p>
                <figure>
                    <img className="img-fluid" src={plot3} />
                    <figcaption>Play Duration per Genre</figcaption>
                </figure>
                <p>
                    We can dive deeper and look at the top three genre in the dataset and see how their respective play durations have changed over the years. We can see that "Bollywood" has a significant share of play duration up until mid 2019, after which pop and sountrack are becoming equally significant in the user's listening habits.
                </p>
                <figure>
                    <img className="img-fluid" src={plot4} />
                    <figcaption>Percentage share in play duration for top 3 Genre</figcaption>
                </figure>
                <h3 className="headings">Artist Statistics</h3>
                <p>
                    Similar to the way we looked at the top genres, we can look at top artists. Note that many tracks are made as a result of collaboration among multiple artists, we count the track for each of them for the following plots. 
                </p>
                <figure>
                    <img className="img-fluid" src={plot5} />
                    <figcaption>Track play frequency for top 30 artists</figcaption>
                </figure>
                <figure>
                    <img className="img-fluid" src={plot6} />
                    <figcaption>Percentage share in play duration for top 2 artists</figcaption>
                </figure>
                <p>
                    All of the code to generate plots for this post are available as a python jupyter notebook on google colaboratory. If you are an apple music subscriber, you can download your own dataset and understand your listening habits better than ever before. 
                </p>
                <br></br>
                <button className="btn btn-warning"><a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://colab.research.google.com/drive/16cWFwa_f9KO7M9PBX4sk18KP3Jjrqa2M?usp=sharing"><b style={{ padding: "0 10px 0 0px" }}>Open in Google Colab</b><i class="fas fa-external-link-alt"></i></a></button>
            </div>
        )
    }
}