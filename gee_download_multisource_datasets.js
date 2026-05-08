// ================================================================
// 🌍 MCTNet – 4 ZONES VRAIMENT 30km×30km ✅ CORRIGÉ
// ================================================================

var CONFIG = {
  scale: 30,
  year: 2021,
  crs: 'EPSG:32615',
  drive_folder: 'MCTNet_S2',
  cdl_folder:   'MCTNet_CDL',
  wc_folder:    'MCTNet_WorldCover'
};

// ================================================================
// VÉRIFICATION TAILLE (affiche dans Console GEE)
// ================================================================
function printZoneSize(zone) {
  var area = zone.geom.area(1);
  print(zone.name + ' area (km²):', ee.Number(area).divide(1e6));
}

var ZONE1 = {
  name: 'Arkansas_Zone1_Poinsett',
  geom: ee.Geometry.Rectangle([
    -90.605 - 0.165,  // lon_min = -90.770
     35.576 - 0.135,  // lat_min =  35.441
    -90.605 + 0.165,  // lon_max = -90.440
     35.576 + 0.135   // lat_max =  35.711
  ])

};

var ZONE2 = {
  name: 'Arkansas_Zone2_Stuttgart',
  geom: ee.Geometry.Rectangle([
    -91.553 - 0.165,  // lon_min = -91.718
     34.500 - 0.135,  // lat_min =  34.365
    -91.553 + 0.165,  // lon_max = -91.388
     34.500 + 0.135   // lat_max =  34.635
  ])
  // = [-91.718, 34.365, -91.388, 34.635]
  // Δlon=0.330°=~30km ✅  Δlat=0.270°=~30km ✅
};

var ZONE3 = {
  name: 'California_Zone1_Colusa_Rice',
  geom: ee.Geometry.Rectangle([
    -122.009 - 0.173,  // lon_min = -122.182
      39.209 - 0.135,  // lat_min =  39.074
    -122.009 + 0.173,  // lon_max = -121.836
      39.209 + 0.135   // lat_max =  39.344
  ])
  // = [-122.182, 39.074, -121.836, 39.344]
  // Δlon=0.346°=~30km ✅  Δlat=0.270°=~30km ✅
};

var ZONE4 = {
  name: 'California_Zone2_Fresno_Orchards',
  geom: ee.Geometry.Rectangle([
    -120.100 - 0.168,  // lon_min = -120.268
      36.747 - 0.135,  // lat_min =  36.612
    -120.100 + 0.168,  // lon_max = -119.932
      36.747 + 0.135   // lat_max =  36.882
  ])
  // = [-120.268, 36.612, -119.932, 36.882]
  // Δlon=0.336°=~30km ✅  Δlat=0.270°=~30km ✅
};

// ================================================================
// ✅ VÉRIFICATION TAILLE DANS CONSOLE GEE
// ================================================================
printZoneSize(ZONE1);  // doit afficher ~900 km²
printZoneSize(ZONE2);  // doit afficher ~900 km²
printZoneSize(ZONE3);  // doit afficher ~900 km²
printZoneSize(ZONE4);  // doit afficher ~900 km²

// ================================================================
// 📊 VERIFICATION PIXEL COUNT PAR CLASSE
// ================================================================
var CDL = ee.Image('USDA/NASS/CDL/2021').select('cropland');

function checkCounts(zone, codes, names) {
  var feats = codes.map(function(code, i) {
    var count = CDL.clip(zone.geom).eq(code).reduceRegion({
      reducer:   ee.Reducer.sum(),
      geometry:  zone.geom,
      scale:     30,
      maxPixels: 1e10
    });
    return ee.Feature(null, {
      'Zone':       zone.name,
      'Class':      names[i],
      'CDL_code':   code,
      'Pixels_30m': count.get('cropland')
    });
  });
  print('📊 ' + zone.name, ee.FeatureCollection(feats));
}

checkCounts(ZONE1, [1,2,3,5], ['Corn','Cotton','Rice','Soybeans']);
checkCounts(ZONE2, [1,2,3,5], ['Corn','Cotton','Rice','Soybeans']);
checkCounts(ZONE3, [3,36,69,75,204], ['Rice','Alfalfa','Grapes','Almonds','Pistachios']);
checkCounts(ZONE4, [3,36,69,75,204], ['Rice','Alfalfa','Grapes','Almonds','Pistachios']);

// ================================================================
// 🛰️ SENTINEL-2
// ================================================================
var S2_BANDS = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];
var S2_NAMES = ['Blue','Green','Red','RE1','RE2','RE3','NIR','RE4','SWIR1','SWIR2'];

function maskClouds(image) {
  var scl   = image.select('SCL');
  var valid = scl.eq(4).or(scl.eq(5)).or(scl.eq(6))
                       .or(scl.eq(11)).or(scl.eq(2));
  return image
    .updateMask(valid)
    .select(S2_BANDS, S2_NAMES)
    .divide(10000)
    .copyProperties(image, ['system:time_start']);
}

function getComposite(geom, doy_start, doy_end) {
  var t_start = ee.Date.fromYMD(CONFIG.year,1,1).advance(doy_start-1,'day');
  var t_end   = ee.Date.fromYMD(CONFIG.year,1,1).advance(doy_end,  'day');
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(t_start, t_end)
    .filterBounds(geom)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
    .map(maskClouds);
  var zeros = ee.Image.constant([0,0,0,0,0,0,0,0,0,0])
    .rename(S2_NAMES).clip(geom).toFloat();
  return ee.Image(ee.Algorithms.If(
    col.size().gt(0),
    col.median().unmask(0).clip(geom).toFloat(),
    zeros
  ));
}

// ================================================================
// 📤 EXPORTS
// ================================================================
function exportS2(zone) {
  for (var t = 1; t <= 36; t++) {
    var doy_start = (t-1)*10 + 1;
    var doy_end   = Math.min(t*10, 365);
    var tid       = t < 10 ? '0'+t : ''+t;
    Export.image.toDrive({
      image:          getComposite(zone.geom, doy_start, doy_end),
      description:    zone.name + '_T' + tid,
      folder:         CONFIG.drive_folder,
      fileNamePrefix: zone.name + '_T' + tid,
      region:         zone.geom,
      scale:          CONFIG.scale,
      crs:            CONFIG.crs,
      maxPixels:      1e10,
      fileFormat:     'GeoTIFF'
    });
  }
}

function exportCDL(zone) {
  Export.image.toDrive({
    image:          CDL.clip(zone.geom).rename('label').toInt(),
    description:    zone.name + '_CDL_2021',
    folder:         CONFIG.cdl_folder,
    fileNamePrefix: zone.name + '_CDL_2021',
    region:         zone.geom,
    scale:          30,
    maxPixels:      1e10,
    fileFormat:     'GeoTIFF'
  });
}

var WC = ee.ImageCollection('ESA/WorldCover/v200')
           .first().select('Map').rename('label').toInt();

function exportWC(zone) {
  Export.image.toDrive({
    image:          WC.clip(zone.geom),
    description:    zone.name + '_WorldCover_2021',
    folder:         CONFIG.wc_folder,
    fileNamePrefix: zone.name + '_WorldCover',
    region:         zone.geom,
    scale:          10,
    maxPixels:      1e10,
    fileFormat:     'GeoTIFF'
  });
}

exportS2(ZONE1);  exportS2(ZONE2);  exportS2(ZONE3);  exportS2(ZONE4);
exportCDL(ZONE1); exportCDL(ZONE2); exportCDL(ZONE3); exportCDL(ZONE4);
exportWC(ZONE1);  exportWC(ZONE2);  exportWC(ZONE3);  exportWC(ZONE4);

// ================================================================
// 🗺️ VISUALISATION
// ================================================================
Map.centerObject(ZONE1.geom, 10);
Map.addLayer(ZONE1.geom,{color:'FF0000'},'ARK Z1 – Poinsett 30×30km ✅');
Map.addLayer(ZONE2.geom,{color:'FF8800'},'ARK Z2 – Stuttgart 30×30km ✅');
Map.addLayer(ZONE3.geom,{color:'0055FF'},'CAL Z3 – Colusa 30×30km ✅');
Map.addLayer(ZONE4.geom,{color:'00AA00'},'CAL Z4 – Fresno 30×30km ✅');

var cdlViz = CDL.remap(
  [1,2,3,5,36,69,75,204],
  [1,2,3,4, 5, 6, 7,  8]
);
Map.addLayer(cdlViz,{
  min:1, max:8,
  palette:['yellow','pink','cyan','green','lime','purple','orange','brown']
},'CDL 2021');
