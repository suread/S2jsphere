require('./expectAndFail.js');
const LCG = require('./random')
const { S2jsphere, az } = require('../src/S2jsphere')

// const EARTH_RADIUS = 6367000 // used by IITC for link distance
const EARTH_RADIUS = 6378150 // used by drone-helper for equirectangular
describe('see how s2 library works in practice', () => {
 test('making a cell from lat lng and getting desired level', () => {
  const ll = S2jsphere.LatLng.fromDegrees(51.0, 0.1)
  const cellId = S2jsphere.CellId.fromLatLng(ll)
  console.log(cellId, cellId.level(),cellId.toLatLng())

  const l20Cell1 = S2jsphere.CellId.fromFacePosLevel(cellId.face(),cellId.pos(),20)
  const l20Cell = cellId.parent(20)//
  console.log(l20Cell1,l20Cell1.level(),l20Cell1.toLatLng())
  console.log(l20Cell,l20Cell.level(),l20Cell.toLatLng())

  const ll2 = S2jsphere.LatLng.fromDegrees(-0.061772, -78.457742)
  const cellId2 = S2jsphere.CellId.fromLatLng(ll2)
  console.log(cellId2, cellId2.level(),cellId2.toLatLng())

  const l16Cell1 = S2jsphere.CellId.fromFacePosLevel(cellId.face(),cellId.pos(),16)
  const l16Cell = cellId.parent(16)//
  console.log(l16Cell1,l16Cell1.level(),l16Cell1.toLatLng())
  console.log(l16Cell,l16Cell.level(),l16Cell.toLatLng())

 })
 test('getting a covering for a 500m circle with level 16 cells', () => {
  const centre = S2jsphere.LatLng.fromDegrees(51.0, 0.1)
  const radius = new S2jsphere.Angle(500/EARTH_RADIUS)
  const rc = new S2jsphere.RegionCoverer()
  rc.minLevel = 16
  rc.maxLevel = 16

  const cellIds = rc.getCovering(S2jsphere.Cap.fromAxisAngle(centre.toPoint(),radius))
  console.log(cellIds + "")
  let output = ""
  for (let id of cellIds) {
   output += id.toToken() + ";"
  }
  console.log( output)
 })
})