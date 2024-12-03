import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import cdclogo from '../images/cdclogo.png';
import datagovlogo from '../images/datagov.png';
import { cancerViz } from '../data/cancerviz';
import { ResponsiveLine } from '@nivo/line'

const CustomTooltip = ({ point }) => (
    <div style={{ background: 'white', padding: '5px', border: '1px solid #ccc' }}>
        <strong>Series:</strong> {point.serieId}<br />
        <strong>Year:</strong> {point.data.xFormatted}<br />
        <strong>Incidence:</strong> {point.data.yFormatted}
    </div>
);

const YearlyIncidenceVisualization = ({ data }) => (
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
            tickRotation: 0,
            legend: 'Year',
            legendOffset: 36,
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
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 100,
                translateY: 0,
                itemsSpacing: 0,
                itemDirection: 'left-to-right',
                itemWidth: 80,
                itemHeight: 20,
                itemOpacity: 0.75,
                symbolSize: 12,
                symbolShape: 'circle',
                symbolBorderColor: 'rgba(0, 0, 0, .5)',
                effects: [
                    {
                        on: 'hover',
                        style: {
                            itemBackground: 'rgba(0, 0, 0, .03)',
                            itemOpacity: 1
                        }
                    }
                ]
            }
        ]}
        tooltip={CustomTooltip}
    />
)

export default class CancerViz extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Exploring cancer dataset from CDC Wonder | blog by Pranshu Gupta";
    }

    render() {
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
                <h2>Introduction</h2>
                <div style={{height: '320px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per year (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.casesPerYear}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '400px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per year by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.casesPerYearBySite}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '400px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Female) per year by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.femaleCasesPerYearBySite}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '400px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Male) per year by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.maleCasesPerYearBySite}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '320px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per age group (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.totalCasesPerAgeGroup}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '320px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per age group by sex (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.totalCasesPerAgeGroupBySex}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '320px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per age group by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.totalCasesPerAgeGroupBySite}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '400px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Female) per age group by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.femaleCasesPerAgeGroupBySite}></YearlyIncidenceVisualization>
                </div>
                <div style={{height: '400px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Male) per age group by sites (2001-2021)</h6>
                    <YearlyIncidenceVisualization data={cancerViz.maleCasesPerAgeGroupBySite}></YearlyIncidenceVisualization>
                </div>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h5>Acknowledgements</h5>
                <p>
                    This article was made possible by the data collected and published for the people by the Centers for Disease Control and Prevention (CDC) and the data.gov initiative.<br></br>
                    <code>
                        <b>
                            Citation: United States Cancer Statistics - Incidence: 1999 - 2021, WONDER Online Database. United States Department of Health and Human Services, Centers for Disease Control and Prevention and National Cancer Institute; 2023 submission; 2024 release. Accessed at http://wonder.cdc.gov/cancer-v2021.html on Dec 1, 2024.
                        </b>
                    </code>
                </p>
                <img src={cdclogo} style={{ height: '40px', marginRight: '10px' }} alt="CDC Logo" className="img-fluid"></img>
                <img src={datagovlogo} style={{ height: '40px', marginRight: '10px' }} alt="data gov Logo" className="img-fluid"></img>
                <hr style={{ backgroundColor: "white" }}></hr>
            </div>
        )
    }
}