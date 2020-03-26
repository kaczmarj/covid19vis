// With help from http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922

const covidDataURL = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv?date=${(new Date()).getUTCDate()}`;
const worldJSON = "countries.geo.json"

Promise.all([d3.json(worldJSON), d3.csv(covidDataURL)])
    .then(result => {

        let countries = result[0],
            covidData = result[1],
            factor = 0.5,
            width = 900,
            height = 500,
            projection = d3.geoNaturalEarth1().translate([width / 2, height / 2]),
            path = d3.geoPath().projection(projection),
            uniqueDates = covidData.columns.slice(4),
            latestDate = uniqueDates.slice(-1)[0],
            svg = d3.select("div.map-container")
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .classed("svg-content", true);

        console.log(countries.features);

        // Bind the data to the SVG and create one path per GeoJSON feature
        svg
            .append("g")
            .selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country-state");

        svg
            .selectAll("caseCircles")
            .data(covidData)
            .enter()
            .append("circle")
            .attr("class", "circle")
            .attr("cx", d => projection([d.Long, d.Lat])[0])
            .attr("cy", d => projection([d.Long, d.Lat])[1])
            .attr("r", d => Math.sqrt(Math.abs(d[latestDate])) * factor)

        d3.select(".date-output")
            .text(latestDate)

        console.log(covidData);

        d3.select("input.dater")
            .attr("min", 0)
            .attr("max", uniqueDates.length - 1)
            .attr("value", uniqueDates.length - 1)
            .attr("step", "1")
            .on("input", function () {
                let date = uniqueDates[+this.value];
                d3.selectAll(".circle")
                    .transition()
                    .attr("r", d => Math.sqrt(d[date]) * factor);
                // Modify text.
                d3.select(".date-output")
                    .text(date)
            });
    })
    .catch(err => console.error(err));
