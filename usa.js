const countyData = `https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv?date=${(new Date()).getUTCDate()}`,
    countyGeo = "cb_2018_us_county_20m.geojson",
    populationData = "cc-population-est2018-alldata.json";

Promise.all([d3.json(countyGeo), d3.csv(countyData), d3.json(populationData)])
    .then(result => {
        const geo = result[0],
            data = result[1],
            populations = result[2];

        // Merge data quickly with lots and lots of help from
        // https://stackoverflow.com/a/60984042/5666087

        const nycFips = "36nyc";
        data.forEach(d => { if (d.county === "New York City") { d.fips = nycFips } });

        const caseValueObjsByFips = {};
        for (const aCase of data) {
            if (!caseValueObjsByFips[aCase.fips]) caseValueObjsByFips[aCase.fips] = {};
            caseValueObjsByFips[aCase.fips][aCase.date] = {
                cases: +aCase.cases,
                deaths: +aCase.deaths,
            };
            if (populations[aCase.fips]) {
                let dn = caseValueObjsByFips[aCase.fips][aCase.date],
                    popn = populations[aCase.fips].population / 100000;
                dn.casesNorm = dn.cases / popn;
                dn.deathsNorm = dn.deaths / popn;
            }
        }

        // Fix for NYC. Geo data includes all five counties, but covid data lists only
        // new york city (sum of five counties).
        const nycCounties = ['36061', '36081', '36047', '36085', '36005'];
        geo.features.forEach(d => {
            d.properties.fips = d.properties.STATEFP + d.properties.COUNTYFP
            if (nycCounties.includes(d.properties.fips)) d.properties.fips = nycFips;
        })
        for (const item of geo.features) {
            Object.assign(item.properties, caseValueObjsByFips[item.properties.fips]);
            Object.assign(item.properties, populations[item.properties.fips]);
        }

        const width = 900,
            height = 500,
            projection = d3.geoAlbersUsa().translate([width / 2, height / 2]),
            path = d3.geoPath().projection(projection),
            svg = d3.select("div.usa-container")
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .classed("svg-content", true);

        const tooltipDiv = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const uniqueDates = d3.set(data.map(d => d.date)).values();
        d3.select("input#usa")
            .attr("min", 0)
            .attr("max", uniqueDates.length - 1)
            .attr("value", uniqueDates.length - 1)
            .attr("step", "1")
            .on("input", function () {
                let date = uniqueDates[+this.value];
                d3.selectAll(".usa-svg")
                    .transition()
                    .style("fill", d => {
                        d = d.properties[date];
                        if (d) {
                            return scale(d["casesNorm"]);
                        }
                        return null;
                    })
                d3.select(".date-output-usa")
                    .text(date);

            });

        let date = uniqueDates[d3.select("input#usa").property("value")];
        let maxCasesNorm = d3.max(geo.features, d => {
            d = d.properties[date];
            if (d) {
                if (d.casesNorm) return d.casesNorm
            }
            return 0
        });


        let scale = d3.scaleSequential(d3.interpolateInferno)
            .domain([0, 4700])
            .clamp(true);

        svg
            .append("g")
            .selectAll("path")
            .data(geo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country-state usa-svg")
            .style("stroke-width", "0.15")
            .style("fill", d => {
                let date = uniqueDates[d3.select("input#usa").property("value")];
                d = d.properties[date];
                if (d) {
                    return scale(d["casesNorm"]);
                }
                return null;
            })
            .on("mouseover", d => {
                d = d.properties;
                let date = uniqueDates[d3.select("input#usa").property("value")],
                    tooltipText = d["location"];

                if (!tooltipText) {
                    tooltipText = "No data";
                } else if (d[date]) {
                    tooltipText = `<strong>${d["location"]}</strong><br/>
                    - Cases: ${d[date]["cases"].toLocaleString()}*<br/>
                    - Deaths: ${d[date]["deaths"].toLocaleString()}*<br/>
                    - Cases / 100k: ${Number(d[date]["casesNorm"].toFixed(2)).toLocaleString()}*<br/>
                    - Deaths / 100k: ${Number(d[date]["deathsNorm"].toFixed(2)).toLocaleString()}*<br/>
                    - Population: ${d["population"].toLocaleString()}†<br/>
                    <small>* reported as of ${date}</small><br/>
                    <small>† 2018-07-01 estimate</small>`;
                } else {
                    tooltipText = `<strong>${d["location"]}</strong><br/><small>No data<small>`;
                }

                tooltipDiv.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipDiv.html(tooltipText)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", d => {
                tooltipDiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        d3.select(".date-output-usa")
            .text(uniqueDates[d3.select("input#usa").property("value")]);

    })
    .catch(e => console.error(e));
