/* ----------------------------------------------------------------------------------------------------*/
/* 讀入OSM地圖 */
var osmMapVector = new ol.layer.Tile({
    source: new ol.source.OSM()
})

/* 讀入各鄉鎮TopoJSON Feature */
var townVector = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'https://linziyou0601.github.io/taiwan_covid19_cases/TOWN_MOI_1100415.json',
        format: new ol.format.TopoJSON()
    }),
    style: townStyle
});

/* 繪製地圖 */
var mapView = new ol.View({
    center: ol.proj.fromLonLat([120.6718112, 24.1502971]),
    zoom: 12,
    minZoom: 8,
    extent: [12467782.968846641, 2273030.926987689, 14471533.803125564, 3248973.7896509725]
})
var map = new ol.Map({
    target: 'map',
    layers: [osmMapVector, townVector],
    view: mapView
});

/* 放置Side bar */
var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
map.addControl(sidebar);

/* ----------------------------------------------------------------------------------------------------*/
/* 取得人口及個案數資料 */
var townMetadata = {};        
$.get('https://linziyou0601.github.io/taiwan_covid19_cases/ncov19.json', {}, (ncov19) => {
    townMetadata = ncov19
    townVector.getSource().refresh();
})

/* 填入資料 */
var selectedTown = null;
function townStyle(town) {
    // 取得該鄉鎮資料
    var SELTOWN = (selectedTown == null)? null: selectedTown.getProperties().TOWNNAME;
    var townAttr = town.getProperties();
    var COUNTY = townAttr.COUNTYNAME;
    var TOWN = townAttr.TOWNNAME;
    var META = townMetadata[COUNTY][TOWN];
    var colorFlag = getColorFlag(META)
    
    // 區域整體顏色設定
    var strokeWidth = (TOWN === SELTOWN)? 5: 1;
    var strokeColor = (TOWN === SELTOWN)? '#8C2E33': '#666666';
    var baseStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth }),
        fill: new ol.style.Fill({ color: fillColor[colorFlag]+(osmMapVector.getVisible()? "66": "") }),
        text: new ol.style.Text({
            font: '500 14px "Poppins", "Noto Sans TC", "sans-serif"',
            fill: new ol.style.Fill({ color: textColor[colorFlag] })
        })
    });
    if(townMetadata[COUNTY] && townMetadata[COUNTY][TOWN])
        baseStyle.getText().setText(TOWN + ' ' + META.cases.toString() + "\n(" + META.ratio.toString() + ' ‱)');
    return baseStyle;
}

/* ----------------------------------------------------------------------------------------------------*/
/* 點擊鄉鎮區塊時 */
map.on('singleclick', (e) => {
    map.forEachFeatureAtPixel(e.pixel, function (town, layer) {
        // 重置前次所選的鄉鎮，設定為此次選擇的鄉鎮
        if(selectedTown) selectedTown.setStyle(townStyle);
        selectedTown = town;
        selectedTown.setStyle(townStyle);
        moveFeatureTop(selectedTown);

        // 取得該鄉鎮資料
        var townAttr = town.getProperties();
        var COUNTY = townAttr.COUNTYNAME;
        var TOWN = townAttr.TOWNNAME;
        var META = townMetadata[COUNTY][TOWN];
        var colorFlag = getColorFlag(META)

        // 鄉鎮資料填入
        let detail_table = $($("#detail_table").html().trim());
        detail_table.find("div[name='cases-tit']").attr("class", `mt-3 px-4 py-2 rounded-pill text-center stl${colorFlag}`);
        detail_table.find("[name='cases-text']").html(`${META.cases.toString()}`);
        detail_table.find("[name='pops-tit']").attr("class", `mt-3 px-4 py-2 rounded-pill text-center stl${colorFlag}`);
        detail_table.find("[name='pops-text']").html(`${META.population.toString()}`);
        detail_table.find("[name='ratio-tit']").attr("class", `mt-3 px-4 py-2 rounded-pill text-center stl${colorFlag}`);
        detail_table.find("[name='ratio-text']").html(`${META.ratio.toString()} ‱`);

        // 圖表繪製
        var ctx = detail_table.find(".charts");
        new Chart(ctx, {
            data: {
                labels: townMetadata[COUNTY][TOWN]["charts"]["labels"].map((val, ind, arr)=>val.substring(4)),
                datasets: [
                    {
                        type: "line",
                        backgroundColor: "rgba(240, 60, 53, 0.1)",
                        borderColor: "#F03C35",
                        data: townMetadata[COUNTY][TOWN]["charts"]["lines"],
                        lineTension: 0, // 曲線的彎度，設 0 表示直線
                        fill: true, // 是否填滿色彩
                        label: "七日平均"
                    },
                    {
                        type: "bar",
                        backgroundColor: "#4867F0",
                        data: townMetadata[COUNTY][TOWN]["charts"]["bars"],
                        label: "每日個案"
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        suggestedMin: 0,
                        suggestedMax: 200
                    }
                }
            }
        });

        $("#sidbar-title").html(COUNTY+" "+TOWN);
        $("#detail-content").empty().append(detail_table);

        // 開啟測邊欄
        sidebar.open('detail');
    });
});

/* 依個案數設定顏色 */
fillColor = ['#FFFFFB', '#b5caa0', '#d9cd90', '#ecb88a', '#f19483', '#d05a6e', '#8f77b5', '#533d5b'];
textColor = ['#373C38', '#466428', '#71610e', '#914603', '#ac2d16', '#fad8de', '#dfd5ef', '#d2c4d7'];
casesColorFlag = "TOTAL"
function getColorFlag(META) {
    val = (casesColorFlag=="TOTAL")? META.ratio: META.charts.lines[29]
    val = (casesColorFlag=="TOTAL" && META.ratio<=1 && META.cases > 0)? META.cases: val
    switch(true) {
        case val > 40: return 7;
        case val > 30: return 6;
        case val > 20: return 5;
        case val > 10: return 4;
        case val > 5:  return 3;
        case val > 1:  return 2;
        case val > 0:  return 1;
        default: return 0;
    }
}

/* ----------------------------------------------------------------------------------------------------*/
/* 取得townVector的所有features */
var closurePropertyUid = "ol_uid";
function getSortedFeatures() {
    return townVector.getSource().getFeatures().sort((a, b) => parseInt(a[closurePropertyUid]) - parseInt(b[closurePropertyUid]));
};

/* 將a Feature換到 b Feature的位置 */
function swapFeaturesUids(a, b) {
    [a[closurePropertyUid], b[closurePropertyUid]] = [b[closurePropertyUid], a[closurePropertyUid]];
};

/* 將 Feature移到最上層 */
function moveFeatureTop(feature) {
    var features = getSortedFeatures();
    var ind = features.indexOf(feature);
    if (ind !== -1 && ind < features.length - 1 && features.length > 1) {
        swapFeaturesUids(features[ind], features[features.length - 1]);
        townVector.getSource().changed();
    }
};


/* ----------------------------------------------------------------------------------------------------*/
/* 取得目前位置 */
currentLocation()
function currentLocation() {
    navigator.geolocation.getCurrentPosition((position)=>{
        let lon=position.coords.longitude;
        let lat=position.coords.latitude;
        mapView.setCenter(ol.proj.fromLonLat([lon, lat]));
        mapView.setZoom(12);
    }, (error)=> alert("無法取得您的裝置位置！"));
}

/* 顯示/隱藏 OSM 地圖 */
function toogleOSM() {
    osmMapVector.setVisible(!osmMapVector.getVisible());
    townVector.setStyle(townStyle);
}

/* 顯示 個案總數/過去七日平均個案數 */
function toogleCases() {
    casesColorFlag = (casesColorFlag=="TOTAL")? "7MA": "TOTAL";
    townVector.setStyle(townStyle);
}