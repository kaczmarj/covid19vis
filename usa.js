const countyData = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv";
const countyGeo = "cb_2018_us_county_20m.geojson";
const populationData = "cc-population-est2018-alldata.csv";

Promise.all([d3.json(countyGeo), d3.csv(countyData), d3.csv(populationData)])
    .then(result => {
        let geo = result[0],
            data = result[1],
            populations = result[2];

        // Move covid case data to geojson object.
        for (let gi = 0; gi < geo.features.length; gi++) {
            let thisProp = geo.features[gi].properties;
            thisProp["fips"] = thisProp["STATEFP"] + thisProp["COUNTYFP"];

            // Find the population of this county.
            for (let pi = 0; pi < populations.length; pi++) {
                if (populations[pi]["fips"] == thisProp["fips"]) {
                    thisProp["population"] = +populations[pi]["population"];
                    break;
                }
            }

            // Find the covid case data for this county.
            for (let di = 0; di < data.length; di++) {
                let thisData = data[di];
                if (thisProp["fips"] === thisData["fips"]) {
                    let date = thisData["date"].replace(/-/g, "/")
                    thisProp[date] = {
                        "cases": +thisData["cases"],
                        "casesNorm": +thisData["cases"] / thisProp["population"] * 100000,
                        "deaths": + thisData["deaths"],
                        "deathsNorm": +thisData["deaths"] / thisProp["population"] * 100000,
                    };
                    // Do not break out of the loop early because there are multiple
                    // rows (dates) per county.
                }
            }
        }

        let width = 900,
            height = 500,
            projection = d3.geoAlbersUsa().translate([width / 2, height / 2]),
            path = d3.geoPath().projection(projection),
            svg = d3.select("div.usa-container")
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .classed("svg-content", true);

        console.log(data[0]);
        console.log(geo.features[100].properties);

        let maxCases = d3.max(data, d => +d["cases"]);
        let scale = d3.scaleLinear().domain([0, 1000]).range(["purple", "yellow"]).clamp(true);

        svg
            .append("g")
            .selectAll("path")
            .data(geo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country-state")
            .style("stroke-width", "0.15")
            .style("fill", d => {
                d = d.properties["2020/03/31"];
                if (d) {
                    return scale(d["cases"]);
                }
                return "gray";
            });

        // console.log(geo.features[100].properties["2020/03/30"]);

    })
    .catch(e => console.error(e));
