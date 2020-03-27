// With help from http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922

const covidDataURL = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv?date=${(new Date()).getUTCDate()}`;
const worldJSON = "countries.geo.json"

Promise.all([d3.json(worldJSON), d3.csv(covidDataURL)])
    .then(result => {

        let countries = result[0],
            covidData = result[1],
            factor = 0.37,  // Controls how large circles are.
            width = 900,
            height = 500,
            projection = d3.geoNaturalEarth1().translate([width / 2, height / 2]),
            path = d3.geoPath().projection(projection),
            uniqueDates = covidData.columns.slice(4),
            latestDate = uniqueDates.slice(-1)[0],
            dataOnHover = null,  // Object with data of location on hover.
            svg = d3.select("div.map-container")
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .classed("svg-content", true);

        let globalCases = {};
        for (j = 0; j < uniqueDates.length; j++) {
            let thisDate = uniqueDates[j];
            globalCases[thisDate] = d3.sum(covidData, d => d[thisDate]);
        }

        // Remove entries that do not correspond to their true location.
        // For example, cases on cruise ships.
        covidData = covidData.filter(d => (d.Long != 0) && (d.Lat != 0))

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
            .on("mouseover", (d, i, n) => {
                d3.select(n[i]).style("stroke-width", "0.3")
                let date = uniqueDates[d3.select("input.dater").property("value")];
                setHeader(date, d[date], getLocation(d));
                dataOnHover = d
            })
            .on("mouseout", (d, i, n) => {
                d3.select(n[i]).style("stroke-width", null);
                let date = uniqueDates[d3.select("input.dater").property("value")];
                setHeader(date, globalCases[date], "the world");
                dataOnHover = null;
            });

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
                if (dataOnHover === null) {
                    setHeader(date, globalCases[date], "the world");
                } else { // User has mouse over a location's bubble.
                    let location = getLocation(dataOnHover);
                    setHeader(date, dataOnHover[date], location)
                }

            });

        function getLocation(d) {
            if (d["Province/State"]) {
                return `${d["Province/State"]}, ${d["Country/Region"]}`;
            } else {
                return d["Country/Region"];
            }
        }

        function setHeader(date, cases, location) {
            cases = Number(+cases).toLocaleString();
            d3.select(".date-output")
                .text(`${date} ${cases} confirmed cases in ${location}`);
        }

        setHeader(latestDate, globalCases[latestDate], "the world");


    })
    .catch(err => console.error(err));
