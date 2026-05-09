// ══════════════════════════════════════════════════════
// Climat TEMPOREL : 36 périodes × 3 bandes = 108 bandes
// Sol et Topo : STATIQUES
// ══════════════════════════════════════════════════════

var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate('2021-01-01', '2021-12-31')
  .select(['temperature_2m', 'total_precipitation_sum', 'dewpoint_temperature_2m']);

var periodes = [];
for (var i = 0; i < 36; i++) {
  var debut = ee.Date('2021-01-01').advance(i * 10, 'day');
  var fin   = debut.advance(10, 'day');
  var periode_img = era5
    .filterDate(debut, fin)
    .mean()
    .rename(['temp_t' + (i+1), 'precip_t' + (i+1), 'dewpoint_t' + (i+1)]);
  periodes.push(periode_img);
}
var climate = periodes[0];
for (var j = 1; j < 36; j++) {
  climate = climate.addBands(periodes[j]);
}
print('Climate bandes (doit être 108) :', climate.bandNames().size());

var soil = ee.Image('OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02')
  .select(['b0']).rename(['ph'])
  .addBands(ee.Image('OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02')
    .select(['b0']).rename(['organic_carbon']))
  .addBands(ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02')
    .select(['b0']).rename(['texture']));


var topo = ee.Image('NOAA/NGDC/ETOPO1')
  .select(['bedrock']).rename(['elevation'])
  .addBands(ee.Image('CSP/ERGo/1_0/Global/ALOS_landforms')
    .select(['constant']).rename(['landforms']));

// ── ZONES (mêmes coordonnées) ─────────────
var ar1 = ee.Geometry.Rectangle([-91.65, 34.4, -91.35, 34.65]);
var ar2 = ee.Geometry.Rectangle([-90.85, 34.4, -90.55, 34.65]);
var ca1 = ee.Geometry.Rectangle([-122.1,  39.1, -121.8, 39.35]);
var ca2 = ee.Geometry.Rectangle([-120.3,  36.8, -120.0, 37.05]);


var zoneNames = ['AR1', 'AR2', 'CA1', 'CA2'];
var zoneGeoms = [ar1,   ar2,   ca1,   ca2  ];

for (var k = 0; k < zoneNames.length; k++) {
  var name   = zoneNames[k];
  var region = zoneGeoms[k];

  Export.image.toDrive({
    image      : climate.clip(region).toFloat(),
    description: 'climate_' + name,   // → climate_AR1, climate_AR2, climate_CA1, climate_CA2
    folder     : 'Covariables',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });

  Export.image.toDrive({
    image      : soil.clip(region).toFloat(),
    description: 'soil_' + name,      // → soil_AR1, soil_AR2, soil_CA1, soil_CA2
    folder     : 'Covariables',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });

  Export.image.toDrive({
    image      : topo.clip(region).toFloat(),
    description: 'topo_' + name,      // → topo_AR1, topo_AR2, topo_CA1, topo_CA2
    folder     : 'Covariables',
    region     : region,
    scale      : 30,
    maxPixels  : 1e10,
    fileFormat : 'GeoTIFF'
  });
print('   climate_AR1/AR2/CA1/CA2 → 108 bandes (36,3) ');
print('   soil_AR1/AR2/CA1/CA2    →   3 bandes');
print('   topo_AR1/AR2/CA1/CA2    →   2 bandes');






  
print('   topo_AR1/AR2/CA1/CA2    →   2 bandes');
}
