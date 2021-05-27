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
        fill: new ol.style.Fill({ color: fillColor[colorFlag]+(osmMapVector.getVisible()? "44": "") }),
        text: new ol.style.Text({
            font: '500 14px "Poppins", "Noto Sans TC", "sans-serif"',
            fill: new ol.style.Fill({ color: textColor[colorFlag] })
        })
    });
    if(townMetadata[COUNTY] && townMetadata[COUNTY][TOWN])
        baseStyle.getText().setText(TOWN + ' ' + META.cases.toString() + "\n(" + META.ratio.toString() + ' ‱)');
    return baseStyle;
}

/* 點擊鄉鎮區塊時 */
map.on('singleclick', (e) => {
    map.forEachFeatureAtPixel(e.pixel, function (town, layer) {
        // 重置前次所選的鄉鎮，設定為此次選擇的鄉鎮
        if(selectedTown) selectedTown.setStyle(townStyle);
        selectedTown = town;
        selectedTown.setStyle(townStyle);

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
        $("#sidbar-title").html(COUNTY+" "+TOWN);
        $("#detail-content").empty().append(detail_table);

        // 開啟測邊欄
        sidebar.open('detail');
    });
});

/* 依個案數設定顏色 */
fillColor = ['#FFFFFB', '#FAD689', '#ECB88A', '#F19483', '#BF6766'];
textColor = ['#373C38', '#87522D', '#8C2E33', '#6B2327', '#E0CCC3'];
function getColorFlag(META) {
    switch(true) {
        case META.ratio > 10: return 4;
        case META.ratio > 5:  return 3;
        case META.ratio > 1:  return 2;
        case META.cases > 0:  return 1;
        default: return 0;
    }
}

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