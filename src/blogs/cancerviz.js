import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import { cancerViz } from '../data/cancerviz';
import { ResponsiveLine } from '@nivo/line'
import { ResponsivePie } from '@nivo/pie'

const CustomTooltip = ({ point }) => (
    <div style={{ background: 'white', padding: '5px', border: '1px solid #ccc' }}>
        <strong>Series:</strong> {point.serieId}<br />
        <strong>Year:</strong> {point.data.xFormatted}<br />
        <strong>Incidence:</strong> {point.data.yFormatted}
    </div>
);

const CancerIncidenceLineChart = ({ data }) => (
    <ResponsiveLine
        data={data}
        margin={{ top: 10, right: 120, bottom: 80, left: 80 }}
        xScale={{ type: 'point' }}
        yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false
        }}
        yFormat=" >-.2f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -90,
            legend: 'Year',
            legendOffset: 54,
            legendPosition: 'middle',
            truncateTickAt: 0
        }}
        axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Incidence Count',
            legendOffset: -70,
            legendPosition: 'middle',
            truncateTickAt: 0
        }}
        pointSize={4}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabel="data.yFormatted"
        pointLabelYOffset={-12}
        enableTouchCrosshair={true}
        useMesh={true}
        colors={{ scheme: 'dark2' }}
        legends={[
            {
                anchor: 'top-right',
                direction: 'column',
                justify: false,
                translateX: 100,
                translateY: 0,
                itemsSpacing: 0,
                itemDirection: 'left-to-right',
                itemTextColor: '#000',
                itemWidth: 80,
                itemHeight: 20,
                itemOpacity: 1,
                symbolSize: 12,
                symbolShape: 'circle',
                symbolBorderColor: 'rgba(0, 0, 0, .5)',
            }
        ]}
        tooltip={CustomTooltip}
    />
)

const CancerIncidencePieChart = ({ data }) => (
    <ResponsivePie
        data={data}
        margin={{ top: 10, right: 80, bottom: 100, left: 0 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{
            from: 'color',
            modifiers: [
                [
                    'darker',
                    0.2
                ]
            ]
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
            from: 'color',
            modifiers: [
                [
                    'darker',
                    2
                ]
            ]
        }}
        colors={{ scheme: 'tableau10' }}
        legends={[
            {
                anchor: 'top-right',
                direction: 'column',
                justify: false,
                translateX: 80,
                translateY: 0,
                itemsSpacing: 0,
                itemWidth: 100,
                itemHeight: 18,
                itemTextColor: '#000',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 12,
                symbolShape: 'circle',
            }
        ]}
    />
)

const Visualisations = [
    {
        title: "yearly cancer incidents",
        chart: <CancerIncidenceLineChart data={cancerViz.casesPerYear}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "leading cancer sites in the female population",
        chart: <CancerIncidencePieChart data={cancerViz.casesBySiteFemale}></CancerIncidencePieChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "leading cancer sites in the male population",
        chart: <CancerIncidencePieChart data={cancerViz.casesBySiteMale}></CancerIncidencePieChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "yearly incidents in leading sites in the female population",
        chart: <CancerIncidenceLineChart data={cancerViz.femaleCasesPerYearBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "yearly incidents in leading sites in the male population",
        chart: <CancerIncidenceLineChart data={cancerViz.maleCasesPerYearBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "incidents per age group",
        chart: <CancerIncidenceLineChart data={cancerViz.totalCasesPerAgeGroupBySex}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "leading sites in the female population per age group",
        chart: <CancerIncidenceLineChart data={cancerViz.femaleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "leading cancer sites in the male population per age group",
        chart: <CancerIncidenceLineChart data={cancerViz.maleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
];

export default class CancerViz extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentPage: 1,
            blogsPerPage: 1
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
        return Math.ceil(Visualisations.length / this.state.blogsPerPage);
    };

    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Exploring cancer dataset from CDC Wonder | blog by Pranshu Gupta";
    }

    render() {
        const { currentPage, blogsPerPage } = this.state;
        const indexOfLastBlog = currentPage * blogsPerPage;
        const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
        const currentVisualizations = Visualisations.slice(indexOfFirstBlog, indexOfLastBlog);

        const pageNumbers = [];
        for (let i = 1; i <= this.totalPages(); i++) {
            pageNumbers.push(i);
        }

        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-staff-snake bigger gt1"></i>
                </div>
                <h1 className="title">Exploring cancer dataset from CDC Wonder</h1>
                <p>Pranshu Gupta, Dec 5, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Exploring cancer dataset from CDC Wonder"}></Sharer>
                <p className="introduction">
                    The United States Cancer Statistics (USCS) online databases in WONDER provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends and patterns in cancer incidences across the United States of America for leading cancer sites in the human body.
                    <br></br>
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2>Key Cancer Statistics</h2>
                <p>
                    The visualizations below are based on the CDC WONDER Cancer Incidence dataset from 2001 to 2021, for all the states in the United States and Puerto Rico. We look at the cancer statistics the across different dimesnions such as sex, age group, calendar year, and leading cancer sites in the human body.
                </p>
                <br></br>
                <div className="pagination" style={{ justifyContent: 'left' }}>
                    <button style={{ marginRight: "10px", width: '100%' }} className="btn btn-light">
                        {
                            currentVisualizations.map((viz, index) => (
                                <div key={index} className='paginationIcon'>
                                    <h6 style={{ textAlign: 'left' }}>{viz.title}</h6>
                                </div>
                            ))
                        }
                    </button>
                    <button style={{ marginRight: "10px" }} className="btn btn-dark" onClick={this.handlePreviousPage} disabled={currentPage === 1}>
                        <i className="fas fa-arrow-left paginationIcon" title={`go to previous chart`}></i>
                    </button>
                    <button style={{ marginRight: "10px" }} className="btn btn-dark" onClick={this.handleNextPage} disabled={currentPage === this.totalPages()}>
                        <i className="fas fa-arrow-right paginationIcon" title={`go to next chart`}></i>
                    </button>
                </div>
                <br></br>
                {
                    currentVisualizations.map((viz, index) => (
                        <div key={index}>
                            <div style={{ height: '30rem' }}>
                                {viz.chart}
                            </div>
                            <p>{viz.description}</p>
                        </div>
                    ))
                }
                <hr style={{ backgroundColor: "white" }}></hr>
                <h5>Acknowledgements</h5>
                <p>
                    United States Cancer Statistics - Incidence: 1999 - 2021, WONDER Online Database. United States Department of Health and Human Services, Centers for Disease Control and Prevention and National Cancer Institute; 2023 submission; 2024 release. Accessed at http://wonder.cdc.gov/cancer-v2021.html on Dec 1, 2024.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
            </div>
        )
    }
}