import React from "react";
import { ResponsiveCalendar } from '@nivo/calendar'

class CalendarChart extends React.Component {
    render () {
        let toDate = new Date();
        let fromDate = new Date(toDate.getFullYear()-1, 1, 1);

        const {data} = this.props;
        return (
            <ResponsiveCalendar
                data={data}
                from={fromDate}
                to={toDate}
                emptyColor="#eeeeee"
                colors={[ '#e5f5f9', '#2ca25f']}
                margin={{ top: 10, right: 10, bottom: 40, left: 20 }}
                yearSpacing={40}
                monthBorderColor="#ffffff"
                dayBorderWidth={2}
                dayBorderColor="#ffffff"
                legends={[
                    {
                        anchor: 'bottom-right',
                        direction: 'row',
                        translateY: 36,
                        itemCount: 1,
                        itemWidth: 42,
                        itemHeight: 36,
                        itemsSpacing: 14,
                        itemDirection: 'right-to-left'
                    }
                ]}
            />
        )
    }
}

export default CalendarChart;