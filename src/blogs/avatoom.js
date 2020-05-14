import React from 'react';
import Sharer from "../sharer";

import '../styles/fonts.css';
import '../styles/blog.css';

import Countrycloudblack from "../images/Countrycloudblack.png"
import Folkcloudblack from "../images/Folkcloudblack.png"
import Indiecloudblack from "../images/Indiecloudblack.png"
import Jazzcloudblack from "../images/Jazzcloudblack.png"
import Popcloudblack from "../images/Popcloudblack.png"
import Rockcloudblack from "../images/Rockcloudblack.png"
import genre from "../images/genre.png"
import genre_distribution from "../images/genre_distribution.png"
import lang_dist from "../images/lang_dist.png"
import data_presence from "../images/data_presence.png"
import data_distribution from "../images/data_distribution.png"
import correlation_matrix from "../images/correlation_matrix.png"
import pca_doc2vec from "../images/pca_doc2vec.png"
import _2comp_genre_scatter from "../images/2comp_genre_scatter.png"
import _3comp_genre_scatter from "../images/3comp_genre_scatter.png"
import tsne_genre from "../images/tsne_genre.png"
import color_bar_genre from "../images/color_bar_genre.png"
import kmean_elbow from "../images/kmean_elbow.png"
import kmean_20cluster_2d  from "../images/kmean-20cluster-2d.png"
import kmean_20cluster_3d from "../images/kmean-20cluster-3d.png"
import tsne_cluster from "../images/tsne_cluster.png"
import cluster_color_bar from "../images/cluster_color_bar.png"
import regression from "../images/regression.png"
import classification_graphs from "../images/classification_graphs.png"
import cm_qda from "../images/cm_qda.png"
import cm_grad_boost from "../images/cm_grad_boost.png"
import cm_mlp_classifier from "../images/cm_mlp_classifier.png"
import cm_mlp_undersample from "../images/cm_mlp_undersample.png"
import cm_mlp_oversample from "../images/cm_mlp_oversample.png"
import default_model from "../images/default_model.png"
import cluster2 from "../images/cluster2.png"
import cluster11 from "../images/cluster11.png"
import cluster16 from "../images/cluster16.png"
import cluster2wc from "../images/wc_cluster2.png"
import cluster11wc from "../images/wc_cluster11.png"
import cluster16wc from "../images/wc_cluster16.png"

export default class Avatoom extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0)
    }
    render() {
        return (
            <div>
                <h1 className="title">A voyage across the Ocean of Music</h1>
                <p>
                    <a style={{ textDecoration: "none" }} href="https://www.linkedin.com/in/jonathanlafiandra/">Jonathan Lafiandra</a>,
                    <a style={{ textDecoration: "none" }} href="https://pranshu258.github.io/"> Pranshu Gupta</a>,
                    <a style={{ textDecoration: "none" }} href="https://shrija14.github.io/"> Shrija Mishra</a>,
                    <a style={{ textDecoration: "none" }} href="https://www.linkedin.com/in/shubhangi-upasani-1b3419182/"> Shubhangi Upasani</a>,
                    <a style={{ textDecoration: "none" }} href="https://www.linkedin.com/in/yuliliu97/"> Yuli Liu</a>
                    <br></br>
                    November 18, 2019
                </p>
                <Sharer link={window.location.href}></Sharer>
                <br></br>
                <p className="introduction">
                    In the world today, there is more music than ever before. This abundance of musical data provides
                    opportunities for us to take advantage of it. One of the facets of the music industry right now is
                    that redundant lyrics sell extremely well. We wanted to take advantage of this formulaic industry
                    and automate the process of generating lyrics in order to make the music industry more efficient and
                    versatile. Our objective with this post is to analyze the current ocean of music out there and
                    find patterns that can be used to create new lyrics. Through this experiment, we aim to generate new lyrics
                    specific to ten different genres and shed some light on several related aspects like their
                    popularity prediction, clustering and genre classification.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <div style={{ textAlign: "center" }}>
                <div className="row">
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Countrycloudblack}/>
                            <figcaption>Country</figcaption>
                        </figure>
                    </div>
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Folkcloudblack}/>
                            <figcaption>Folk</figcaption>
                        </figure>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Indiecloudblack}/>
                            <figcaption>Indie</figcaption>
                        </figure>
                    </div>
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Jazzcloudblack}/>
                            <figcaption>Jazz</figcaption>
                        </figure>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Popcloudblack}/>
                            <figcaption>Pop</figcaption>
                        </figure>
                    </div>
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={Rockcloudblack}/>
                            <figcaption>Rock</figcaption>
                        </figure>
                    </div>
                </div>
                <p>
                    The Formulaic Lyrics
                </p>
            </div>
            <div>
                <p className="quote">
                    A genre can be described as a collection of patterns. Songs that share these patterns can be
                    considered
                    as belonging to the same genre. These pattern mainly depend on the rhythm, speed, key,
                    instrumentation and other musical dynamics. But with how genres have been developed, can we
                    determine them
                    just by analyzing lyrics?
                </p>
                <h3 className="headings">The Ocean of Music</h3>
                <p>
                    The <a href="http://millionsongdataset.com/">Million Song Dataset</a> is a dataset curated by an
                    organization named EchoNest (now Spotify) that has one million songs where each song consists of 41
                    distinct features related to audio analysis (tempo, duration, mode, loudness etc), artist
                    information (artist popularity, artist familiarity etc) and metadata (releases, title, song hotness
                    etc). We look at the MSD summary data set for our project as the full MSD dataset is 280GB in size
                    and difficult to work with. The summary dataset also has all the songs but it has only those
                    features which are suitable to save in a key value format.
                </p>
                <p>
                    The <a href="https://www.kaggle.com/gyani95/380000-lyrics-from-metrolyrics">MetroLyrics</a> dataset
                    contains 362,237 songs from 18,231 artists with six columns for each song: song index, title, year
                    released, artist, genre, and lyrics. All songs in the database were released between 1968 and 2016,
                    excluding several songs incorrectly labeled with invalid years.
                </p>
                <ul>
                    <li>
                        The Metrolyrics dataset is built by scraping lyrics from the internet. And the content on
                        internet is not always perfect. As we know - "To err is human!"
                    </li>
                    <li>
                        There are lyrics in languages other than english as well.
                    </li>
                    <li>
                        The dataset is heavily skewed towards Rock.
                    </li>
                </ul>
                <h3 className="headings">Cleaning the Ocean</h3>
                <p>
                    For the MetroLyrics data, we dropped duplicates and removed non-english songs using a library called
                    CLD2. This resulted in a loss of around 50% of the data and only 155954 records persisted out of the
                    total 362237.
                </p>
                <div className="row">
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={genre}/>
                            <figcaption >Genre Distribution before clean up</figcaption>
                        </figure>
                    </div>
                    <div className="col-sm-6">
                        <figure>
                            <img alt="" className="img-fluid" src={genre_distribution}/>
                            <figcaption >Genre Distribution after clean up</figcaption>
                        </figure>
                    </div>
                </div>
                <figure>
                    <img alt="" className="img-fluid" src={lang_dist}/>
                    <figcaption >The MetroLyrics Dataset: Distribution of Languages</figcaption>
                </figure>
                <p>
                    Also, in order to work with text data and its analysis, we need to first study the text and make it
                    appropriate for learning. For this we performed some basic data cleaning as follows:
                </p>
                <ol>
                    <li>As the data has been collected by scraping web, we first got rid of html tags from the text
                        using BeautifulSoup.
                    </li>
                    <li>We also removed unnecessary punctuation marks and symbols from the lyrics</li>
                    <li>We did not remove stop words as they are needed to generate plausible text</li>
                </ol>
                <table className="table table-hover">
                    <tr>
                        <th>Input Text</th>
                        <th>Clean Text</th>
                    </tr>
                    <tr>
                        <td>
                            Go read a book
                            He shaked then he shook
                            "I need that crack, I need that crack"
                            You're swingin' the pipe
                            Do what you like
                            Goin' "doom doom"
                            Reflect on the room
                        </td>
                        <td>
                            Go read a book
                            He shaked then he shook
                            I need that crack I need that crack
                            Youre swingin the pipe
                            Do what you like
                            Goin doom doom
                            Reflect on the room
                        </td>
                    </tr>
                </table>
                <p>
                    The million song dataset also has a few columns in which the values are either invalid or missing,
                    which resulted in feature loss. A plot of the presence of valid values for each attribute in the
                    dataset is shown below:
                </p>
                <figure>
                    <img alt="" className="img-fluid" src={data_presence}/>
                    <figcaption>The MSD Dataset: Presence of Values</figcaption>
                </figure>
            </div>
            <h3 className="headings">The Voyage of Discovery</h3>
            <p>
                To begin with, we looked at how the different attributes in the dataset are distributed. The aim was
                to identify if there is any correlation between the attributes or not. The following image shows
                distribution plots for the attributes - "artist_familiarity", "artist_hotttnesss", "song_hotttness",
                "duration", "key", "tempo", "loudness", "mode" and time_signature".
            </p>
            <figure>
                <img alt="" className="img-fluid" src={data_distribution}/>
                <figcaption >The MSD Dataset: Distribution of Values</figcaption>
            </figure>
            <p>
                Apart from the distribution of values, we also looked at the correlation between different
                attributes.
                We can see that the attributes like "artist_hotttnesss" and "artist_familiarity" are
                significantly correlated and both of them are again correlated to "song_hotttness".
            </p>
            <figure>
                <img alt="" className="img-fluid" src={correlation_matrix}/>
                <figcaption >The MSD Dataset: Correlation Matrix</figcaption>
            </figure>
            <h4 className="headings">MSD Attributes</h4>
            <ul>
                <li>artist_familiarity: how popular is an artist to the people</li>
                <li>artist_hotttnesss: how loved is an artist among the people</li>
                <li>song_hotttness: how loved is a song among the people</li>
                <li>key: the harmonic scale of the music in the song</li>
                <li>tempo: beats per minute</li>
            </ul>
            <h3 className="headings">Sailing in the Dark</h3>
            <p>
                One way to understand more about the data and its underlying patterns is unsupervised methods such
                as clustering.
                We wanted to see if the lyrical data had any patterns. Would clustering group the lyrics in
                different genres?
                Would it find other patterns in the lyrics? What exactly would the clusters
                represent?
            </p>
            <h4 className="headings">Feature Extraction</h4>
            <p>
                We started by extracting features from the textual lyrics data by applying Doc2Vec on Metrolyrics
                dataset.
                The reason why we choose Doc2Vec instead of Bag of Words is because a Bag of Words only gives
                information regarding
                individual words and their frequencies, but lacks the semantic meaning and grammar that is
                associated with real
                speech. Doc2Vec is a neural network based model that converts each document to a vector of a
                specific size of our choice.
                For our experiments we chose it to be a 300 dimensional vector.
                This heavily reduces both computation expensiveness and brings along the power of the underlying
                information of the semantics of each song rather than just the word information. We trained Doc2Vec
                using 20 Epochs and each Epoch going 20 iterations and a learning rate of 0.025.
            </p>
            <h4 className="headings">Principal Component Analysis</h4>
            <p>
                After extracting the doc2vec features for each song, we did principal component analysis on the same
                to see if we can represent the data using fewer dimensions. After performing PCA on our data we
                realized that the variance is fairly evenly split across all of our components. This means that we
                cannot reduce our dimensionality any further. This makes sense as Doc2vec uses each feature to
                diseminate the information related to each document
                across the vector.
            </p>
            <figure>
                <img alt="" className="img-fluid" src={pca_doc2vec}/>
                <figcaption >Cumulative Variance vs Number of Components</figcaption>
            </figure>
            <p>
                After applying principal component analysis we move on to data visualization, plotting the first two
                components and the first three components in a 2D and a 3D plot respectively. However, as shown in
                the pictures below, the visualization was not great. This is because as found in
                Dim-Reduction, the share of variance across the components is fairly even.
                In order to mitigate this, we decided to use TSNE in order to obtain a 2-D representation of our
                data that incorporates all of the components.The reason why we did not use TSNE to reduce the
                dimensionality of our data is because while TSNE is great for visual representation it removes too
                much information for clustering.
            </p>
            <div className="row">
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={_2comp_genre_scatter}/>
                        <figcaption >First 2 Principal Components</figcaption>
                    </figure>
                </div>
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={_3comp_genre_scatter}/>
                        <figcaption >First 3 Principal Components</figcaption>
                    </figure>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-3"></div>
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={tsne_genre}/>
                        <figcaption >TNSE Graph by Genre</figcaption>
                    </figure>
                </div>
                <div className="col-sm-3"></div>
            </div>
            <figure>
                <img alt="" className="img-fluid" src={color_bar_genre}/>
                <figcaption >Genre Color Map</figcaption>
            </figure>
            <h4 className="headings">K Means Clustering</h4>
            <p>
                Finally, we cluster the lyrical features using the K Means Clustering algorithm. We use the elbow
                method
                to find the best number of clusters.
                However, looking at the plot it was not very straightforward to choose the elbow. We decided to
                proceed with 20 clusters in order to achieve best computation time while keeping a low sum of
                squared distances.
            </p>
            <figure>
                <img alt="" className="img-fluid" src={kmean_elbow}/>
                <figcaption >Kmeans Elbow Plot</figcaption>
            </figure>
            <p>
                We found that suprisingly, even with the variance qualities mentioned previously, the clusters were
                still clearly differentiable even when using just 2 or 3 of the top PCA components. We also graph
                the clusters using TSNE, the graph however was not how we expected, possibly due the fact that
                informations that was used in clustering was removed in TSNE but overall the TSNE graph looks better
                than the original data with genre. In order to understand how well these clusters represent each
                genre,
                we generated graphs for the genre distribution and wordcloud for each cluster and the results are
                shown
                below.
            </p>
            <div className="row">
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={kmean_20cluster_2d}/>
                        <figcaption >Kmeans 2D Cluster</figcaption>
                    </figure>
                </div>
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={kmean_20cluster_3d}/>
                        <figcaption >Kmeans 3D Cluster</figcaption>
                    </figure>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-3"></div>
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={tsne_cluster}/>
                        <figcaption >TNSE Graph by Clusters</figcaption>
                    </figure>
                </div>
                <div className="col-sm-3"></div>
            </div>
            <figure>
                <img alt="" className="img-fluid" src={cluster_color_bar}/>
                <figcaption >Cluster Color Map</figcaption>
            </figure>
            <h4 className="headings">TSNE</h4>
            <p>
                TSNE is a dimensionality reduction tool which is great as a visualization tool for putting
                high-dimensionality data into a 2D and 3D form.
            </p>
            <h4 className="headings">Doc2Vec</h4>
            <p>
                Doc2Vec is a unsupervised learning algorithm that makes vectors out of pragraphs or in our case
                lyrics.
                It allows us to take some lyrics and put them into a format that we can train with.
            </p>
            <div className="row">
                <div className="col">
                <figure>
                <img alt="" className="img-fluid" src={cluster2}/>
                <figcaption >Cluster 2</figcaption>
            </figure>
                </div>
                <div className="col">
                <figure>
                <img alt="" className="img-fluid" src={cluster11}/>
                <figcaption >Cluster 11</figcaption>
            </figure>                    
                </div>
                <div className="col">

                <figure>
                <img alt="" className="img-fluid" src={cluster16}/>
                <figcaption >Cluster 16</figcaption>
            </figure>                
                </div>
            </div>

            <div className="row">
                <div className="col">
                <figure>
                <img alt="" className="img-fluid" src={cluster2wc}/>
                <figcaption >Cluster 2</figcaption>
            </figure>
                </div>
                <div className="col">
                <figure>
                <img alt="" className="img-fluid" src={cluster11wc}/>
                <figcaption >Cluster 11</figcaption>
            </figure>                    
                </div>
                <div className="col">

                <figure>
                <img alt="" className="img-fluid" src={cluster16wc}/>
                <figcaption >Cluster 16</figcaption>
            </figure>                
                </div>
            </div>


            <p className="muli">
                As we can see most of the clusters contain a large percentage of rock songs while a few of them were
                able
                to sepearate out Hip-Hop, Metal, R&B and Pop. Before going into the problems, there are a few
                interesting gems here:
                First off, we seem to have found a subgenre of Hip-Hop clusters 2 and 11 which are interesting due
                to the
                differences in words.
                One seems to be about rap songs about 'money' while the other is mainly profanity. Another
                interesting thing is that
                the pop cluster(16) has the largest use of 'baby' and 'oh-oh' as one might expect. Metal is another
                interesting one as it seems to
                have a focus on 'life' and 'death'. Another tidbit is the prominence of 'now' and 'know' across many
                different clusters. It seems that
                these words are used often and used together. An issue with the clusters is the prominence of Rock,
                and it's simply a problem
                with the dataset as we mentioned earlier. It's unforunate but the results still ended up being very
                enlightening.
            </p>
            <h3 className="headings">Learning to Sail</h3>
            <p>
                In order to generate a popular song, we need to know what makes a song popular. Looking at the
                correlation matrix, we can see that the song popularity is definitely related to artist popularity
                and familiarity, which seems reasonable, but do other factors also affect the popularity of a song?
                To
                find out, we tried to predict the "song_hotttness" using other attributes from the MSD dataset. We
                tried various regression models for this task and the results were as follows:
            </p>
            <table className="table table-hover">
                <tr>
                    <th>Model</th>
                    <th>Train R2 Score</th>
                    <th>Test R2 Score</th>
                    <th>Test RMSE</th>
                </tr>
                <tr>
                    <td>Bayesian Ridge Regression</td>
                    <td>0.256777</td>
                    <td>0.256595</td>
                    <td>0.138673</td>
                </tr>
                <tr>
                    <td>Linear Regression</td>
                    <td>0.256777</td>
                    <td>0.256607</td>
                    <td>0.138672</td>
                </tr>
                <tr>
                    <td>Ridge Regression CV</td>
                    <td>0.256777</td>
                    <td>0.256603</td>
                    <td>0.138672</td>
                </tr>
                <tr>
                    <td>Lasso Regression CV</td>
                    <td>0.256777</td>
                    <td>0.256607</td>
                    <td>0.138672</td>
                </tr>
                <tr>
                    <td>Fully Connected Neural Network</td>
                    <td>0.282177</td>
                    <td>0.279620</td>
                    <td>0.136508</td>
                </tr>
                <tr>
                    <td>Decision Trees</td>
                    <td>0.322854</td>
                    <td>0.300984</td>
                    <td>0.134490</td>
                </tr>
                <tr>
                    <td>Gradient Boost</td>
                    <td>0.446687</td>
                    <td>0.367784</td>
                    <td>0.127883</td>
                </tr>
            </table>
            <p>
                In order to understand which features of the song affect the popularity the most, we plot the
                weights of the features for all the models mentioned baove. As we can see in the figure below, the
                most important features are "artist_familiarity", "artist_hotttnesss" and the "loudness" of the
                song. From this, we infer that the more famous an artist is, more the popularity of a track made by
                them.
            </p>
            <figure>
                <img alt="" className="img-fluid" src={regression}/>
                <figcaption >Feature Importances for Song Popularity</figcaption>
            </figure>
            <p >
                <b>"give me a famous, loved artist and a song with good loudness and tempo,
                i say that song is probably already a hit"</b>
            </p>
            <p>
                We were also curious to study the affect of lyrics on "song_hotttnesss". Therefore, we also trained
                the same models we used above on features extracted from both MSD and Metrolyrics data. The lyrics
                were converted into vectors using Doc2Vec module. The vectors obtained were high-dimensional which
                were then transformed using
                PCA reduction. These lyrics features were concatenated with MSD features to make the complete
                feature set and the regression models were trained on that. We observed that the models gave higher
                values of RMSE when trained with lyrics than when trained without them. This is probably because
                many of the most common words repeat in more and less popular songs to a similar extent. Hence, we
                conclude that lyrics have no significant effect on popularity of songs.
            </p>
            <h3 className="headings">Learning to Categorize</h3>
            <p>
                The next step was to learn to classify the genres of the songs based on their lyrics. For this, we
                converted the lyrics to vectors using Doc2Vec and reduced the dimensionality of the vectors obtained
                by PCA reduction. Several classifier models were trained on the lyrics features and then tested for
                their performance scores. The results have been summarized below:
            </p>
            <table className="table table-hover">
                <tr>
                    <th>Model</th>
                    <th>Train Score</th>
                    <th>Test Score</th>
                </tr>
                <tr>
                    <td>Decision Tree</td>
                    <td>1.0</td>
                    <td>0.319680</td>
                </tr>
                <tr>
                    <td>Logistic Regression</td>
                    <td>0.357425</td>
                    <td>0.337089</td>
                </tr>
                <tr>
                    <td>Gaussian Naive Bayes</td>
                    <td>0.504352</td>
                    <td>0.495408</td>
                </tr>
                <tr>
                    <td>Random Forest</td>
                    <td>1.0</td>
                    <td>0.500326</td>
                </tr>
                <tr>
                    <td>AdaBoost</td>
                    <td>0.515888</td>
                    <td>0.516080</td>
                </tr>
                <tr>
                    <td>Multinomial Naive Bayes</td>
                    <td>0.535761</td>
                    <td>0.538161</td>
                </tr>
                <tr>
                    <td>Quadratic Discriminant Analysis</td>
                    <td>0.836083</td>
                    <td>0.553076</td>
                </tr>
                <tr>
                    <td>Gradient Boost</td>
                    <td>0.612633</td>
                    <td>0.555907</td>
                </tr>
                <tr>
                    <td>Multi Layer Perceptron</td>
                    <td>0.716912</td>
                    <td>0.609636</td>
                </tr>
            </table>
            <figure>
                <img alt="" className="img-fluid" src={classification_graphs}/>
                <figcaption>Classifiers Graphed</figcaption>
            </figure>
            <div className="row" >
                <div className="col-sm-4">
                    <figure>
                        <img alt="" className="img-fluid" src={cm_qda}/>
                        <figcaption>Quadratic Discr. Analysis</figcaption>
                    </figure>
                </div>
                <div className="col-sm-4">
                    <figure>
                        <img alt="" className="img-fluid" src={cm_grad_boost}/>
                        <figcaption>Gradient Boost </figcaption>
                    </figure>
                </div>
                <div className="col-sm-4">
                    <figure>
                        <img alt="" className="img-fluid" src={cm_mlp_classifier}/>
                        <figcaption>Multi Layer Perceptron</figcaption>
                    </figure>
                </div>
            </div>
            <p>0: 'Country', 1: 'Electronic', 2: 'Folk', 3: 'Hip-Hop', 4: 'Indie', 5: 'Jazz', 6: 'Metal', 7: 'Pop',
                8: 'R&B', 9: 'Rock'
            </p>
            <p>
                We could infer that lyrics have a positive impact on genre classification of songs. This is probably
                because songs of the same genre have similar kinds of lyrics. We noticed that the most seemingly
                unique
                genres were Hip Hop, Metal, and Pop. Furthermore, Metal and Pop seem to share some confusion
                with
                Rock. Thus, unsupervised learning showed positive results.
            </p>
            <h4 className="headings">Handling Skewed Dataset by Resampling Techniques</h4>
            <p>As we know that our dataset is heavily skewed towards rock genre which can affect the classifiers
                accuracy. Therefore, we created a balanced dataset by undersampling the majority classes which
                resulted in 1000 songs per genre (10000 songs overall). We then trained our best classifier -
                Multilayer Perceptron on this dataset. The model was able to acheive a test accuracy of 47.8% and a
                training accuracy of 99.6%. (overfitting)
            </p>
            <p>
                Similarly, we also tested the Multi Layer Perceptron by creating a balanced dataset by oversampling
                the minority classes (creating duplicates). The model was able to achieve a testing accuracy of
                44.8%
                and a training accuracy of 78.9%.
            </p>
            <div className="row">
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={cm_mlp_undersample}/>
                        <figcaption>Multi Layer Perceptron: Undersampling</figcaption>
                    </figure>
                </div>
                <div className="col-sm-6">
                    <figure>
                        <img alt="" className="img-fluid" src={cm_mlp_oversample}/>
                        <figcaption>Multi Layer Perceptron: Oversampling</figcaption>
                    </figure>
                </div>
            </div>
            <h4 className="headings">R2 Score</h4>
            <p>
                R squared is the statistical measure of how close the data is to the fitted regression line. It
                can be defined as the ratio of the explained variance and the actual variance in the data.
            </p>
            <h4 className="headings">Gradient Boost</h4>
            <p>
                A loss function is minimized by iteratively adding weak learners to the model.
            </p>
            <h3 className="headings">Learning to Build</h3>
            <p>
                After learning to predict the popularity and the genre of a song, our ambitions fly high and with
                motivation from from Andrej Karpathy's char-rnn architecture that performs character level text
                generation, we unleash the power of Recurrent Neural Networks to generate novel song lyrics.
            </p>
            <figure>
                <img alt="" className="img-fluid" src={default_model}/>
                <figcaption >TextGenRNN Neural Network Architecture (source: <a
                    href="https://github.com/minimaxir/textgenrnn">TextGenRNN</a>)</figcaption>
            </figure>
            <h4 className="headings">The Pre-Trained Reddit Text Gen Model</h4>
            <p>
                Built on top of tensorflow and keras, we have used a Python package called TextGenRNN. This is a
                wrapper over the char neural network model and also enables a great deal of flexibility. We used
                Google Colab to train our model with an environment configured with 2 vCPUs, 13GB memory and a K80
                GPU. With rnn size of 256 units and 5 layers, we trained our network for 50 epochs. We do this on
                top of the pretrained model provided with the package which has been trained on hundreds of text
                documents acquired from Reddit. The pre-trained model is useful since it has already gained
                knowledge and has embeddings that include the modern internet grammar. The model has a great
                influence on the language we are learning and helps in the generation of subsequent lyrics.
            </p>
            <h4 className="headings">Transfer Learning: From Reddit to MetroLyrics</h4>
            <p>
                To incorporate the understanding for our lyrics, we have used this pretrained model and retrained
                all the layers on 1000 songs from each genre, i.e. 10000 songs altogether. This enabled our model to
                learn relations and context not present in the original dataset. This way we have transferred the
                learning from one dataset (Reddit data) to another (songs dataset) and have combined them to get
                some novel results.
            </p>
            <h4 className="headings">Word Level and Character Level Text Generation</h4>
            <p>
                We tried both word level and character level models. The results from the character level model are
                not as good as the word-level model. Because the latter is better at capturing long-distance
                dependencies if trained for a similar amount of data. In order to predict up to the third word from
                the beginning of a sentence, a
                word-level RNN has to make two predictions to get there, while the character-level model must make
                predictions for the number of times equal to the number of characters before the second space. The
                result gets more error prone with the higher number of predictions the model needs to make.
            </p>
            <h4 className="headings">Introducing Genre Bias</h4>
            <p>
                In order to generate better lyrics for each genre, after finishing the first phase of training, we
                retrain the model seperately on 1000 songs from each genre (10). Thus, creating 10 genre biased
                models, we use these models to genreate novel lyrics.
            </p>
            <h4 className="headings">Evaluation</h4>
            <p>
                In order to evaluate the lyrics generated by our model, we tought of two different approaches. One
                was to provide a the first few lines of a known song as a seed for the model and let it generate the
                new lyrics baed on that. Once the lyrics are generated by the model we compare how similar it is to
                the original song. We use BLEU score as our metric for the same.
            </p>
            <p>
                The Bilingual Evaluation Understudy Score, or BLEU for short, is a metric for evaluating a generated
                sentence to a reference sentence. This is achieved by counting matching n-grams in original lyrics
                and our newly generated lyrics starting from the seed of the original song. Below are some of the
                results on comparing with the reference songs. Although BLEU score is a good metric to evaluate
                machine translation which is also based on RNN models, it might not be the best way to measure the
                goodness of a text generation model, so we take the results with grain of salt.
            </p>
            <table className="table table-hover">
                <tr>
                    <th>Reference Song</th>
                    <th>Artist</th>
                    <th>Unigram BLEU</th>
                    <th>Bigram BLEU</th>
                    <th>Trigram BLEU</th>
                </tr>
                <tr>
                    <td>Life Thru the Same Lens</td>
                    <td>Erin Moran</td>
                    <td>0.35</td>
                    <td>0.17</td>
                    <td>0.15</td>
                </tr>
                <tr>
                    <td>Thinking Over</td>
                    <td>Dana Glover</td>
                    <td>0.44</td>
                    <td>0.30</td>
                    <td>0.28</td>
                </tr>
            </table>
            <p>
                Another way to evaluate the lyrics generated by our model is to convert the lyrics to doc2vec and
                then use our classification model to predict the genre in which our lyrics is falling into. If the
                predicted genre is same as the genre towards which the model has been biased, then we can say that
                the results are sound.
            </p>
            <h3 className="headings">A Song for the Mermaids</h3>
            <p>Here is a small song curated from three independently generated lyrical paragraphs</p>
            <div className="calligraffitti" style={{fontSize:"200%"}}>
                <p >
                    Will you be a danced feeling my darling<br></br>
                    I'm listening to your life<br></br>
                    All in all the ghetto<br></br>
                    All through the night, city blues someday<br></br>
                </p>
                <p >
                    How do I act like we never met<br></br>
                    When everything is saying it was oh so real<br></br>
                    I feel that they matter<br></br>
                    Try not to think about it anymore<br></br>
                    Try not to think about it anymore<br></br>
                </p>
                <p >
                    I want you to know the way you love it<br></br>
                    When you start to see it through<br></br>
                    And the morning is the same old room for me<br></br>
                    I want to be your string<br></br>
                    I want you to know it was meant to be<br></br>
                    And I was starting to fight and then I see<br></br>
                    The way you love me<br></br>
                </p>
            </div>
            <h3 className="headings">Future Work</h3>
            <p>Some of the possible improvements and extensions that can be added to our work are as
                follows:
            </p>
            <ul>
                <li>A better dataset, which has good representation from all the genres</li>
                <li>Incorporating additional features from audio analysis</li>
                <li>Generating genre specific music along with lyrics, to create a complete song</li>
                <li>Extending the study to other languages</li>
            </ul>
            <h3 className="headings">References</h3>
            <ol>
                <li><a href="http://karpathy.github.io/2015/05/21/rnn-effectiveness/">The Unreasonable
                    Effectiveness
                    of Recurrent Neural Networks: Andrej Karpathy</a>
                </li>
                <li><a href="https://github.com/minimaxir/textgenrnn">TextGenRNN: Easily train your own
                    text-generating neural network of any size and complexity on any text dataset with a
                    few
                    lines of code. </a>
                </li>
                <li><a href="https://machinelearningmastery.com/calculate-bleu-score-for-text-python/">A
                    Gentle
                    Introduction to Calculating the BLEU Score for Text in Python</a>
                </li>
                <li><a
                    href="https://towardsdatascience.com/evaluating-text-output-in-nlp-bleu-at-your-own-risk-e8609665a213">Evaluating
                    Text Output in NLP: BLEU at your own risk</a>
                </li>
                <li><a href="https://tmthyjames.github.io/2018/january/Analyzing-Rap-Lyrics-Using-Word-Vectors/">Analyzing
                    Rap Lyrics Using Word Vectors </a>
                </li>
            </ol>
            </div>
        )
    }
}