import React from "react";
import { ResponsiveLine } from "@nivo/line";

const CustomSymbol = ({ size, color, borderWidth, borderColor }) => (
    <g>
        <circle
            r={size / 5}
            strokeWidth={borderWidth}
            stroke={borderColor}
            fill={color}
            fillOpacity={0.35}
        />
    </g>
)

class LineChart extends React.Component {
    render() {
        const { data, ylabel, legend_loc } = this.props;
        return (
            <ResponsiveLine
                data={data}
                enableGridX={false}
                enableGridY={false}
                margin={{ top: 50, right: 102, bottom: 50, left: 44 }}
                curve={'monotoneX'}
                xScale={{
                    type: 'time',
                    format: '%Y-%m-%d',
                    precision: 'month',
                }}
                xFormat="time:%b %Y"
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    format: '%b %Y'
                }}
                axisLeft={{
                    orient: 'left',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: ylabel,
                    legendOffset: -40,
                    legendPosition: 'middle'
                }}
                pointSymbol={CustomSymbol}
                colors={{ datum: 'color' }}
                pointSize={10}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                pointLabel="y"
                pointLabelYOffset={-12}
                useMesh={true}
                legends={[
                    {
                        anchor: legend_loc,
                        direction: 'row',
                        justify: false,
                        translateX: 100,
                        translateY: -10,
                        itemsSpacing: 0,
                        itemDirection: 'left-to-right',
                        itemWidth: 80,
                        itemHeight: 20,
                        itemOpacity: 0.75,
                        symbolSize: 12,
                        symbolShape: 'circle',
                        symbolBorderColor: 'rgba(0, 0, 0, .5)'
                    }
                ]}
            />
        );
    }
}

export default LineChart;
