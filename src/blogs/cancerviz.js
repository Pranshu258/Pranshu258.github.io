import React, {useState} from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import { cancerViz } from '../data/cancerviz';
import { ResponsiveLine } from '@nivo/line'
import { ResponsivePie } from '@nivo/pie'
import { schemeDark2 } from 'd3-scale-chromatic';

const CustomTooltip = ({ point }) => (
    <div style={{ background: 'white', padding: '5px', border: '1px solid #ccc' }}>
        <strong>Series:</strong> {point.serieId}<br />
        <strong>Year:</strong> {point.data.xFormatted}<br />
        <strong>Count:</strong> {point.data.yFormatted}
    </div>
);

const CancerIncidenceLineChart = ({ data }) => {
    const [selectedSeries, setSelectedSeries] = useState(null);

    const handleLegendClick = (series) => {
        setSelectedSeries(series.id === selectedSeries ? null : series.id);
    };

    const colorScheme = schemeDark2;

    const coloredData = data.map((series, index) => ({
        ...series,
        color: colorScheme[index % colorScheme.length]
    }));

    const filteredData = selectedSeries ? coloredData.filter(d => d.id === selectedSeries) : coloredData;

    const legendData = coloredData.map(series => ({
        id: series.id,
        label: series.id,
        color: series.color
    }));

    return (
        <ResponsiveLine
            data={filteredData}
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
            colors={d => d.color}
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
                    onClick: handleLegendClick,
                    data: legendData
                }
            ]}
            tooltip={CustomTooltip}
        />
    )
} 

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

export default class CancerViz extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentPieChart: "Total",
            currentSiteLineChart: "Total",
            currentAgeSiteLineChart: "Total"
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

    showMaleSiteLineChart = () => {
        this.setState({ currentSiteLineChart: "Male" });
    };

    showFemaleSiteLineChart = () => {
        this.setState({ currentSiteLineChart: "Female" });
    };

    showTotalSiteLineChart = () => {
        this.setState({ currentSiteLineChart: "Total" });
    };

    showMaleAgeSiteLineChart = () => {
        this.setState({ currentAgeSiteLineChart: "Male" });
    };

    showFemaleAgeSiteLineChart = () => {
        this.setState({ currentAgeSiteLineChart: "Female" });
    };

    showTotalAgeSiteLineChart = () => {
        this.setState({ currentAgeSiteLineChart: "Total" });
    };

    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Statistical insights on Cancer in America | blog by Pranshu Gupta";
    }

    render() {
        const { currentPieChart, currentSiteLineChart, currentAgeSiteLineChart } = this.state;

        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-staff-snake bigger gt1"></i>
                </div>
                <h1 className="title">Statistical insights on Cancer in America</h1>
                <p>Pranshu Gupta, Dec 5, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Statistical insights on Cancer in America"}></Sharer>
                <p className="introduction">
                    Cancer is a group of diseases characterized by abnormal and uncontrolled growth of cells, that can invade and spread to other parts of the body. The United States Cancer Statistics (USCS) online databases in WONDER provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends and patterns in cancer incidences across the United States of America for leading cancer sites in the human body.
                    <br></br>
                </p>
                <p style={{backgroundColor: "pink", padding: '10px', borderRadius: '8px'}}>
                    <b>Note:</b> I am not a medical expert and the information provided in this article is based on publicly available data and research. Please consult a healthcare professional for any medical advice.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2>What is Cancer?</h2>
                <p>
                    Cell growth, division and cell death are critical but tightly regulated processes in the human body. Sometimes, this process breaks down and damaged cells can start to multiply and grown when they shouldn't. Such growths are called tumors, and can be benign (non-cancerous) or malignant (cancerous). Tumors become cancerous when they start invading nearby tissues and spreading to other parts of the body, a process called metastasis.
                </p>
                <p>
                    The immune system can usually identify damaged cells and destroy them when needed. However, this ability weakens as we grown older, which is why cancer is more common in older adults. Certain mutations in the DNA can also lead to cancer. These mutations can be inherited from parents, or can be caused by environmental factors such as exposure to radiation, chemicals, or viruses.
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
                        <li>Increased exposure of environmental carcinogens due to pollution.</li>
                        <li>Modern lifestyle choices such as smoking, excessive alcohol consumption.</li>
                        <li>Advances in healthcare and medicine have allowed people to live longer. As cancer is more common in older adults, an aging population would lead to more cases.</li>
                    </ul>
                </p>
                <p>
                    Some key observations we can make from the above chart are:
                    <ol>
                        <li>
                        In the chart above, we can see that the number of cases reported for men is higher than that in women. This has been linked to higher rates of smoking and alcohol consumption among men, and occupational exposure to carcinogens at work, as men are often employed in industries that expose them to harmful chemicals.
                        </li>
                        <li>
                        A recent study by the Dana-Farber Cancer Institute has uncovered some genetic factors that lead to higher cancer rates in men. For instance, <b>the X chromosome has a gene called 'KDM6A' which is responsible for suppressing tumors.</b> Since the female body has two X chromosomes, it has a backup copy of the gene, making it less susceptible to Leukemia. In contrast, the male body has only one X chromosome.
                        </li>
                        <li>
                        Another thing to note is the decrease of cancer cases in the year 2020. <b>The COVID-19 pandemic led to a decrease in cancer screenings and diagnoses, as many healthcare facilities halted their services to reduce the risk of viral transmission.</b>
                        </li>
                    </ol>
                </p>
                <p>
                    That being said, there is hope, as the risk of dying from cancer has declined steadily over the past few decades. This has been attributed to advancements in detection and treatment processes, and smoking cessation. It is a testament to the progress made in cancer research and treatment.
                </p>
                <h2>What are the leading types of Cancer?</h2>
                <p>
                    The most common types of cancer reported in the United States are breast cancer, lung and bronchus cancer, and prostate cancer. The charts below show the number of cases reported for the leading cancer sites in the human body, both male and female.
                </p>
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
                    The second most common cancer type is lung and bronchus cancer, which is common across both the sexes. Lung cancer is primarily caused by smoking (including passive smoking). <b>Radon exposure and increasing air pollution levels have also contributed to the rise in cases for lung cancer.</b>
                </p>
                <p>
                    Similarly, the number of thyroid cancer cases is much higher in women compared to men. It is believed that hormones such as estrogen, play a significant role in the development of thyroid cancer. Women are prone to thyroid disorders in general, and tumors are often detected early during the course of other treatments. Early detection and easier treatment options have led to a high survival rate for most thyroid cancers.
                </p>
                <div className="pagination" style={{ justifyContent: 'left' }}>
                    <button style={{ marginRight: "10px" }} className={currentSiteLineChart === "Total" ? "btn btn-dark" : "btn btn-light"} onClick={this.showTotalSiteLineChart}>
                        Total
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentSiteLineChart === "Female" ? "btn btn-dark" : "btn btn-light"} onClick={this.showFemaleSiteLineChart}>
                        Female
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentSiteLineChart === "Male" ? "btn btn-dark" : "btn btn-light"} onClick={this.showMaleSiteLineChart}>
                        Male
                    </button>
                </div>
                <br></br>
                <div style={{ height: '30rem'}}>
                    <CancerIncidenceLineChart data={currentSiteLineChart === "Female" ? cancerViz.femaleCasesPerYearBySite : (currentSiteLineChart === "Total" ? cancerViz.casesPerYearBySite : cancerViz.maleCasesPerYearBySite)}></CancerIncidenceLineChart>
                </div>
                <p>
                    The charts below show the number of cases reported each year for the leading cancer sites in the human body. Some key observations we can make from the above chart are:
                    <ol>
                        <li>
                        <b>Policies and laws can also affect the number of reported cancer cases. For example, in 2012 the US Preventive Services Task Force recommended against routine prostate-specific antigen (PSA) testing for prostate cancer.</b> At the time, the opinion was that the risks of overdiagnosis and overtreatment outweighed the benefits of early detection. As fewer men were screened for prostate cancer, the number of reported cases also decreased, which can be seen in the above chart.
                        </li>
                        <li>
                        However, the American Cancer Society and other organizations revised their guidelines in 2014, to recommend shared decision-making between patients and healthcare providers regarding PSA testing, after which the more cases are being identified.
                        </li>
                        <li>
                        The number of cases of colorectal cancer has decreased year over year, which can be attributed to increased awareness and screening programs. Regular screening helps detect and remove precancerours polyps before they turn into cancer. However, the survival rate for colorectal cancer is lower in men compared to women. Late stage detection and influence of sex hormones is believed to be the reason. 
                        </li>
                        <li>
                        Melanoma has become more common in recent years, and is the leading cause of skin cancer deaths. <b>Increased exposure to UV radiation due to ozone depletion, tanning beds, and changing climate patterns are among some of the factors that led to the rise of melanoma.</b> Light skinned population is at a higher risk of developing melanoma, because of lower melanin levels in their skin (Melanin is a pigment that protects the skin from UV radiation). Some genetic factors also play a role in the development of melanoma. Mutations in the genes such as BRAF, CDKN2A, MC1R and CDK4, can lead to uncontrolled cell growth and division, which can result in melanoma. 
                        </li>
                    </ol>
                </p>
                <h2>How does Cancer affect different age groups?</h2>
                <p>
                    Cancer can affect people of all ages, however, as we grow older, the risk of developing cancer increases. The chart below shows the number of cases reported for different age groups.
                </p>
                <div style={{ height: '25rem'}}>
                    <CancerIncidenceLineChart data={cancerViz.totalCasesPerAgeGroupBySex}></CancerIncidenceLineChart>
                </div>
                <p>
                    However, different types of cancer affect different age groups. For example, thyroid cancer is more common in middle aged adults, while prostate, lung, and colorectal cancers are more common in older adults.
                </p>
                <div className="pagination" style={{ justifyContent: 'left' }}>
                    <button style={{ marginRight: "10px" }} className={currentAgeSiteLineChart === "Total" ? "btn btn-dark" : "btn btn-light"} onClick={this.showTotalAgeSiteLineChart} active={currentAgeSiteLineChart === "Total"}>
                        Total
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentAgeSiteLineChart === "Female" ? "btn btn-dark" : "btn btn-light"} onClick={this.showFemaleAgeSiteLineChart} active={currentAgeSiteLineChart === "Female"}>
                        Female
                    </button>
                    <button style={{ marginRight: "10px" }} className={currentAgeSiteLineChart === "Male" ? "btn btn-dark" : "btn btn-light"} onClick={this.showMaleAgeSiteLineChart}>
                        Male
                    </button>
                </div>
                <br></br>
                <div style={{ height: '30rem'}}>
                    <CancerIncidenceLineChart data={currentAgeSiteLineChart === "Female" ? cancerViz.femaleCasesPerAgeGroupBySite : (currentAgeSiteLineChart === "Total" ? cancerViz.totalCasesPerAgeGroupBySite : cancerViz.maleCasesPerAgeGroupBySite)}></CancerIncidenceLineChart>
                </div>
                <h2>Advances in Cancer Treatment</h2>
                <p>
                    There have been lot of advancements in treatment processes and early detection mechanisms for cancer. Some of the key improvements include:
                </p>
                <h4>Chimeric Antigen Receptor (CAR) T-Cell Therapy</h4>
                <p>
                CAR T-cell therapies involve extracting T-cells from the patient's body and genetically modifying them in a lab so that they become capable of identifying a specific type of cancer cell. These modified T-cells are then infused back into the body are usually able to proliferate after a single infusion. Because the modification helps the T-cell to identify and attack the cancer cells in a targeted way, these treatments have proven to be highly effective for blood cancers like leukemia and lymphoma.
                </p>
                <h4>Tumor Infiltrating Lymphocyte Therapy</h4>
                <p>
                    The immune system can sometimes recognize cancer on its owm and create the T-cells that can attack the cancerous cells. However, often the immune system is unable to mount a strong enough response to eliminate the cancer. TIL therapy involves extracting T-cells from the tumor itself, because such T-cells would have already identified the target cancer cells. Therefore, unlike CAR T-cell therapy, genetic modification is usually not needed. These extracted T-cells are then grown in higher quantities in a lab then infused back into the patient's body, so that the immune system has emough ammunition to fight the tumor. 
                </p>
                <p>
                    Learn more about immunotherapy and other treatment options for cancer on the <a href="https://www.cancer.org/cancer/managing-cancer/treatment-types/immunotherapy.html">American Cancer Society website</a>.
                </p>
                <h2>Conclusion</h2>
                <p>
                    Cancer is a complex disease that affects millions of people around the world. Many organizations and researchers across the world are working tirelessly to find cures for cancer and improve the quality of life for those affected by it. With increased awareness, early screening, and advancements in treatment processes, we are moving towards a better and more hopeful future.  
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2>References</h2>
                <ol>
                    <li><a href='https://www.cancer.gov/about-cancer/understanding/what-is-cancer'>https://www.cancer.gov/about-cancer/understanding/what-is-cancer</a></li>
                    <li><a href="https://www.cancer.org/research/acs-research-news/facts-and-figures-2024.html">https://www.cancer.org/research/acs-research-news/facts-and-figures-2024.html</a></li>
                    <li><a href="https://www.mcleodhealth.org/blog/why-are-cancer-rates-rising/">https://www.mcleodhealth.org/blog/why-are-cancer-rates-rising/</a></li>
                    <li><a href="https://blog.dana-farber.org/insight/2018/10/men-likely-women-develop-cancer-course-lives/">https://blog.dana-farber.org/insight/2018/10/men-likely-women-develop-cancer-course-lives/</a></li>
                    <li><a href="https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-cancer/thyroid-cancer-what-women-should-know">https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-cancer/thyroid-cancer-what-women-should-know</a></li>
                    <li><a href="https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-disorders-in-women">https://www.hopkinsmedicine.org/health/conditions-and-diseases/thyroid-disorders-in-women</a></li>
                    <li><a href="https://www.mayoclinic.org/diseases-conditions/thyroid-cancer/symptoms-causes/syc-20354161">https://www.mayoclinic.org/diseases-conditions/thyroid-cancer/symptoms-causes/syc-20354161</a></li>
                    <li><a href="https://www.lung.org/lung-health-diseases/lung-disease-lookup/lung-cancer/basics/what-causes-lung-cancer<">https://www.lung.org/lung-health-diseases/lung-disease-lookup/lung-cancer/basics/what-causes-lung-cancer</a></li>
                    <li><a href="https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/prostate-cancer-screening">https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/prostate-cancer-screening</a></li>
                    <li><a href="https://www.cancer.org/cancer/types/colon-rectal-cancer/about/key-statistics.html">https://www.cancer.org/cancer/types/colon-rectal-cancer/about/key-statistics.html</a></li>
                    <li><a href="https://www.cancer.org/cancer/types/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html">https://www.cancer.org/cancer/types/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html</a></li>
                    <li><a href="https://www.healthline.com/health/colorectal-cancer-survival-rate#gender-and-outlook">https://www.healthline.com/health/colorectal-cancer-survival-rate#gender-and-outlook</a></li>
                    <li><a href="https://ozonewatch.gsfc.nasa.gov/">https://ozonewatch.gsfc.nasa.gov/</a></li>
                    <li><a href="https://www.skinvision.com/articles/why-melanoma-is-increasing-and-what-we-can-do">https://www.skinvision.com/articles/why-melanoma-is-increasing-and-what-we-can-do</a></li>
                    <li><a href="https://www.skincancer.org/skin-cancer-information/melanoma/melanoma-causes-and-risk-factors/">https://www.skincancer.org/skin-cancer-information/melanoma/melanoma-causes-and-risk-factors/</a></li>
                    <li><a href="https://www.cancer.org/cancer/managing-cancer/treatment-types/immunotherapy/car-t-cell1.html">https://www.cancer.org/cancer/managing-cancer/treatment-types/immunotherapy/car-t-cell1.html</a></li>
                    <li><a href="https://www.mdanderson.org/cancerwise/what-is-tumor-infiltrating-lymphocyte-til-therapy--6-things-to-know.h00-159460056.html">https://www.mdanderson.org/cancerwise/what-is-tumor-infiltrating-lymphocyte-til-therapy--6-things-to-know.h00-159460056.html</a></li>
                </ol>
                <h5>Acknowledgements</h5>
                <p>
                    United States Cancer Statistics - Incidence: 1999 - 2021, WONDER Online Database. United States Department of Health and Human Services, Centers for Disease Control and Prevention and National Cancer Institute; 2023 submission; 2024 release. Accessed at <a href="http://wonder.cdc.gov/cancer-v2021.html">http://wonder.cdc.gov/cancer-v2021.html</a> on Dec 1, 2024.
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