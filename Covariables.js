// ══════════════════════════════════════════════════════
// PART 2 — Covariables environnementales
// 4 zones MCTNet exactes (mêmes que Sentinel-2)
// ══════════════════════════════════════════════════════

// ── ZONES (identiques à la Cellule 1 GEE Sentinel-2) ─
var ZONE1 = ee.Geometry.Rectangle([-90.770, 35.441, -90.440, 35.711]);
var ZONE2 = ee.Geometry.Rectangle([-91.718, 34.365, -91.388, 34.635]);
var ZONE3 = ee.Geometry.Rectangle([-122.182, 39.074, -121.836, 39.344]);
var ZONE4 = ee.Geometry.Rectangle([-120.268, 36.612, -119.932, 36.882]);

var zoneNames = [
  'Arkansas_Zone1_Poinsett',
  'Arkansas_Zone2_Stuttgart',
  'California_Zone1_Colusa_Rice',
  'California_Zone2_Fresno_Orchards'
];
var zoneGeoms = [ZONE1, ZONE2, ZONE3, ZONE4];

// ══════════════════════════════════════════════════════
// 1. CLIMAT TEMPOREL — ERA5-Land
// 36 périodes × 3 bandes = 108 bandes
// ══════════════════════════════════════════════════════
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate('2021-01-01', '2021-12-31')
  .select([
    'temperature_2m',
    'total_precipitation_sum',
    'dewpoint_temperature_2m'
  ]);

var periodes = [];
for (var i = 0; i < 36; i++) {
  var debut = ee.Date('2021-01-01').advance(i * 10, 'day');
  var fin   = debut.advance(10, 'day');
  var img   = era5.filterDate(debut, fin).mean()
    .rename([
      'temp_t'     + String(i + 1),
      'precip_t'   + String(i + 1),
      'dewpoint_t' + String(i + 1)
    ]);
  periodes.push(img);
}

var climate = periodes[0];
for (var j = 1; j < 36; j++) {
  climate = climate.addBands(periodes[j]);
}

print('Climate bandes (doit être 108) :', climate.bandNames().size());

// ══════════════════════════════════════════════════════
// 2. SOL — OpenLandMap (statique)
// 3 bandes : ph, organic_carbon, texture
// ══════════════════════════════════════════════════════
var soil = ee.Image('OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02')
  .select(['b0']).rename(['ph'])
  .addBands(
    ee.Image('OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02')
      .select(['b0']).rename(['organic_carbon'])
  )
  .addBands(
    ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
      .select(['b0']).rename(['texture'])
  );

print('Soil bandes :', soil.bandNames());

// ══════════════════════════════════════════════════════
// 3. TOPOGRAPHIE — (statique)
// 2 bandes : elevation, landforms
// ══════════════════════════════════════════════════════
var topo = ee.Image('NOAA/NGDC/ETOPO1')
  .select(['bedrock']).rename(['elevation'])
  .addBands(
    ee.Image('CSP/ERGo/1_0/Global/ALOS_landforms')
      .select(['constant']).rename(['landforms'])
  );

print('Topo bandes :', topo.bandNames());

// ══════════════════════════════════════════════════════
// EXPORTS — 4 zones × 3 types = 12 fichiers
// ══════════════════════════════════════════════════════
for (var i = 0; i < zoneNames.length; i++) {
  var name   = zoneNames[i];
  var region = zoneGeoms[i];

  // Climate (108 bandes)
  Export.image.toDrive({
    image          : climate.clip(region).toFloat(),
    description    : name + '_Climate',
    folder         : 'MCTNet_Covariables_partie2',
    fileNamePrefix : name + '_Climate',
    region         : region,
    scale          : 30,
    crs            : 'EPSG:32615',
    maxPixels      : 1e10,
    fileFormat     : 'GeoTIFF'
  });

  // Soil (3 bandes)
  Export.image.toDrive({
    image          : soil.clip(region).toFloat(),
    description    : name + '_Soil',
    folder         : 'MCTNet_Covariables_partie2',
    fileNamePrefix : name + '_Soil',
    region         : region,
    scale          : 30,
    crs            : 'EPSG:32615',
    maxPixels      : 1e10,
    fileFormat     : 'GeoTIFF'
  });

  // Topo (2 bandes)
  Export.image.toDrive({
    image          : topo.clip(region).toFloat(),
    description    : name + '_Topo',
    folder         : 'MCTNet_Covariables_partie2',
    fileNamePrefix : name + '_Topo',
    region         : region,
    scale          : 30,
    crs            : 'EPSG:32615',
    maxPixels      : 1e10,
    fileFormat     : 'GeoTIFF'
  });

  print('✅ Export lancé :', name);
}

print('✅ 12 exports lancés → MCTNet_Covariables_partie2');
print('  *_Climate.tif → 108 bandes (36×3)');
print('  *_Soil.tif    →   3 bandes');
print('  *_Topo.tif    →   2 bandes');

// ══════════════════════════════════════════════════════
// VISUALISATION
// ══════════════════════════════════════════════════════
Map.centerObject(ZONE1, 9);
Map.addLayer(ZONE1, {color: 'FF0000'}, 'ARK Z1 – Poinsett');
Map.addLayer(ZONE2, {color: 'FF8800'}, 'ARK Z2 – Stuttgart');
Map.addLayer(ZONE3, {color: '0055FF'}, 'CAL Z3 – Colusa');
Map.addLayer(ZONE4, {color: '00AA00'}, 'CAL Z4 – Fresno');
