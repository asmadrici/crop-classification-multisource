// ── Masque nuages via SCL ──
function maskClouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3)   // ombres nuages
               .and(scl.neq(8))   // nuages moyenne proba
               .and(scl.neq(9))   // nuages haute proba
               .and(scl.neq(10))  // cirrus
               .and(scl.neq(11)); // neige
  return image.updateMask(mask).select(bands).toFloat();
}

// ── Composite 10 jours avec masque ──
function composite(col) {
  var col_masked = col.map(maskClouds); // applique masque à toute la collection
  
  return ee.List.sequence(0, 35).map(function(i) {
    var start = ee.Date('2021-01-01').advance(ee.Number(i).multiply(10), 'day');
    var end   = start.advance(10, 'day');
    var sub   = col_masked.filterDate(start, end);
    
    // Si images disponibles → médiane des pixels valides
    // Si aucune image valide → 0 (manquant)
    return ee.Algorithms.If(
      sub.size().gt(0),
      sub.median().unmask(0).toFloat(),  // unmask(0) = marque les pixels encore masqués comme 0
      empty
    );
  });
}
var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];
var empty = ee.Image.constant([0,0,0,0,0,0,0,0,0,0]).rename(bands).toFloat();
var cdl_raw = ee.Image('USDA/NASS/CDL/2021');

// ── Zones ──

var ar1 = ee.Geometry.Rectangle([-91.65, 34.4, -91.35, 34.65]);
var ar2 = ee.Geometry.Rectangle([-90.85, 34.4, -90.55, 34.65]);
var ca1 = ee.Geometry.Rectangle([-122.1,  39.1, -121.8, 39.35]);
var ca2 = ee.Geometry.Rectangle([-120.3,  36.8, -120.0, 37.05]);

Map.addLayer(ar1, {color:'green'},  'Arkansas 1');
Map.addLayer(ar2, {color:'orange'}, 'Arkansas 2');
Map.addLayer(ca1, {color:'blue'},   'California 1');
Map.addLayer(ca2, {color:'red'},    'California 2');

// ── Collections ──
var col_ar1 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ar1).filterDate('2021-01-01', '2021-12-31');
var col_ar2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ar2).filterDate('2021-01-01', '2021-12-31');
var col_ca1 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ca1).filterDate('2021-01-01', '2021-12-31');
var col_ca2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ca2).filterDate('2021-01-01', '2021-12-31');

// ── Export Sentinel-2 ──
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_ar1)).toBands(),
  description: 'S2_AR1',
  folder     : 'MCTNet_final',
  region     : ar1, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_ar2)).toBands(),
  description: 'S2_AR2',
  folder     : 'MCTNet_final',
  region     : ar2, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_ca1)).toBands(),
  description: 'S2_CA1',
  folder     : 'MCTNet_final',
  region     : ca1, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : ee.ImageCollection(composite(col_ca2)).toBands(),
  description: 'S2_CA2',
  folder     : 'MCTNet_final',
  region     : ca2, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});

// ── Export CDL ──
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ar1).rename(['b1']),
  description: 'CDL_AR1',
  folder     : 'MCTNet_final',
  region     : ar1, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ar2).rename(['b1']),
  description: 'CDL_AR2',
  folder     : 'MCTNet_final',
  region     : ar2, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ca1).rename(['b1']),
  description: 'CDL_CA1',
  folder     : 'MCTNet_final',
  region     : ca1, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
Export.image.toDrive({
  image      : cdl_raw.select([0]).unmask(0).toUint8().clip(ca2).rename(['b1']),
  description: 'CDL_CA2',
  folder     : 'MCTNet_final',
  region     : ca2, scale: 30, maxPixels: 1e10, fileFormat: 'GeoTIFF'
});
