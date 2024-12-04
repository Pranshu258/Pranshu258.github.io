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
        <strong>Count:</strong> {point.data.yFormatted}
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
        margin={{ top: 10, right: 80, bottom: 70, left: 0 }}
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
                anchor: 'right',
                direction: 'column',
                justify: false,
                translateX: 30,
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
        title: "Incidents/Site (Male)",
        chart: <CancerIncidencePieChart data={cancerViz.casesBySiteMale}></CancerIncidencePieChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "Incidents/Year/Site (Female)",
        chart: <CancerIncidenceLineChart data={cancerViz.femaleCasesPerYearBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "Incidents/Year/Site (Male)",
        chart: <CancerIncidenceLineChart data={cancerViz.maleCasesPerYearBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "Incidents/Age Group/Sex",
        chart: <CancerIncidenceLineChart data={cancerViz.totalCasesPerAgeGroupBySex}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "Incidents/Age Group/Sites (Female)",
        chart: <CancerIncidenceLineChart data={cancerViz.femaleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
    {
        title: "Incidents/Age Group/Sites (Male)",
        chart: <CancerIncidenceLineChart data={cancerViz.maleCasesPerAgeGroupBySite}></CancerIncidenceLineChart>,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor, nunc nec"
    },
];

export default class CancerViz extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentPieChart: "Total",
        };
    }

    showMalePieChart = () => {
        this.setState({ currentPieChart: "Male" });
    };

    showFemalePieChart = () => {
        this.setState({ currentPieChart: "Female" });
    };

    showTotalPieChart = () => {
        this.setState({ currentPieChart: "Total" });
    };

    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Statistical Insights on Cancer in America | blog by Pranshu Gupta";
    }

    render() {
        const { currentPieChart } = this.state;

        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-staff-snake bigger gt1"></i>
                </div>
                <h1 className="title">Statistical insights on Cancer in America</h1>
                <p>Pranshu Gupta, Dec 5, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Statistical insights on Cancer in America"}></Sharer>
                <p className="introduction">
                    The United States Cancer Statistics (USCS) online databases in WONDER provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends and patterns in cancer incidences across the United States of America for leading cancer sites in the human body.
                    <br></br>
                </p>
                <p style={{backgroundColor: "pink", padding: '10px', borderRadius: '8px'}}>
                    <b>Note:</b> I am not a medical expert and the information provided in this article is based on publicly available data and research. Please consult a healthcare professional for any medical advice.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2>What is Cancer?</h2>
                <p>

                </p>
                <h2>Is Cancer on the Rise?</h2>
                <p>
                    The chart below shows the number of cases reported each year from 2001 to 2021. The number of reported incidents of cancer in the country has been increasing over the years. Part of it can be attributed to better mechanisms to detect cancer accurately and early, and increased efforts to improve the healthcare infrastructure so that cases do not go undocumented.
                </p>
                <div style={{ height: '25rem' }}>
                    <CancerIncidenceLineChart data={cancerViz.casesPerYear}></CancerIncidenceLineChart>
                </div>
                <p>
                    However, there are other factors that have contributed to the rise in cancer cases:
                    <ul>
                        <li>Increased exposure of environmental carcinogens due to pollution also contributes to rise in cases.</li>
                        <li>Modern lifestyle choices such as smoking, excessive alcohol consumption have also been linked to higher cancer rates.</li>
                        <li>Advances in healthcare and medicine have allowed people to live longer. As cancer is more common in older adults, an aging population would lead to more cases.</li>
                    </ul>
                </p>
                <p>
                    In the chart above, we can see that the number of cases reported for men is higher than that in women. This has been linked to higher rates of smoking and alcohol consumption among men, and occupational exposure to carcinogens at work, as men are often employed in industries that expose them to harmful chemicals.
                </p>
                <p>
                    A recent study by the Dana-Farber Cancer Institute has uncovered some genetic factors that lead to higher cancer rates in men. For instance, <b>the X chromosome has a gene called 'KDM6A' which is responsible for suppressing tumors.</b> Since the female body has two X chromosomes, it has a backup copy of the gene, making it less susceptible to Leukemia. In contrast, the male body has only one X chromosome.
                </p>
                <p>
                    Another thing to note is the decrease of cancer cases in the year 2020. <b>The COVID-19 pandemic led to a decrease in cancer screenings and diagnoses, as many healthcare facilities halted their services to reduce the risk of viral transmission.</b>
                </p>
                <p>
                    That being said, there is hope, as the risk of dying from cancer has declined steadily over the past few decades. This has been attributed to advancements in detection and treatment processes, and smoking cessation. This is a testament to the progress made in cancer research and treatment.
                </p>
                <h2>What are the leading types of Cancer?</h2>
                <br></br>
                <div className="pagination" style={{ justifyContent: 'left' }}>
                    <button style={{ marginRight: "10px" }} className={currentPieChart === "Total" ? "btn btn-dark" : "btn btn-light"} onClick={this.showTotalPieChart} active={currentPieChart === "Total"}>
                        Total
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentPieChart === "Female" ? "btn btn-dark" : "btn btn-light"} onClick={this.showFemalePieChart} active={currentPieChart === "Female"}>
                        Female
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentPieChart === "Male" ? "btn btn-dark" : "btn btn-light"} onClick={this.showMalePieChart}>
                        Male
                    </button>
                </div>
                <div style={{ height: '30rem', minWidth: '50rem'}}>
                    <CancerIncidencePieChart data={currentPieChart === "Female" ? cancerViz.casesBySiteFemale : (currentPieChart === "Total" ? cancerViz.casesBySite : cancerViz.casesBySiteMale)}></CancerIncidencePieChart>
                </div>
                <p>
                    Overall, breast cancer is the most common type of cancer in humans, followed by lung and bronchus cancer. 99% of breast cancer cases are found in women due to several reasons such as, higher number of breast tissue in women, influence of estrogen and progesterone hormones (which are more active in the female body), and genetic factors (mutations in BRCA1 and BRCA2). Mutations in BRCA1 and BRCA2 genes affect the male body as well, and can lead to prostate cancer, which is the most common cancer type in men.
                </p>
                <p>
                    Similarly, the number of thyroid cancer cases is much higher in women compared to men. It is believed that hormones such as estrogen, play a significant role in the development of thyroid cancer. Women are prone to thyroid disorders in general, and tumors are often detected early during the course of other treatments. Early detection and easier treatment options have led to a high survival rate for most thyroid cancers.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2>References</h2>
                <ol>
                    <li>https://www.cancer.org/research/acs-research-news/facts-and-figures-2024.html</li>
                    <li>https://www.mcleodhealth.org/blog/why-are-cancer-rates-rising/</li>
                    <li>https://blog.dana-farber.org/insight/2018/10/men-likely-women-develop-cancer-course-lives/</li>
                    <li>https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-cancer/thyroid-cancer-what-women-should-know</li>
                    <li>https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-disorders-in-women</li>
                    <li>https://www.mayoclinic.org/diseases-conditions/thyroid-cancer/symptoms-causes/syc-20354161</li>
                </ol>
                <h5>Acknowledgements</h5>
                <p>
                    United States Cancer Statistics - Incidence: 1999 - 2021, WONDER Online Database. United States Department of Health and Human Services, Centers for Disease Control and Prevention and National Cancer Institute; 2023 submission; 2024 release. Accessed at http://wonder.cdc.gov/cancer-v2021.html on Dec 1, 2024.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <p>
                    The code for data analysis/visualization used in this article is available as a jupyter notebook on GitHub.<br></br>
                </p>
                <a target="_blank" rel="noopener noreferrer" style={{ color: "black", textDecoration: "none" }} href="https://github.com/Pranshu258/CDC-Cancer-Incidence-Analysis"><button className="btn btn-warning"><i class="fab fa-github"></i><b style={{ padding: "10px" }}>Open GitHub Repo</b><i class="fas fa-external-link-alt"></i></button></a>
                <hr style={{ backgroundColor: "white" }}></hr>
            </div>
        )
    }
}