import React from 'react';
import Sharer from "../sharer";

import Prism from "prismjs";
import LineChart from '../charts/linechart';
import Gist from 'super-react-gist';

import { gitvizdata } from '../data/gitviz';

import "../styles/prism.css";
import '../styles/fonts.css';
import '../styles/blog.css';

export default class Gitviz extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        setTimeout(() => Prism.highlightAll(), 0)
    }
    render() {
        return (
            <div className="language-python">
                <div className="row bhead">
                    <i className="fab fa-github bigger gt1"></i>
                </div>
                <h1 className="title">Exploring GitHub Repositories</h1>
                <p>Pranshu Gupta, May 12, 2020</p>
                <Sharer link={window.location.href} title={"Exploring GitHub Repositories"}></Sharer>
                <br></br>
                <p className="introduction">
                    Since its inception in 2007, GitHub has made huge progress in its adoption by the open-source community. Today, GitHub proudly hosts more than 100 million repositories created by coders all over the world. With more than 50 million users, it is true that "GitHub is how people build software". With so much public activity on the platform, it is a goldmine of data, which is made accessible to developers via the GitHub API.
                    <br></br>
                    In this post, we will look at two repositories which have become the flag-bearers of web development, Angular and React, and try to understand their journey over the past few years.
                </p>
                <p>
                    The code for this post is available as a jupyter notebook on Google Colab.<br></br><br></br>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://colab.research.google.com/drive/1bFCQI_0Gm5MpLGg0s1uKGF5fmu5EUrMJ?usp=sharing"><button className="btn btn-warning"><b style={{ padding: "0 10px 0 0px" }}>Open in Google Colab</b><i class="fas fa-external-link-alt"></i></button></a>
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">GitHub Data Mining</h2>
                <p>
                    We can use the GitHub rest API to collect data for commits, forks, issues, and pull requests. The API returns JSON objects which have all the information we need. To use the GitHub API, we have to create a personal access token (which is free), which can be done on the GitHub developer settings section on the settings page of our account. We may use the GitHub API without creating this token, but data collection will be slow because of rate-limiting.
                </p>
                <div>
                    <Gist url="https://gist.github.com/Pranshu258/c1ad56f279d5741a1f1adc110acaff44" file="request_headers.py" />
                </div>
                <div>
                    <Gist url="https://gist.github.com/Pranshu258/c1ad56f279d5741a1f1adc110acaff44" file="get_api_response.py" />
                </div>
                <p>
                    Once we have the token, we can use it to create a header object which will be sent with each API request to GitHub. The <b>get_api_response</b> method is a generic HTTP request method implemented using the python <b>requests</b> module.
                </p>
                <div>
                    <Gist url="https://gist.github.com/Pranshu258/c1ad56f279d5741a1f1adc110acaff44" file="github_api_methods.py" />
                </div>
                <p>
                    GitHub sends paginated responses for all API requests, so we need to repeatedly call the API endpoints with appropriate sleep time between the subsequent requests to respect the rate-limiting (5000 requests per hour). Each page can have at most 100 objects. Please refer to the jupyter notebook for complete implementation.
                </p>
                <br></br>
                <h2 className="headings">Angular and React</h2>
                <p>
                    Angular is a front end framework well known for building rich single-page applications. It was developed by Google using TypeScript, a language developed by Microsoft, which is a superset of JavaScript. Before Angular, we had AngularJS which will reach the end of support in 2021. In this post, we will exclusively talk about Angular and not AngularJS.
                </p>
                <p>
                    React is usually not considered a framework, but a JavaScript library, however, the ecosystem of tools built around react is rich enough for it to be considered a framework. React was developed by Facebook and was the first front end framework to introduce the component-based design for web development.
                </p>
                <p>
                    Both Angular and React are great tools for web development and are loved by developers all over the world. React was published on GitHub in 2013, while Angular in 2014. Since then, both of them have evolved heavily and are still under active development. It would be interesting to see how their journeys on GitHub look like.
                </p>
                <p>
                    <a target="_blank" rel="noopener noreferrer" href="https://angular.io/docs" style={{ color: "white", textDecoration: "none" }}>
                        <button className="btn btn-danger" style={{ marginRight: "10px", marginBottom: "10px" }}>
                            Learn Angular <i class="fab fa-angular"></i>
                        </button>
                    </a>
                    <a target="_blank" rel="noopener noreferrer" href="https://reactjs.org/docs/getting-started.html" style={{ color: "white", textDecoration: "none" }}>
                        <button className="btn btn-primary" style={{ marginRight: "10px", marginBottom: "10px" }}>
                            Learn React <i class="fab fa-react"></i>
                        </button>
                    </a>
                </p>
            <br></br>
            <h3 className="headings">Development</h3>
            <p>
                Any update made to a repository on GitHub is known as a commit, thus a higher number of commits would indicate that the repository is under active development, that is, contributors are pushing more and more code, adding features, fixing bugs and making improvements to the code.
                    <br></br>
                    In the plot below, we look at the total commits pushed to Angular and React each month since they were published on GitHub. We can see that Angular usually has a higher number of commits per month as compared to React. If we look at the number of commits per contributor per month, we can see that it still a little bit higher for Angular. However, React developers seem to be closing the gap in 2020.
                </p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['commits']}
                        ylabel='new commits'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['commits_per_contributor']}
                        ylabel='new commits per contributor'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <br></br>
            <p>In the above plot, to count the number of unique contributors, we have considered the author of the commit as the contributor. In case the author is not available, we look for the committer, and if that is not available as well, we associate the commit to default anonymous contributor.</p>
            <p>Developers add a message describing the changes associated with the commit so that it is easier for others to review the changes in the future. We can see that commit messages posted by Angular developers have become much more descriptive as compared to the ones posted by React developers over the past year. However, the opposite was true before that.</p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['commits_msg_len']}
                        ylabel='commits message length'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <br></br>
            <h3 className="headings">Contribution</h3>
            <p>
                On GitHub, contributors work on a repository by creating a copy of it in their account, to work on it independently. This copy is called a fork of the original repository, once the contributor is done with her changes, she sends a pull request to the original repository. A pull request is then reviewed by other developers, who provide their feedback on the changes made by our contributor, who then makes the necessary changes (if any) in her code. Finally, after review, the new changes are merged into the original repository and the pull request is marked as closed on GitHub.
                </p>
            <p>
                The following plot shows the number of new forks being created by developers on GitHub each month. We can see that React has more forks than Angular since the beginning and the gap has never closed. This indicates that a larger number of GitHub users are interested in contributing to React
                </p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['forks']}
                        ylabel='new forks'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <br></br>
            <p>
                However, if we look at the pull requests made to the repositories each month, we can see that Angular has a much higher number of pull requests each month, and again the gap has never closed. Thus, we can say that although there is more interest in contributing to React among the community, it is Angular where most of the contribution goes, not React.
                </p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['pulls']}
                        ylabel='new pull requests'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <br></br>
            <h3 className="headings">Maintenance</h3>
            <p>
                If a developer is facing some problem while using an open-source software published on GitHub, they can add an issue on the repository. These issues are then looked at by other developers or contributors of the repository and if the issue is reproducible, a contributor writes a fix and sends a pull request for review. Once, the problem is fixed, the issue is closed.
                </p>
            <p>
                In the following plots, we look at the number of new issues created on the repositories each month. We can see that the number of issues submitted on Angular is much higher as compared to React. This could be due to the larger codebase of Angular, or it could be indicative of Angular's usage in larger enterprise-level projects, where issue resolution is considered more critical as compared to smaller projects.
                </p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['issues']}
                        ylabel='new issues'
                        legend_loc='top-left'
                    />
                </div>
            </div>
            <br></br>
            <p>
                It is important that the issues submitted on the repositories are worked on and fixed as quickly as possible. We can see in the plot below, that both Angular and React have been equally fast at resolving the issues and maintaining a healthy project in recent years.
                </p>
            <div style={{ maxWidth: "100vw", overflowX: "scroll" }}>
                <div style={{ height: "250px", width: "900px" }}>
                    <LineChart
                        data={gitvizdata['issue_closing_time']}
                        ylabel='issue closing time (days)'
                        legend_loc='top'
                    />
                </div>
            </div>
            <br></br>
            <h3 className="headings">Conclusion</h3>
            <p>
                GitHub is a great platform for building open-source software with a plethora of features for software development. There are many repositories other than Angular and React which are as valued in the open-source community and enterprise as well.
                </p>
            <p>
                Wouldn't it be great if GitHub showed all of these insights out of the box? Until then, if you are interested, feel free to look at the jupyter notebook on Google Colab and you will be able to do all of the above analysis by yourself.
                </p>
            <p>
                Thank You <span role="img" aria-label="similing and heart emoji">😀❤</span>
            </p>
            </div >
        )
    }
}