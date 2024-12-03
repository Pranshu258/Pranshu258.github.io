import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import cdclogo from '../images/cdclogo.png';
import datagovlogo from '../images/datagov.png';
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
                itemTextColor: '#000',
                itemWidth: 80,
                itemHeight: 20,
                itemOpacity: 0.75,
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
        margin={{ top: 40, right: 80, bottom: 100, left: 0 }}
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
        legends={[
            {
                anchor: 'bottom-right',
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
                <div style={{height: '300px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per year</h6>
                    <CancerIncidenceLineChart data={cancerViz.casesPerYear}></CancerIncidenceLineChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences by sites (Female)</h6>
                    <CancerIncidencePieChart data={cancerViz.casesBySiteFemale}></CancerIncidencePieChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences by sites (Male)</h6>
                    <CancerIncidencePieChart data={cancerViz.casesBySiteMale}></CancerIncidencePieChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Female) per year by sites</h6>
                    <CancerIncidenceLineChart data={cancerViz.femaleCasesPerYearBySite}></CancerIncidenceLineChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Male) per year by sites</h6>
                    <CancerIncidenceLineChart data={cancerViz.maleCasesPerYearBySite}></CancerIncidenceLineChart>
                </div>
                <div style={{height: '300px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences per age group by sex</h6>
                    <CancerIncidenceLineChart data={cancerViz.totalCasesPerAgeGroupBySex}></CancerIncidenceLineChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Female) per age group by sites</h6>
                    <CancerIncidenceLineChart data={cancerViz.femaleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>
                </div>
                <div style={{height: '500px', minWidth: '720px'}}>
                    <h6 style={{textAlign: 'center'}}>Total cancer incidences (Male) per age group by sites</h6>
                    <CancerIncidenceLineChart data={cancerViz.maleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>
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