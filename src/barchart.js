import React from "react";
import { ResponsiveBar } from "@nivo/bar";

// Nivo theming
const theme = {
    axis: {
        ticks: {
            line: {
                stroke: "#e9ecee",
                strokeWidth: 0
            },
            text: {
                fill: "#919eab",
                fontFamily: "Nunito"
            }
        }
    },
    grid: {
        line: {
            stroke: "#e9ecee",
            strokeWidth: 0.5
        }
    },
    legends: {
        text: {
            fontFamily: "Nunito"
        }
    }
};

class BarChart extends React.Component {
    render() {
        const { data, keys, index, groupMode, colors, tickValues, colorBy, customTooltip, layout } = this.props;

        return (
            <ResponsiveBar
                theme={theme}
                data={data}
                keys={keys}
                indexBy={index}
                groupMode={groupMode}
                margin={{
                    top: 36,
                    right: 32,
                    bottom: 36,
                    left: 32
                }}
                layout={layout}
                padding={0.5}
                colors={colors}
                colorBy={colorBy}
                borderColor="#919eab"
                axisBottom={{
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "",
                    legendPosition: "middle",
                    legendOffset: 36
                }}
                axisLeft={{
                    tickValues: tickValues,
                    orient: "left",
                    tickPadding: 0,
                    tickRotation: 0,
                    legend: "",
                    legendPosition: "start",
                    legendOffset: -40
                }}
                enableGridY={true}
                gridYValues={tickValues}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor="#fff"
                enableLabel={false}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
                tooltip={customTooltip ? customTooltip : null}
            />
        );
    }
}

export default BarChart;
