// With help from http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
// Data from https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html
// Converted to geoJSON with https://mygeodata.cloud/converter/

const covidDataURL = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv";
const worldJSON = "world.geo.json"

Promise.all([d3.json(worldJSON), d3.csv(covidDataURL)])
    .then(result => {
        let countries = result[0],
            covidData = result[1];


        // Reshape from wide to long format.
        let covidDataLong = [];
        let goodCols = ["Country/Region", "Province/State", "Lat", "Long"]
        covidData.forEach(row => {
            for (let colname in row) {
                if (!goodCols.includes(colname)) {
                    covidDataLong.push({
                        "Country/Region": row["Country/Region"],
                        "Province/State": row["Province/State"],
                        "Lat": row["Lat"],
                        "Long": row["Long"],
                        "Date": colname,
                        "Cases": +row[colname],
                    })
                }
            }
        })

        // Prefer a for-loop inside the forEach so we can break out and minimize iterations.
        covidDataLong.forEach(covidRow => {
            for (index = 0; index < countries.features.length; index++) {
                let thisProps = countries.features[index].properties;
                let jsonState = thisProps["name"];
                if (covidRow["Province/State"] === jsonState) {
                    thisProps[covidRow["Date"]] = +covidRow["Cases"];
                    break
                }
            }
        })

        // let casesOnly = covidDataLong.map(d => d.Cases);

        const width = 900;
        const height = 500;
        let svg = d3.select("div.map-container")
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .classed("svg-content", true);

        let projection = d3.geoNaturalEarth1().translate([width / 2, height / 2]);
        let path = d3.geoPath().projection(projection);

        // Is order guaranteed here? Probably not, but it works for now.
        let uniqueDates = d3.map(covidDataLong, d => d.Date).keys()
        let latestDate = uniqueDates.slice(-1)[0];

        // Bind the data to the SVG and create one path per GeoJSON feature
        svg.append("g")
            .selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country-state");

        const factor = 0.5;

        svg
            .selectAll("caseCircles")
            .data(covidData)
            .enter()
            .append("circle")
            .attr("class", "circle")
            .attr("cx", d => projection([d.Long, d.Lat])[0])
            .attr("cy", d => projection([d.Long, d.Lat])[1])
            .attr("r", d => Math.sqrt(d[latestDate]) * factor)

        d3.select(".date-output")
            .text(latestDate)

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
