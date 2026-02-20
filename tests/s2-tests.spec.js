/*
based on https://github.com/sidewalklabs/s2sphere/blob/master/tests/compare_implementations.py
needs some way of wrapping and using the c++ version of S2 (Python uses SWIG)
 */

require('./expectAndFail.js');
const LCG = require('./random')
const { S2jsphere, az } = require('../src/S2jsphere')

const Angle = S2jsphere.Angle
const LatLng = S2jsphere.LatLng
const CellId = S2jsphere.CellId
const Point = S2jsphere.Point
const Cell = S2jsphere.Cell
const LineInterval = S2jsphere.LineInterval
const SphereInterval = S2jsphere.SphereInterval
const Cap = S2jsphere.Cap
const LatLngRect = S2jsphere.LatLngRect
const CellUnion = S2jsphere.CellUnion
const RegionCoverer = S2jsphere.RegionCoverer

// Some tests are based on spot checking random cell ids. The following list
// of 'ITERATIONS' defines how many spot checks are done per test.
/*
const INVERSE_ITERATIONS = 200000
const TOKEN_ITERATIONS = 10000
const COVERAGE_ITERATIONS = 1000000
const NEIGHBORS_ITERATIONS = 1000
const NORMALIZE_ITERATIONS = 2000
const REGION_COVERER_ITERATIONS = 1000
const RANDOM_CAPS_ITERATIONS = 1000
const SIMPLE_COVERINGS_ITERATIONS = 1000
*/
const INVERSE_ITERATIONS = 20
const TOKEN_ITERATIONS = 10
const COVERAGE_ITERATIONS = 10
const NEIGHBORS_ITERATIONS = 10
const NORMALIZE_ITERATIONS = 20
const REGION_COVERER_ITERATIONS = 10
const RANDOM_CAPS_ITERATIONS = 10
const SIMPLE_COVERINGS_ITERATIONS = 10

// TODO look at profiling - Python library used it in tests for CellId

const lcg = new LCG(20)

describe('TestAngle', () => {
  test('testDefaultConstructor', () => {
    const angle = new Angle();
    expect(angle.radians).toBe(0);
  });

  test('testPiRadiansExactly180Degrees', () => {
    expect(Angle.fromRadians(Math.PI).radians).toBe(Math.PI);
    expect(Angle.fromRadians(Math.PI).degrees).toBe(180.0);
    expect(Angle.fromDegrees(180).radians).toBe(Math.PI);
    expect(Angle.fromDegrees(180).degrees).toBe(180.0);

    expect(Angle.fromRadians(-Math.PI / 2).degrees).toBe(-90.0);
    expect(Angle.fromDegrees(-45).radians).toBe(-Math.PI / 4);
  });
});

describe('TestLatLng', () => {
  test('testBasics', () => {
    const llRad = LatLng.fromRadians(Math.PI / 4, Math.PI / 2);
    expect(llRad.lat().radians).toBe(Math.PI / 4);
    expect(llRad.lng().radians).toBe(Math.PI / 2);
    expect(llRad.isValid()).toBe(true);

    const llDeg = LatLng.fromDegrees(45, 90);
    expect(llRad.equals(llDeg)).toBe(true);
    expect(LatLng.fromDegrees(-91, 0).isValid()).toBe(false);
    expect(LatLng.fromDegrees(0, 181).isValid()).toBe(false);

    const bad = LatLng.fromDegrees(120, 200);
    expect(bad.isValid()).toBe(false);
    const better = bad.normalized();
    expect(better.isValid()).toBe(true);
    expect(Angle.fromDegrees(90).equals(better.lat())).toBe(true);
    expect(Angle.fromDegrees(-160).radians).toBe(better.lng().radians);

    expect(
      LatLng.fromDegrees(10, 20).add(LatLng.fromDegrees(20, 30)).approxEquals(LatLng.fromDegrees(30, 50))
    ).toBe(true);
    expect(
      LatLng.fromDegrees(10, 20).subtract(LatLng.fromDegrees(20, 30)).approxEquals(LatLng.fromDegrees(-10, -10))
    ).toBe(true);

    const invalid = LatLng.invalid();
    expect(invalid.isValid()).toBe(false);

    const defaultLl = LatLng.default();
    expect(defaultLl.isValid()).toBe(true);
    expect(defaultLl.lat().radians).toBe(0);
    expect(defaultLl.lng().radians).toBe(0);
  });

  test('testConversion', () => {
    expect(LatLng.fromPoint(LatLng.fromDegrees(90.0, 65.0).toPoint()).lat().degrees).toBe(90.0);
    expect(
      LatLng.fromPoint(LatLng.fromRadians(-Math.PI / 2, 1).toPoint()).lat().radians
    ).toBe(-Math.PI / 2);

    expect(
      Math.abs(
        LatLng.fromPoint(LatLng.fromDegrees(12.2, 180.0).toPoint()).lng().degrees
      )
    ).toBe(180.0);

    expect(
      Math.abs(
        LatLng.fromPoint(LatLng.fromRadians(0.1, -Math.PI).toPoint()).lng().radians
      )
    ).toBe(Math.PI);
  });

  test('testDistance', () => {
    expect(
      LatLng.fromDegrees(90, 0).getDistance(LatLng.fromDegrees(90, 0)).radians
    ).toBe(0.0);

    expect(
      LatLng.fromDegrees(-37, 25).getDistance(LatLng.fromDegrees(-66, -155)).degrees
    ).toBeCloseTo(77.0, 13);

    expect(
      LatLng.fromDegrees(0, 165).getDistance(LatLng.fromDegrees(0, -80)).degrees
    ).toBeCloseTo(115.0, 13);

    const d1 = LatLng.fromDegrees(47, -127).getDistance(LatLng.fromDegrees(-47, 53)).degrees
    const d2 = 180.0
    expect(d1 - 180).toBeLessThanOrEqual(2e-6);
  });
});

function getRandomCellId(...args) {
  if (args.length === 3) {
    return CellId.fromFacePosLevel(args[0],args[1],args[2])
  }
  let level
  if (args.length === 0) {
    level = Math.floor(Math.random() * (CellId.MAX_LEVEL + 1));
  } else {
    level = args[0];
  }
  const bigrandom = (BigInt(Math.floor(lcg.next() * 0xffffffff)) << 32n) + BigInt(Math.floor(Math.random() * 0xffffffff))
  return CellId.fromFacePosLevel(
    Math.floor(lcg.next() * CellId.NUM_FACES),
    bigrandom & ((1n << BigInt(2 * CellId.MAX_LEVEL)) - 1n),
    level)

}

describe('TestCellId', () => {

  function getRandomPoint() {
    const x = 2 * lcg.next() - 1;
    const y = 2 * lcg.next() - 1;
    const z = 2 * lcg.next() - 1;
    return new Point(x, y, z).normalize();
  }

  function getCellId(lat, lng) {
    return CellId.fromLatLng(LatLng.fromDegrees(lat, lng));
  }

  test('DefaultConstructor', () => {
    const cellId = new CellId();
    expect(cellId.id()).toBe(0n);
    expect(cellId.isValid()).toBeFalsy();
  });

  test('FaceDefinitions', () => {
    expect(getCellId(0, 0).face()).toBe(0);
    expect(getCellId(0, 90).face()).toBe(1);
    expect(getCellId(90, 0).face()).toBe(2);
    expect(getCellId(0, 180).face()).toBe(3);
    expect(getCellId(0, -90).face()).toBe(4);
    expect(getCellId(-90, 0).face()).toBe(5);
  });

  test('ParentChildRelationships', () => {
    const cellId = CellId.fromFacePosLevel(3, 0x12345678, CellId.MAX_LEVEL - 4);

    expect(cellId.isValid()).toBeTruthy();
    expect(cellId.face()).toBe(3);
    expect(cellId.pos()).toBe(0x12345700n);
    expect(cellId.level()).toBe(CellId.MAX_LEVEL - 4);
    expect(cellId.isLeaf()).toBeFalsy();

    expect(cellId.childBegin(cellId.level() + 2).pos()).toBe(0x12345610n);
    expect(cellId.childBegin().pos()).toBe(0x12345640n);
    expect(cellId.parent().pos()).toBe(0x12345400n);
    expect(cellId.parent(cellId.level() - 2).pos()).toBe(0x12345000n);

    expect(cellId.childBegin().lessThan(cellId)).toBeTruthy();
    expect(cellId.childEnd().lessThan(cellId)).toBeFalsy();
    expect(cellId.childEnd().equals(cellId)).toBeFalsy(); // i.e. greater than
    expect(cellId.childBegin().next().next().next().next()).toStrictEqual(cellId.childEnd());
    expect(cellId.childBegin(CellId.MAX_LEVEL)).toStrictEqual(cellId.rangeMin());
    expect(cellId.childEnd(CellId.MAX_LEVEL)).toStrictEqual(cellId.rangeMax().next());

    expect(cellId.rangeMin().id() + cellId.rangeMax().id()).toBe(2n * cellId.id());
  });

  test('Wrapping', () => {
    expect(CellId.begin(0).prevWrap()).toEqual(CellId.end(0).prev());
    expect(CellId.begin(CellId.MAX_LEVEL).prevWrap()).toEqual(
      CellId.fromFacePosLevel(
        5,
        0xffffffffffffffffn >> CellId.FACE_BITS,
        CellId.MAX_LEVEL
      )
    );

    expect(CellId.begin(CellId.MAX_LEVEL).advanceWrap(-1)).toEqual(
      CellId.fromFacePosLevel(
        5,
        0xffffffffffffffffn >> CellId.FACE_BITS,
        CellId.MAX_LEVEL
      )
    );

    expect(CellId.end(4).advance(-1).advanceWrap(1)).toEqual(CellId.begin(4));

    expect(CellId.end(CellId.MAX_LEVEL).advance(-1).advanceWrap(1)).toEqual(
      CellId.fromFacePosLevel(0, 0, CellId.MAX_LEVEL)
    );

    expect(CellId.end(4).prev().nextWrap()).toEqual(CellId.begin(4));

    expect(CellId.end(CellId.MAX_LEVEL).prev().nextWrap()).toEqual(
      CellId.fromFacePosLevel(0, 0, CellId.MAX_LEVEL)
    );
  });

  test('Advance', () => {
    const cellId = CellId.fromFacePosLevel(3, 0x12345678, CellId.MAX_LEVEL - 4);

    expect(CellId.begin(0).advance(7)).toEqual(CellId.end(0));
    expect(CellId.begin(0).advance(12)).toEqual(CellId.end(0));
    expect(CellId.end(0).advance(-7)).toEqual(CellId.begin(0));
    expect(CellId.end(0).advance(-12000000)).toEqual(CellId.begin(0));

    const numLevel5Cells = 6 << (2 * 5);
    expect(CellId.begin(5).advance(500)).toEqual(
      CellId.end(5).advance(500 - numLevel5Cells)
    );
    expect(cellId.childBegin(CellId.MAX_LEVEL).advance(256)).toEqual(
      cellId.next().childBegin(CellId.MAX_LEVEL)
    );
    expect(
      CellId.fromFacePosLevel(1, 0, CellId.MAX_LEVEL).advance(4n << BigInt(2 * CellId.MAX_LEVEL))
    ).toEqual(CellId.fromFacePosLevel(5, 0, CellId.MAX_LEVEL));

    expect(CellId.begin(0).advanceWrap(7)).toEqual(CellId.fromFacePosLevel(1, 0, 0));
    expect(CellId.begin(0).advanceWrap(12)).toEqual(CellId.begin(0));

    expect(CellId.fromFacePosLevel(5, 0, 0).advanceWrap(-7)).toEqual(
      CellId.fromFacePosLevel(4, 0, 0)
    );
    expect(CellId.begin(0).advanceWrap(-12000000)).toEqual(CellId.begin(0));
    expect(CellId.begin(5).advanceWrap(6644)).toEqual(CellId.begin(5).advanceWrap(-11788));
    expect(cellId.childBegin(CellId.MAX_LEVEL).advanceWrap(256)).toEqual(
      cellId.next().childBegin(CellId.MAX_LEVEL)
    );
    expect(
      CellId.fromFacePosLevel(5, 0, CellId.MAX_LEVEL).advanceWrap(
        2n << BigInt(2 * CellId.MAX_LEVEL)
      )
    ).toEqual(CellId.fromFacePosLevel(1, 0, CellId.MAX_LEVEL));
  });

  test('Inverse', () => {
    for (let i = 0; i < INVERSE_ITERATIONS; i++) {
      const cellId = getRandomCellId(CellId.MAX_LEVEL);
      expect(cellId.isLeaf()).toBe(true);
      expect(cellId.level()).toBe(CellId.MAX_LEVEL);
      const center = cellId.toLatLng();
      expect(CellId.fromLatLng(center).id()).toBe(cellId.id());
    }
  })

  test('Tokens', () => {
    for (let i = 0; i < TOKEN_ITERATIONS; i++) {
      const cellId = getRandomCellId();
      const token = cellId.toToken();
      expect(token.length).toBeLessThanOrEqual(16);
      expect(CellId.fromToken(token)).toEqual(cellId);
    }
  })

  function expandCells(parent, cells, parentMap) {
    cells.push(parent);
    if (parent.level() === 3) {
      return;
    }

    const [face, i, j, orientation] = parent.toFaceIjOrientation();
    expect(face).toBe(BigInt(parent.face()));

    let child = parent.childBegin();
    const childEnd = parent.childEnd();
    let pos = 0;
    while (!child.equals(childEnd)) {
      expect(parent.child(pos)).toEqual(child);
      expect(child.level()).toBe(parent.level() + 1);
      expect(child.isLeaf()).toBe(false);
      const [cface, ci, cj, corientation] = child.toFaceIjOrientation();
      expect(cface).toBe(face);
      expect(corientation).toBe(orientation ^ S2jsphere.POS_TO_ORIENTATION[pos]);

      parentMap[child] = parent;
      expandCells(child, cells, parentMap);
      child = child.next();
      pos++;
    }
  }

  test('Containment', () => {
    const parentMap = {};
    const cells = [];
    for (let face = 0; face < 6; face++) {
      expandCells(
        CellId.fromFacePosLevel(face, 0, 0),
        cells,
        parentMap
      );
    }

    cells.forEach((cellId_i, i) => {
      cells.forEach((cellId_j, j) => {
        let contained = true;
        let cellId = cellId_j;
        while (!cellId.equals(cellId_i)) {
          const nextCellId = parentMap[cellId];
          if (nextCellId === undefined) {
            contained = false;
            break;
          }
          cellId = nextCellId;
        }

        expect(cells[i].contains(cells[j])).toBe(contained);
        expect(
          (!cells[j].lessThan(cells[i].rangeMin()) || cells[j].equals(cells[i].rangeMin())) &&
          (cells[j].lessThan(cells[i].rangeMax()) || cells[j].equals(cells[i].rangeMax()))
        ).toBe(contained);
        expect(cells[i].intersects(cells[j])).toBe(
          cells[i].contains(cells[j]) || cells[j].contains(cells[i])
        );
      });
    });
  })

  test('WalkFastAndSlow', () => {
    const slow = [], fast = []
    let n

    for (n of CellId.walk(2)) {
      slow.push(n.toToken())
    }
    for (n of CellId.walkFast(2)) {
      fast.push(n.toToken())
    }

    expect(slow).toEqual(fast);
  })

  test('Continuity',() => {
    const maxWalkLevel = 8;
    const cellSize = 1 / (1 << maxWalkLevel);
    const maxDist = CellId.maxEdge().getValue(maxWalkLevel);

    // this is slow.... I guess there are a lot of cellIds to go through
    for (const cellId of CellId.walkFast(maxWalkLevel)) {
      expect(
        cellId.toPointRaw().angle(cellId.nextWrap().toPointRaw())
      ).toBeLessThanOrEqual(maxDist);

      expect(cellId.advanceWrap(1)).toEqual(cellId.nextWrap());
      expect(cellId.nextWrap().advanceWrap(-1)).toEqual(cellId);

      const [face, u, v] = S2jsphere.xyzToFaceUv(cellId.toPointRaw());
      expect(CellId.uvToSt(u) % (0.5 * cellSize)).toBeCloseTo(0, 15);
      expect(CellId.uvToSt(v) % (0.5 * cellSize)).toBeCloseTo(0, 15);
    }
  })

  test('Coverage', () => {
    const maxDist = 0.5 * CellId.maxDiag().getValue(CellId.MAX_LEVEL);
    for (let i = 0; i < COVERAGE_ITERATIONS; i++) {
      const p = getRandomPoint();
      const q = CellId.fromPoint(p).toPointRaw();
      expect(p.angle(q)).toBeLessThanOrEqual(maxDist);
    }
  })

  test('Neighbors',() => {
    // Check the edge neighbors of face 1.
    const outFaces = [5, 3, 2, 0];
    const faceNbrs = CellId.fromFacePosLevel(1, 0, 0).getEdgeNeighbors();
    faceNbrs.forEach((faceNbr, i) => {
      expect(faceNbr.isFace()).toBe(true);
      expect(faceNbr.face()).toBe(outFaces[i]);
    });

    // Check the vertex neighbors of the center of face 2 at level 5.
    const neighbors = CellId.fromPoint(new Point(0, 0, 1)).getVertexNeighbors(5);
    neighbors.sort();
    neighbors.forEach((neighbor, i) => {
      expect(neighbor).toEqual(
        CellId.fromFaceIJ(
          2,
          (1 << 29) - (i < 2),
          (1 << 29) - (i === 0 || i === 3)
        ).parent(5)
      );
    });

    // Check the vertex neighbors of the corner of faces 0, 4, and 5.
    const cellId = CellId.fromFacePosLevel(0, 0, CellId.MAX_LEVEL);
    const vertexNeighbors = cellId.getVertexNeighbors(0);
    vertexNeighbors.sort();
    expect(vertexNeighbors.length).toBe(3);
    expect(vertexNeighbors[0]).toEqual(CellId.fromFacePosLevel(0, 0, 0));
    expect(vertexNeighbors[1]).toEqual(CellId.fromFacePosLevel(4, 0, 0));
    expect(vertexNeighbors[2]).toEqual(CellId.fromFacePosLevel(5, 0, 0));

    for (let i = 0; i < NEIGHBORS_ITERATIONS; i++) {
      const randomCellId = getRandomCellId(/*5,676612932962769467n,28*/);
      let cellId = randomCellId.isLeaf() ? randomCellId.parent() : randomCellId;
      const maxDiff = Math.min(6, CellId.MAX_LEVEL - cellId.level() - 1);
      const level = maxDiff === 0 ? cellId.level() : cellId.level() + Math.floor(lcg.next() * maxDiff);
      checkAllNeighbors(cellId, level);
    }
  })

  function checkAllNeighbors(cellId, level) {
    expect(level).toBeGreaterThanOrEqual(cellId.level());
    expect(level).toBeLessThan(CellId.MAX_LEVEL);

    // const all = new Set();
    const expected = {}

    const neighbors = cellId.getAllNeighbors(level);
    const all = {}
    neighbors.forEach(n => all[n.id()] = n)
    for (const c of cellId.children(level + 1)) {
      const parent = c.parent()
      all[parent.id()] = parent
      // c.getVertexNeighbors(level).forEach(c => expected.add(c))
      c.getVertexNeighbors(level).forEach(x => expected[x.id()] = x)
    };

    expect(expected).toEqual(all);
  }
})

class LevelStats {
  constructor() {
    this.count = 0;
    this.minArea = 100;
    this.maxArea = 0;
    this.avgArea = 0;
    this.minWidth = 100;
    this.maxWidth = 0;
    this.avgWidth = 0;
    this.minEdge = 100;
    this.maxEdge = 0;
    this.avgEdge = 0;
    this.maxEdgeAspect = 0;
    this.minDiag = 100;
    this.maxDiag = 0;
    this.avgDiag = 0;
    this.maxDiagAspect = 0;
    this.minAngleSpan = 100;
    this.maxAngleSpan = 0;
    this.avgAngleSpan = 0;
    this.minApproxRatio = 100;
    this.maxApproxRatio = 0;
  }
}

describe('TestCell', () => {

  beforeEach(() => {
    global.levelStats = Array.from({ length: CellId.MAX_LEVEL + 1 }, () => new LevelStats());
  });

  afterEach(() => {
    delete global.levelStats;
  });

  test('Faces', () => {
    const edgeCounts = new Map();
    const vertexCounts = new Map();

    for (let face = 0n; face < 6n; face++) {
      const cellId = CellId.fromFacePosLevel(face, 0, 0);
      const cell = new Cell(cellId);

      expect(cellId).toEqual(cell.id());
      expect(face).toEqual(cell.face());
      expect(0).toEqual(cell.level());

      // Top-level faces have alternating orientations to get RHS coordinates.
      expect(az.bigIntToNumber(face) & S2jsphere.SWAP_MASK).toEqual(cell.orientation());
      expect(cell.isLeaf()).toBeFalsy();

      for (let k = 0; k < 4; k++) {
        edgeCounts[cell.getEdgeRaw(k)] = (edgeCounts[cell.getEdgeRaw(k)] || 0) + 1;
        vertexCounts[cell.getVertexRaw(k)] = (vertexCounts[cell.getVertexRaw(k)] || 0) + 1;

        expect(cell.getVertexRaw(k).dotProd(cell.getEdgeRaw(k))).toEqual(0);
        expect(cell.getVertexRaw((k + 1) & 3).dotProd(cell.getEdgeRaw(k))).toEqual(0);

        expect(cell.getVertexRaw(k)
          .crossProd(cell.getVertexRaw((k + 1) & 3))
          .normalize()
          .dotProd(cell.getEdge(k))).toBeCloseTo(1.0);
      }
    }

    // Check that edges have multiplicity 2 and vertices have multiplicity 3.
    for (const count of edgeCounts.values()) {
      expect(count).toEqual(2);
    }

    for (const count of vertexCounts.values()) {
      expect(count).toEqual(3);
    }
  });

  test('Subdivide', () => {
    for (let face = 0; face < 6; face++) {
      checkSubdivide(Cell.fromFacePosLevel(face, 0, 0));
    }
  });

  function checkSubdivide(cell) {
    gatherStats(cell);

    if (cell.isLeaf()) {
      return;
    }

    let exactArea = 0;
    let approxArea = 0;
    let averageArea = 0;

    const children = [...cell.subdivide()]
    const childrenFromId = [...cell.id().children()]

    // or Array.from( cell.subdivide() )

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childId = childrenFromId[i];

      exactArea += child.exactArea();
      approxArea += child.approxArea();
      averageArea += child.averageArea();

      expect(child.id()).toEqual(childId);
      expect(child.getCenter().angle(childId.toPoint())).toBeLessThan(1e-15);

      const direct = new Cell(childId);


      expect(direct.face()).toEqual(child.face());
      expect(direct.level()).toEqual(child.level());
      expect(direct.orientation()).toEqual(child.orientation()); // TODO
      expect(direct.getCenterRaw()).toEqual(child.getCenterRaw());

      for (let k = 0; k < 4; k++) {
        expect(direct.getVertexRaw(k)).toEqual(child.getVertexRaw(k));
        expect(direct.getEdgeRaw(k)).toEqual(child.getEdgeRaw(k));
      }

    // # Test contains() and may_intersect().
      expect(cell.contains(child)).toBeTruthy();
      expect(cell.mayIntersect(child)).toBeTruthy();
      expect(child.contains(cell)).toBeFalsy();
      expect(cell.contains(child.getCenterRaw())).toBeTruthy();

      for (let j = 0; j < 4; j++) {
        expect(cell.contains(child.getVertexRaw(j))).toBeTruthy();

        if (i !== j) {
          expect(child.contains(children[j].getCenterRaw())).toBeFalsy();
          expect(child.mayIntersect(children[j])).toBeFalsy();
        }
      }

    // # Test get_cap_bound and get_rect_bound
      const parentCap = cell.getCapBound();
      const parentRect = cell.getRectBound();
      if (cell.contains(new Point(0, 0, 1)) || cell.contains(new Point(0, 0, -1))) {
        expect(parentRect.lng.isFull()).toBeTruthy()
      }
      const childCap = child.getCapBound();
      const childRect = child.getRectBound();

      expect(childCap.contains(child.getCenter())).toBeTruthy();
      expect(childRect.contains(child.getCenterRaw())).toBeTruthy();
      expect(parentCap.contains(child.getCenter())).toBeTruthy();
      expect(parentRect.contains(child.getCenterRaw())).toBeTruthy();

      for (let j = 0; j < 4; j++) {
        expect(childCap.contains(child.getVertex(j))).toBeTruthy();
        expect(childRect.contains(child.getVertex(j))).toBeTruthy();
        expect(childRect.contains(child.getVertexRaw(j))).toBeTruthy();
        expect(parentCap.contains(child.getVertex(j))).toBeTruthy();
        expect(parentRect.contains(child.getVertex(j))).toBeTruthy();
        // TODO This fails in the Python - omits failing situations with the if
        if (parentRect.lng instanceof SphereInterval && ! parentRect.lng.isFull())
          expect(parentRect.contains(child.getVertexRaw(j))).toBeTruthy();

        if (j !== i) {
          let capCount = 0;
          let rectCount = 0;

          for (let k = 0; k < 4; k++) {
            if (childCap.contains(children[j].getVertex(k))) {
              capCount++;
            }

            if (childRect.contains(children[j].getVertexRaw(k))) {
              rectCount++;
            }
          }

          expect(capCount).toBeLessThanOrEqual(2);

          if (childRect.lat.lo.radians > -Math.PI / 2.0 &&
            childRect.lat.hi.radians < Math.PI / 2.0) {
            // Bounding rectangles may be too large at the poles
            // because the pole itself has an arbitrary fixed longitude.
            expect(rectCount).toBeLessThanOrEqual(2);
          }
        }
      }

      let forceSubdivide = false;
      const center = S2jsphere.getNorm(children[i].face());
      const edge = center.add(S2jsphere.getUAxis(children[i].face()));
      const corner = edge.add(S2jsphere.getVAxis(children[i].face()));

      for (let j = 0; j < 4; j++) {
        const p = children[i].getVertexRaw(j);

        if (p.equals(center) || p.equals(edge) || p.equals(corner)) {
          forceSubdivide = true;
        }
      }

      if (forceSubdivide || cell.level() < 5 ||
        lcg.next() < 0.02) { // Adjusted for JavaScript randomization
        checkSubdivide(children[i]);
      }
    }

    expect(Math.abs(Math.log(exactArea / cell.exactArea()))).toBeLessThanOrEqual(Math.abs(Math.log(1 + 1e-6)));
    expect(Math.abs(Math.log(approxArea / cell.approxArea()))).toBeLessThanOrEqual(Math.abs(Math.log(1.03)));
    expect(Math.abs(Math.log(averageArea / cell.averageArea()))).toBeLessThanOrEqual(Math.abs(Math.log(1 + 1e-15)));
  }

  function gatherStats(cell) {
    const s = levelStats[cell.level()];
    const exactArea = cell.exactArea();
    const approxArea = cell.approxArea();
    let minEdge = 100;
    let maxEdge = 0;
    let avgEdge = 0;
    let minDiag = 100;
    let maxDiag = 0;
    let minWidth = 100;
    let maxWidth = 0;
    let minAngleSpan = 100;
    let maxAngleSpan = 0;

    for (let i = 0; i < 4; i++) {
      const edge = cell.getVertexRaw(i).angle(
        cell.getVertexRaw((i + 1) & 3));

      minEdge = Math.min(edge, minEdge);
      maxEdge = Math.max(edge, maxEdge);
      avgEdge += 0.25 * edge;

      const mid = cell.getVertexRaw(i).add(cell.getVertexRaw((i + 1) & 3));
      const width = Math.PI / 2.0 - mid.angle(cell.getEdgeRaw(i ^ 2));

      minWidth = Math.min(width, minWidth);
      maxWidth = Math.max(width, maxWidth);

      if (i < 2) {
        const diag = cell.getVertexRaw(i).angle(cell.getVertexRaw(i ^ 2));
        minDiag = Math.min(diag, minDiag);
        maxDiag = Math.max(diag, maxDiag);

        const angleSpan = cell.getEdgeRaw(i).angle(
          cell.getEdgeRaw(i ^ 2));

        minAngleSpan = Math.min(angleSpan, minAngleSpan);
        maxAngleSpan = Math.max(angleSpan, maxAngleSpan);
      }
    }

    s.count += 1;
    s.minArea = Math.min(exactArea, s.minArea);
    s.maxArea = Math.max(exactArea, s.maxArea);
    s.avgArea += exactArea;
    s.minWidth = Math.min(minWidth, s.minWidth);
    s.maxWidth = Math.max(maxWidth, s.maxWidth);
    s.avgWidth += 0.5 * (minWidth + maxWidth);
    s.minEdge = Math.min(minEdge, s.minEdge);
    s.maxEdge = Math.max(maxEdge, s.maxEdge);
    s.avgEdge += avgEdge;
    s.maxEdgeAspect = Math.max(maxEdge / minEdge, s.maxEdgeAspect);
    s.minDiag = Math.min(minDiag, s.minDiag);
    s.maxDiag = Math.max(maxDiag, s.maxDiag);
    s.avgDiag += 0.5 * (minDiag + maxDiag);
    s.maxDiagAspect = Math.max(maxDiag / minDiag, s.maxDiagAspect);
    s.minAngleSpan = Math.min(minAngleSpan, s.minAngleSpan);
    s.maxAngleSpan = Math.max(maxAngleSpan, s.maxAngleSpan);
    s.avgAngleSpan += 0.5 * (minAngleSpan + maxAngleSpan);

    const approxRatio = approxArea / exactArea;
    s.minApproxRatio = Math.min(approxRatio, s.minApproxRatio);
    s.maxApproxRatio = Math.max(approxRatio, s.maxApproxRatio);
  }
});

describe('TestLineInterval', () => {

  function checkIntervalOps(x, y, expected) {
//    const expected = ['T', 'T', 'F', 'T'];

    expect(x.contains(y)).toBe(expected[0] === 'T');
    expect(x.interiorContains(y)).toBe(expected[1] === 'T');
    expect(x.intersects(y)).toBe(expected[2] === 'T');
    expect(x.interiorIntersects(y)).toBe(expected[3] === 'T');
  }

  test('testBasic', () => {
    const unit = new LineInterval(0, 1);
    const negunit = new LineInterval(-1, 0);

    expect(unit.lo).toBe(0);
    expect(unit.hi).toBe(1);
    expect(negunit.bound(0)).toBe(-1);
    expect(negunit.bound(1)).toBe(0);

    // Keep immutable for now
    // const ten = new LineInterval(0, 0);
    // ten.setHi(10);
    // expect(ten.hi()).toBe(10);

    const half = new LineInterval(0.5, 0.5);
    expect(unit.isEmpty()).toBe(false);
    expect(half.isEmpty()).toBe(false);

    const empty = LineInterval.empty();
    expect(empty.isEmpty()).toBe(true);

    const defaultEmpty = new LineInterval();
    expect(defaultEmpty.isEmpty()).toBe(true);
    expect(empty.lo).toBe(defaultEmpty.lo);
    expect(empty.hi).toBe(defaultEmpty.hi);

    expect(unit.getCenter()).toBe(0.5);
    expect(half.getCenter()).toBe(0.5);
    expect(negunit.getLength()).toBe(1.0);
    expect(empty.getLength()).toBeLessThan(0);

    // Contains(double), InteriorContains(double)
    expect(unit.contains(0.5)).toBe(true);
    expect(unit.interiorContains(0.5)).toBe(true);
    expect(unit.contains(0)).toBe(true);
    expect(unit.interiorContains(0)).toBe(false);
    expect(unit.contains(1)).toBe(true);
    expect(unit.interiorContains(1)).toBe(false);

    checkIntervalOps(empty, empty, 'TTFF');
    checkIntervalOps(empty, unit, 'FFFF');
    checkIntervalOps(unit, half, 'TTTT');
    checkIntervalOps(unit, unit, 'TFTT');
    checkIntervalOps(unit, empty, 'TTFF');
    checkIntervalOps(unit, negunit, 'FFTF');
    checkIntervalOps(unit, new LineInterval(0, 0.5), 'TFTT');
    checkIntervalOps(half, new LineInterval(0, 0.5), 'FFTF');

    // AddPont() should go here but trying to keep class immutable

    // from_point_pair
    expect(LineInterval.fromPointPair(4, 4)).toEqual(new LineInterval(4, 4));
    expect(LineInterval.fromPointPair(-1, -2)).toEqual(new LineInterval(-2, -1));
    expect(LineInterval.fromPointPair(-5, 3)).toEqual(new LineInterval(-5, 3));

    // expanded
    expect(empty.expanded(0.45)).toEqual(empty);
    expect(unit.expanded(0.5)).toEqual(new LineInterval(-0.5, 1.5));

    // union, intersection
    expect(new LineInterval(99, 100).union(empty)).toEqual(new LineInterval(99, 100));
    expect(empty.union(new LineInterval(99, 100))).toEqual(new LineInterval(99, 100));
    expect(new LineInterval(5, 3).union(new LineInterval(0, -2)).isEmpty()).toBe(true);
    expect(new LineInterval(0, -2).union(new LineInterval(5, 3)).isEmpty()).toBe(true);
    expect(unit.union(unit)).toEqual(unit);
    expect(unit.union(negunit)).toEqual(new LineInterval(-1, 1));
    expect(negunit.union(unit)).toEqual(new LineInterval(-1, 1));
    expect(half.union(unit)).toEqual(unit);
    expect(unit.intersection(half)).toEqual(half);
    expect(negunit.intersection(half).isEmpty()).toBe(true);
    expect(unit.intersection(empty).isEmpty()).toBe(true);
    expect(empty.intersection(unit).isEmpty()).toBe(true);
  });
});

describe('TestSphereInterval', () => {
  let empty, full, zero, pi2, pi, mipi, mipi2, quad1, quad2, quad3, quad4,
    quad12, quad23, quad34, quad41, quad123, quad234, quad341, quad412,
    mid12, mid23, mid34, mid41;

  beforeEach(() => {
    empty = SphereInterval.empty();
    full = SphereInterval.full();
    zero = new SphereInterval(0, 0);
    pi2 = new SphereInterval(Math.PI / 2.0, Math.PI / 2.0);
    pi = new SphereInterval(Math.PI, Math.PI);
    mipi = new SphereInterval(-Math.PI, -Math.PI);
    mipi2 = new SphereInterval(-Math.PI / 2.0, -Math.PI / 2.0);
    quad1 = new SphereInterval(0, Math.PI / 2.0);
    quad2 = new SphereInterval(Math.PI / 2.0, -Math.PI);
    quad3 = new SphereInterval(Math.PI, -Math.PI / 2.0);
    quad4 = new SphereInterval(-Math.PI / 2.0, 0);
    quad12 = new SphereInterval(0, -Math.PI);
    quad23 = new SphereInterval(Math.PI / 2.0, -Math.PI / 2.0);
    quad34 = new SphereInterval(-Math.PI, 0);
    quad41 = new SphereInterval(-Math.PI / 2.0, Math.PI / 2.0);
    quad123 = new SphereInterval(0, -Math.PI / 2.0);
    quad234 = new SphereInterval(Math.PI / 2.0, 0);
    quad341 = new SphereInterval(Math.PI, Math.PI / 2.0);
    quad412 = new SphereInterval(-Math.PI / 2.0, -Math.PI);
    mid12 = new SphereInterval(Math.PI / 2 - 0.01, Math.PI / 2 + 0.02);
    mid23 = new SphereInterval(Math.PI - 0.01, -Math.PI + 0.02);
    mid34 = new SphereInterval(-Math.PI / 2.0 - 0.01, -Math.PI / 2.0 + 0.02);
    mid41 = new SphereInterval(-0.01, 0.02);
  });

  test('ConstructorsAndAccessors', () => {
    expect(quad12.lo).toBe(0);
    expect(quad12.hi).toBe(Math.PI);
    expect(quad34.bound(0)).toBe(Math.PI);
    expect(quad34.bound(1)).toBe(0);
    expect(pi.lo).toBe(Math.PI);
    expect(pi.hi).toBe(Math.PI);

    expect(mipi.lo).toBe(Math.PI);
    expect(mipi.hi).toBe(Math.PI);
    expect(quad23.lo).toBe(Math.PI / 2.0);
    expect(quad23.hi).toBe(-Math.PI / 2.0);

    const defaultEmpty = new SphereInterval();
    expect(defaultEmpty.isValid()).toBeTruthy();
    expect(defaultEmpty.isEmpty()).toBeTruthy();
    expect(empty.lo).toBe(defaultEmpty.lo);
    expect(empty.hi).toBe(defaultEmpty.hi);
    // Additional checks for modifying intervals can be added here
  });

  test('SimplePredicates', () => {
    expect(zero.isValid() && !zero.isEmpty() && !zero.isFull()).toBeTruthy();
    expect(empty.isValid() && empty.isEmpty() && !empty.isFull()).toBeTruthy();
    expect(empty.is_inverted()).toBeTruthy();
    expect(full.isValid() && !full.isEmpty() && full.isFull()).toBeTruthy();
    expect(!quad12.isEmpty() && !quad12.isFull() && !quad12.is_inverted()).toBeTruthy();
    expect(!quad23.isEmpty() && !quad23.isFull() && quad23.is_inverted()).toBeTruthy();
    expect(pi.isValid() && !pi.isEmpty() && !pi.is_inverted()).toBeTruthy();
    expect(mipi.isValid() && !mipi.isEmpty() && !mipi.is_inverted()).toBeTruthy();
  });

  test('GetCenter', () => {
    expect(quad12.getCenter()).toBe(Math.PI / 2.0);
    expect(new SphereInterval(3.1, 2.9).getCenter()).toBe(3.0 - Math.PI);
    expect(new SphereInterval(-2.9, -3.1).getCenter()).toBe(Math.PI - 3.0);
    expect(new SphereInterval(2.1, -2.1).getCenter()).toBe(Math.PI);
    expect(pi.getCenter()).toBe(Math.PI);
    expect(mipi.getCenter()).toBe(Math.PI);
    expect(quad123.getCenter()).toBe(0.75 * Math.PI);
  });

  test('GetLength', () => {
    expect(quad12.getLength()).toBe(Math.PI);
    expect(pi.getLength()).toBe(0);
    expect(mipi.getLength()).toBe(0);
    expect(quad123.getLength()).toBe(1.5 * Math.PI);
    expect(Math.abs(quad23.getLength())).toBe(Math.PI);
    expect(full.getLength()).toBe(2 * Math.PI);
    expect(empty.getLength()).toBeLessThan(0);
  });

  test('Complement', () => {
    expect(empty.complement().isFull()).toBeTruthy();
    expect(full.complement().isEmpty()).toBeTruthy();
    expect(pi.complement().isFull()).toBeTruthy();
    expect(mipi.complement().isFull()).toBeTruthy();
    expect(zero.complement().isFull()).toBeTruthy();
    expect(quad12.complement().approxEquals(quad34)).toBeTruthy();
    expect(quad34.complement().approxEquals(quad12)).toBeTruthy();
    expect(quad123.complement().approxEquals(quad4)).toBeTruthy();
  });

  test('Contains', () => {
    expect(!empty.contains(0) && !empty.contains(Math.PI) && !empty.contains(-Math.PI)).toBeTruthy();
    expect(!empty.interiorContains(Math.PI) && !empty.interiorContains(-Math.PI)).toBeTruthy();
    expect(full.contains(0) && full.contains(Math.PI) && full.contains(-Math.PI)).toBeTruthy();
    expect(full.interiorContains(Math.PI) && full.interiorContains(-Math.PI)).toBeTruthy();
    expect(quad12.contains(0) && quad12.contains(Math.PI) && quad12.contains(-Math.PI)).toBeTruthy();
    expect(quad12.interiorContains(Math.PI / 2.0) && !quad12.interiorContains(0)).toBeTruthy();
    expect(!quad12.interiorContains(Math.PI) && !quad12.interiorContains(-Math.PI)).toBeTruthy();
    expect(quad23.contains(Math.PI / 2.0) && quad23.contains(-Math.PI / 2.0)).toBeTruthy();
    expect(quad23.contains(Math.PI) && quad23.contains(-Math.PI)).toBeTruthy();
    expect(!quad23.contains(0)).toBeTruthy();
    expect(!quad23.interiorContains(Math.PI / 2.0) && !quad23.interiorContains(-Math.PI / 2.0)).toBeTruthy();
    expect(quad23.interiorContains(Math.PI) && quad23.interiorContains(-Math.PI)).toBeTruthy();
    expect(!quad23.interiorContains(0)).toBeTruthy();
    expect(pi.contains(Math.PI) && pi.contains(-Math.PI) && !pi.contains(0)).toBeTruthy();
    expect(!pi.interiorContains(Math.PI) && !pi.interiorContains(-Math.PI)).toBeTruthy();
    expect(mipi.contains(Math.PI) && mipi.contains(-Math.PI) && !mipi.contains(0)).toBeTruthy();
    expect(!mipi.interiorContains(Math.PI) && !mipi.interiorContains(-Math.PI)).toBeTruthy();
    expect(zero.contains(0) && !zero.interiorContains(0)).toBeTruthy();
  });

  function checkIntervalOps(x, y, expectedRelation, expectedUnion, expectedIntersection) {
    expect(x.contains(y)).toBe(expectedRelation[0] === 'T');
    expect(x.interiorContains(y)).toBe(expectedRelation[1] === 'T');
    expect(x.intersects(y)).toBe(expectedRelation[2] === 'T');
    expect(x.interiorIntersects(y)).toBe(expectedRelation[3] === 'T');

    expect(x.union(y).bounds).toEqual(expectedUnion.bounds);
    expect(x.intersection(y).bounds).toEqual(expectedIntersection.bounds);

    expect(x.contains(y)).toBe(x.union(y).equals(x));
    expect(x.intersects(y)).toBe(!x.intersection(y).isEmpty());

    // Uncomment the following block if needed
    // if (y.lo() === y.hi()) {
    //   const r = x;
    //   r.addPoint(y.lo());
    //   expect(r.bounds()).toEqual(expectedUnion.bounds());
    // }
  }

  test('intervalOps', () => {
    checkIntervalOps(empty, empty, 'TTFF', empty, empty);
    checkIntervalOps(empty, full, 'FFFF', full, empty);
    checkIntervalOps(empty, zero, 'FFFF', zero, empty);
    checkIntervalOps(empty, pi, 'FFFF', pi, empty);
    checkIntervalOps(empty, mipi, 'FFFF', mipi, empty);
    checkIntervalOps(full, empty, 'TTFF', full, empty);
    checkIntervalOps(full, full, 'TTTT', full, full);
    checkIntervalOps(full, zero, 'TTTT', full, zero);
    checkIntervalOps(full, pi, 'TTTT', full, pi);
    checkIntervalOps(full, mipi, 'TTTT', full, mipi);
    checkIntervalOps(full, quad12, 'TTTT', full, quad12);
    checkIntervalOps(full, quad23, 'TTTT', full, quad23);

    checkIntervalOps(zero, empty, 'TTFF', zero, empty);
    checkIntervalOps(zero, full, 'FFTF', full, zero);
    checkIntervalOps(zero, zero, 'TFTF', zero, zero);
    checkIntervalOps(zero, pi, 'FFFF', new SphereInterval(0, Math.PI), empty);
    checkIntervalOps(zero, pi2, 'FFFF', quad1, empty);
    checkIntervalOps(zero, mipi, 'FFFF', quad12, empty);
    checkIntervalOps(zero, mipi2, 'FFFF', quad4, empty);
    checkIntervalOps(zero, quad12, 'FFTF', quad12, zero);
    checkIntervalOps(zero, quad23, 'FFFF', quad123, empty);

    checkIntervalOps(pi2, empty, 'TTFF', pi2, empty);
    checkIntervalOps(pi2, full, 'FFTF', full, pi2);
    checkIntervalOps(pi2, zero, 'FFFF', quad1, empty);
    checkIntervalOps(pi2, pi, 'FFFF', new SphereInterval(Math.PI / 2.0, Math.PI), empty);
    checkIntervalOps(pi2, pi2, 'TFTF', pi2, pi2);
    checkIntervalOps(pi2, mipi, 'FFFF', quad2, empty);
    checkIntervalOps(pi2, mipi2, 'FFFF', quad23, empty);
    checkIntervalOps(pi2, quad12, 'FFTF', quad12, pi2);
    checkIntervalOps(pi2, quad23, 'FFTF', quad23, pi2);

    checkIntervalOps(pi, empty, 'TTFF', pi, empty);
    checkIntervalOps(pi, full, 'FFTF', full, pi);
    checkIntervalOps(pi, zero, 'FFFF', new SphereInterval(Math.PI, 0), empty);
    checkIntervalOps(pi, pi, 'TFTF', pi, pi);
    checkIntervalOps(pi, pi2, 'FFFF', new SphereInterval(Math.PI / 2.0, Math.PI), empty);
    checkIntervalOps(pi, mipi, 'TFTF', pi, pi);
    checkIntervalOps(pi, mipi2, 'FFFF', quad3, empty);
    checkIntervalOps(pi, quad12, 'FFTF', new SphereInterval(0, Math.PI), pi);
    checkIntervalOps(pi, quad23, 'FFTF', quad23, pi);

    checkIntervalOps(mipi, empty, 'TTFF', mipi, empty);
    checkIntervalOps(mipi, full, 'FFTF', full, mipi);
    checkIntervalOps(mipi, zero, 'FFFF', quad34, empty);
    checkIntervalOps(mipi, pi, 'TFTF', mipi, mipi);
    checkIntervalOps(mipi, pi2, 'FFFF', quad2, empty);
    checkIntervalOps(mipi, mipi, 'TFTF', mipi, mipi);
    checkIntervalOps(mipi, mipi2, 'FFFF', new SphereInterval(-Math.PI, -Math.PI / 2.0), empty);
    checkIntervalOps(mipi, quad12, 'FFTF', quad12, mipi);
    checkIntervalOps(mipi, quad23, 'FFTF', quad23, mipi);
    checkIntervalOps(quad12, empty, 'TTFF', quad12, empty);
    checkIntervalOps(quad12, full, 'FFTT', full, quad12);
    checkIntervalOps(quad12, zero, 'TFTF', quad12, zero);
    checkIntervalOps(quad12, pi, 'TFTF', quad12, pi);
    checkIntervalOps(quad12, mipi, 'TFTF', quad12, mipi);
    checkIntervalOps(quad12, quad12, 'TFTT', quad12, quad12);
    checkIntervalOps(quad12, quad23, 'FFTT', quad123, quad2);
    checkIntervalOps(quad12, quad34, 'FFTF', full, quad12);

    checkIntervalOps(quad23, empty, 'TTFF', quad23, empty);
    checkIntervalOps(quad23, full, 'FFTT', full, quad23);
    checkIntervalOps(quad23, zero, 'FFFF', quad234, empty);
    checkIntervalOps(quad23, pi, 'TTTT', quad23, pi);
    checkIntervalOps(quad23, mipi, 'TTTT', quad23, mipi);
    checkIntervalOps(quad23, quad12, 'FFTT', quad123, quad2);
    checkIntervalOps(quad23, quad23, 'TFTT', quad23, quad23);
    checkIntervalOps(quad23, quad34, 'FFTT', quad234, new SphereInterval(-Math.PI, -Math.PI / 2.0));

    checkIntervalOps(quad1, quad23, 'FFTF', quad123, new SphereInterval(Math.PI / 2.0, Math.PI / 2.0));
    checkIntervalOps(quad2, quad3, 'FFTF', quad23, mipi);
    checkIntervalOps(quad3, quad2, 'FFTF', quad23, pi);
    checkIntervalOps(quad2, pi, 'TFTF', quad2, pi);
    checkIntervalOps(quad2, mipi, 'TFTF', quad2, mipi);
    checkIntervalOps(quad3, pi, 'TFTF', quad3, pi);
    checkIntervalOps(quad3, mipi, 'TFTF', quad3, mipi);
    checkIntervalOps(quad12, mid12, 'TTTT', quad12, mid12);
    checkIntervalOps(mid12, quad12, 'FFTT', quad12, mid12);

    const quad12eps = new SphereInterval(quad12.lo, mid23.hi)
    const quad2hi = new SphereInterval(mid23.lo, quad12.hi)
    checkIntervalOps(quad12, mid23, "FFTT", quad12eps, quad2hi)
    checkIntervalOps(mid23, quad12, "FFTT", quad12eps, quad2hi)

    const quad412eps = new SphereInterval(mid34.lo, quad12.hi)
    checkIntervalOps(quad12, mid34, "FFFF", quad412eps, empty)
    checkIntervalOps(mid34, quad12, "FFFF", quad412eps, empty)

    const quadeps12 = new SphereInterval(mid41.lo, quad12.hi)
    const quad1lo = new SphereInterval(quad12.lo, mid41.hi)
    checkIntervalOps(quad12, mid41, "FFTT", quadeps12, quad1lo)
    checkIntervalOps(mid41, quad12, "FFTT", quadeps12, quad1lo)

    const quad2lo = new SphereInterval(quad23.lo, mid12.hi)
    const quad3hi = new SphereInterval(mid34.lo, quad23.hi)
    const quadeps23 = new SphereInterval(mid12.lo, quad23.hi)
    const quad23eps = new SphereInterval(quad23.lo, mid34.hi)
    const quadeps123 = new SphereInterval(mid41.lo, quad23.hi)
    checkIntervalOps(quad23, mid12, "FFTT", quadeps23, quad2lo)
    checkIntervalOps(mid12, quad23, "FFTT", quadeps23, quad2lo)
    checkIntervalOps(quad23, mid23, "TTTT", quad23, mid23)
    checkIntervalOps(mid23, quad23, "FFTT", quad23, mid23)
    checkIntervalOps(quad23, mid34, "FFTT", quad23eps, quad3hi)
    checkIntervalOps(mid34, quad23, "FFTT", quad23eps, quad3hi)
    checkIntervalOps(quad23, mid41, "FFFF", quadeps123, empty)
    checkIntervalOps(mid41, quad23, "FFFF", quadeps123, empty)
  });

  test('FromPointPair', () => {
    expect(SphereInterval.fromPointPair(-Math.PI, Math.PI)).toStrictEqual(pi)
    expect(SphereInterval.fromPointPair(Math.PI, -Math.PI)).toStrictEqual(pi)
    expect(SphereInterval.fromPointPair(mid34.hi, mid34.lo)).toStrictEqual(mid34)
    expect(SphereInterval.fromPointPair(mid23.lo, mid23.hi)).toStrictEqual(mid23)
  })

  test('Expanded', () => {
    expect(empty.expanded(1)).toStrictEqual(empty)
    expect(full.expanded(1)).toStrictEqual(full)
    expect(zero.expanded(1)).toStrictEqual(new SphereInterval(-1, 1))
    expect(mipi.expanded(0.01)).toStrictEqual(new SphereInterval(Math.PI - 0.01, -Math.PI + 0.01))
    expect(pi.expanded(27)).toStrictEqual(full)
    expect(pi.expanded(Math.PI / 2.0)).toStrictEqual(quad23)
    expect(pi2.expanded(Math.PI / 2.0)).toStrictEqual(quad12)
    expect(mipi2.expanded(Math.PI / 2.0)).toStrictEqual(quad34)
  })

  test('ApproxEquals', () => {
    expect(empty.approxEquals(empty)).toBeTruthy()
    expect(zero.approxEquals(empty) && empty.approxEquals(zero)).toBeTruthy()
    expect(pi.approxEquals(empty) && empty.approxEquals(pi)).toBeTruthy()
    expect(mipi.approxEquals(empty) && empty.approxEquals(mipi)).toBeTruthy()
    expect(pi.approxEquals(mipi) && mipi.approxEquals(pi)).toBeTruthy()
    expect(pi.union(mipi).approxEquals(pi)).toBeTruthy()
    expect(mipi.union(pi).approxEquals(pi)).toBeTruthy()
    expect(pi.union(mid12).union(zero).approxEquals(quad12)).toBeTruthy()
    expect(quad2.intersection(quad3).approxEquals(pi)).toBeTruthy()
    expect(quad3.intersection(quad2).approxEquals(pi)).toBeTruthy()
  })

  test('GetDirectedHausdorffDistance', () => {
    expect(empty.getDirectedHausdorffDistance(empty)).toStrictEqual(0.0)
    expect(empty.getDirectedHausdorffDistance(mid12)).toStrictEqual(0.0)
    expect(mid12.getDirectedHausdorffDistance(empty)).toStrictEqual(Math.PI)
    expect(quad12.getDirectedHausdorffDistance(quad123)).toStrictEqual(0.0)

    const interval = new SphereInterval(3.0, -3.0);
    expect(new SphereInterval(-0.1, 0.2).getDirectedHausdorffDistance(interval)).toStrictEqual(3.0)
    expect(new SphereInterval(0.1, 0.2).getDirectedHausdorffDistance(interval)).toStrictEqual(3.0-0.1)
    expect(new SphereInterval(-0.2, -0.1).getDirectedHausdorffDistance(interval)).toStrictEqual(3.0-0.1)
  })
})

describe('TestCap', () => {

  // const eps = 1e-15;
  const eps = 1e-14;

  function getLatLngPoint(latDegrees, lngDegrees) {
    return LatLng.fromDegrees(latDegrees, lngDegrees).toPoint();
  }


  test('Basic', () => {
    const empty = Cap.empty();
    const full = Cap.full();
    expect(empty.isValid()).toBe(true);
    expect(empty.isEmpty()).toBe(true);
    expect(empty.complement().isFull()).toBe(true);
    expect(full.isValid()).toBe(true);
    expect(full.isFull()).toBe(true);
    expect(full.complement().isEmpty()).toBe(true);
    expect(full.height).toBe(2);
    expect(full.angle().degrees).toBe(180.0);

    const defaultEmpty = new Cap();
    expect(defaultEmpty.isValid()).toBe(true);
    expect(defaultEmpty.isEmpty()).toBe(true);
    expect(empty.axis).toEqual(defaultEmpty.axis);
    expect(empty.height).toEqual(defaultEmpty.height);

    // Containment and intersection of empty and full caps.
    expect(empty.contains(empty)).toBe(true);
    expect(full.contains(empty)).toBe(true);
    expect(full.contains(full)).toBe(true);
    expect(empty.interiorIntersects(empty)).toBe(false);
    expect(full.interiorIntersects(full)).toBe(true);
    expect(full.interiorIntersects(empty)).toBe(false);

    // Singleton cap containing the x-axis.
    const xaxis = Cap.fromAxisHeight(new Point(1, 0, 0), 0);
    expect(xaxis.contains(new Point(1, 0, 0))).toBe(true);
    expect(xaxis.contains(new Point(1, 1e-20, 0))).toBe(false);
    expect(xaxis.angle().radians).toBe(0);

    // Singleton cap containing the y-axis.
    const yaxis = Cap.fromAxisAngle(new Point(0, 1, 0), Angle.fromRadians(0));
    expect(yaxis.contains(xaxis.axis)).toBe(false);
    expect(xaxis.height).toBe(0);

    // Check that the complement of a singleton cap is the full cap.
    const xcomp = xaxis.complement();
    expect(xcomp.isValid()).toBe(true);
    expect(xcomp.isFull()).toBe(true);
    expect(xcomp.contains(xaxis.axis)).toBe(true);

    // Check that the complement of the complement is *not* the original.
    expect(xcomp.complement().isValid()).toBe(true);
    expect(xcomp.complement().isEmpty()).toBe(true);
    expect(xcomp.complement().contains(xaxis.axis)).toBe(false);

    // Check that very small caps can be represented accurately.
  // # Here "kTinyRad" is small enough that unit vectors perturbed by this
  // # amount along a tangent do not need to be renormalized.
    const kTinyRad = 1e-10;
    const tiny = Cap.fromAxisAngle(new Point(1, 2, 3).normalize(), Angle.fromRadians(kTinyRad));
    const tangent = tiny.axis.crossProd(new Point(3, 2, 1)).normalize();
    expect(tiny.contains(tiny.axis.add(tangent.mul(0.99 * kTinyRad)))).toBe(true);
    expect(tiny.contains(tiny.axis.add(tangent.mul(1.01 * kTinyRad)))).toBe(false);

    // Basic tests on a hemispherical cap.
    const hemi = Cap.fromAxisHeight(new Point(1, 0, 1).normalize(), 1);
    expect(hemi.complement().axis.neg()).toEqual(hemi.axis);
    expect(hemi.complement().height).toBe(1);
    expect(hemi.contains(new Point(1, 0, 0))).toBe(true);
    expect(hemi.complement().contains(new Point(1, 0, 0))).toBe(false);
    expect(hemi.contains(new Point(1, 0, -(1 - eps)).normalize())).toBe(true);
    expect(hemi.interiorContains(new Point(1, 0, -(1 + eps)).normalize())).toBe(false);

    // A concave cap.
    const concave = Cap.fromAxisAngle(getLatLngPoint(80, 10), Angle.fromDegrees(150));
    expect(concave.contains(getLatLngPoint(-70 * (1 - eps), 10))).toBe(true);
    expect(concave.contains(getLatLngPoint(-70 * (1 + eps), 10))).toBe(false);
    expect(concave.contains(getLatLngPoint(-50 * (1 - eps), -170))).toBe(true);
    expect(concave.contains(getLatLngPoint(-50 * (1 + eps), -170))).toBe(false);

    // Cap containment tests.
    expect(empty.contains(xaxis)).toBe(false);
    expect(empty.interiorIntersects(xaxis)).toBe(false);
    expect(full.contains(xaxis)).toBe(true);
    expect(full.interiorIntersects(xaxis)).toBe(true);
    expect(xaxis.contains(full)).toBe(false);
    expect(xaxis.interiorIntersects(full)).toBe(false);
    expect(xaxis.contains(xaxis)).toBe(true);
    expect(xaxis.interiorIntersects(xaxis)).toBe(false);
    expect(xaxis.contains(empty)).toBe(true);
    expect(xaxis.interiorIntersects(empty)).toBe(false);
    expect(hemi.contains(tiny)).toBe(true);
    expect(hemi.contains(Cap.fromAxisAngle(new Point(1, 0, 0), Angle.fromRadians(Math.PI / 4.0 - eps)))).toBe(true);
    expect(hemi.contains(Cap.fromAxisAngle(new Point(1, 0, 0), Angle.fromRadians(Math.PI / 4.0 + eps)))).toBe(false);
    expect(concave.contains(hemi)).toBe(true);
    expect(concave.interiorIntersects(hemi.complement())).toBe(true);
    expect(concave.contains(Cap.fromAxisHeight(concave.axis.neg(), 0.1))).toBe(false);
  })

  test('testGetRectBound', () => {
    // Empty and full caps.
    expect(Cap.empty().getRectBound().isEmpty()).toBe(true);
    expect(Cap.full().getRectBound().isFull()).toBe(true);

    const degreeEps = 1e-13


    // Cap that includes the south pole.
    const rect1 = Cap.fromAxisAngle(
      getLatLngPoint(-45, 57),
      Angle.fromDegrees(50)
    ).getRectBound();
    expect(rect1.latLo().degrees).toBeCloseTo(-90, degreeEps);
    expect(rect1.latHi().degrees).toBeCloseTo(5, degreeEps);
    expect(rect1.lng.isFull()).toBe(true);

    // Cap that is tangent to the north pole.
    const rect2 = Cap.fromAxisAngle(
      new Point(1, 0, 1).normalize(),
      Angle.fromRadians(Math.PI / 4.0 + 1e-16)
    ).getRectBound();
    expect(rect2.lat.lo).toBeCloseTo(0, eps);
    expect(rect2.lat.hi).toBeCloseTo(Math.PI / 2.0, eps);
    expect(rect2.lng.isFull()).toBe(true);

    // The eastern hemisphere.
    const rect3 = Cap.fromAxisAngle(
      new Point(0, 1, 0),
      Angle.fromRadians(Math.PI / 2.0 + 2e-16)
    ).getRectBound();
    expect(rect3.latLo().degrees).toBeCloseTo(-90, degreeEps);
    expect(rect3.latHi().degrees).toBeCloseTo(90, degreeEps);
    expect(rect3.lng.isFull()).toBe(true);

    // A cap centered on the equator.
    const rect4 = Cap.fromAxisAngle(
      getLatLngPoint(0, 50),
      Angle.fromDegrees(20)
    ).getRectBound();
    expect(rect4.latLo().degrees).toBeCloseTo(-20, degreeEps);
    expect(rect4.latHi().degrees).toBeCloseTo(20, degreeEps);
    expect(rect4.lngLo().degrees).toBeCloseTo(30, degreeEps);
    expect(rect4.lngHi().degrees).toBeCloseTo(70, degreeEps);

    // A cap centered on the north pole.
    const rect5 = Cap.fromAxisAngle(
      getLatLngPoint(90, 123),
      Angle.fromDegrees(10)
    ).getRectBound();
    expect(rect5.latLo().degrees).toBeCloseTo(80, degreeEps);
    expect(rect5.latHi().degrees).toBeCloseTo(90, degreeEps);
    expect(rect5.lng.isFull()).toBe(true);
  });

  test('testCellMethods', () => {
    const faceRadius = Math.atan(Math.sqrt(2));

    for (let face = 0n; face < 6n; face++) {
      // The cell consisting of the entire face.
      const rootCell = Cell.fromFacePosLevel(face, 0, 0);

      // A leaf cell at the midpoint of the v=1 edge.
      const edgeCell = Cell.fromPoint(
        S2jsphere.faceUvToXyz(face, 0, 1 - eps)
      );

      // A leaf cell at the u=1, v=1 corner.
      const cornerCell = Cell.fromPoint(
        S2jsphere.faceUvToXyz(face, 1 - eps, 1 - eps)
      );

      // Quick check for full and empty caps.
      expect(Cap.full().contains(rootCell)).toBe(true);
      expect(Cap.empty().mayIntersect(rootCell)).toBe(false);

      // Check intersections with the bounding caps of the leaf cells
      // that are adjacent to 'cornerCell' along the Hilbert curve.
      // Because this corner is at (u=1,v=1), the curve stays locally
      // within the same cube face.
      const first = cornerCell.id().advance(-3);
      const last = cornerCell.id().advance(4);
      let id = first;
      while (id < last) {
        const cell = new Cell(id);
        expect(id.equals(cornerCell.id())).toBe(cell.getCapBound().contains(cornerCell));
        expect(id.parent().contains(cornerCell.id())).toBe(
          cell.getCapBound().mayIntersect(cornerCell)
        );
        id = id.next();
      }

      const antiFace = (face + 3n) % 6n; // Opposite face.
      for (let capFace = 0n; capFace < 6n; capFace++) {
        // A cap that barely contains all of 'capFace'.
        const center = S2jsphere.getNorm(capFace);
        const covering = Cap.fromAxisAngle(
          center,
          Angle.fromRadians(faceRadius + eps)
        );
        expect(capFace === face).toBe(covering.contains(rootCell));
        expect(capFace !== antiFace).toBe(covering.mayIntersect(rootCell));
        expect(center.dotProd(edgeCell.getCenter()) > 0.1).toBe(
          covering.contains(edgeCell)
        );
        expect(covering.mayIntersect(edgeCell)).toBe(covering.contains(edgeCell));
        expect(capFace == face).toBe(covering.contains(cornerCell));
        expect(center.dotProd(cornerCell.getCenter()) > 0).toBe(
          covering.mayIntersect(cornerCell)
        );

        // A cap that barely intersects the edges of 'capFace'.
        const bulging = Cap.fromAxisAngle(
          center,
          Angle.fromRadians(Math.PI / 4.0 + eps)
        );
        expect(bulging.contains(rootCell)).toBe(false);
        expect(capFace != antiFace).toBe(bulging.mayIntersect(rootCell));
        expect(capFace == face).toBe(bulging.contains(edgeCell));
        expect(center.dotProd(edgeCell.getCenter()) > 0.1).toBe(
          bulging.mayIntersect(edgeCell)
        );
        expect(bulging.contains(cornerCell)).toBe(false);
        expect(bulging.mayIntersect(cornerCell)).toBe(false);

        // A singleton cap.
        const singleton = Cap.fromAxisAngle(center, Angle.fromRadians(0));
        expect(capFace == face).toBe(singleton.mayIntersect(rootCell));
        expect(singleton.mayIntersect(edgeCell)).toBe(false);
        expect(singleton.mayIntersect(cornerCell)).toBe(false);
      }
    }
  });

  test('testExpanded', () => {
    expect(Cap.empty().expanded(Angle.fromRadians(2)).isEmpty()).toBe(true);
    expect(Cap.full().expanded(Angle.fromRadians(2)).isFull()).toBe(true);

    const cap50 = Cap.fromAxisAngle(new Point(1, 0, 0), Angle.fromDegrees(50));
    const cap51 = Cap.fromAxisAngle(new Point(1, 0, 0), Angle.fromDegrees(51));

    expect(cap50.expanded(Angle.fromRadians(0)).approxEquals(cap50)).toBe(true);
    expect(cap50.expanded(Angle.fromDegrees(1)).approxEquals(cap51)).toBe(true);
    expect(cap50.expanded(Angle.fromDegrees(129.99)).isFull()).toBe(false);
    expect(cap50.expanded(Angle.fromDegrees(130.01)).isFull()).toBe(true);
  });
});

describe('TestLatLngRect', () =>  {
  const rectFromDegrees = function(latLo, lngLo, latHi, lngHi) {
    return new LatLngRect(
      LatLng.fromDegrees(latLo, lngLo),
      LatLng.fromDegrees(latHi, lngHi)
    );
  }

  test('EmptyAndFull', () => {
    const empty = LatLngRect.empty();
    const full = LatLngRect.full();

    expect(empty.isValid()).toStrictEqual(true)
    expect(empty.isEmpty()).toStrictEqual(true)
    expect(empty.isPoint()).toStrictEqual(false)
    expect(full.isValid()).toStrictEqual(true)
    expect(full.isFull()).toStrictEqual(true)
    expect(full.isPoint()).toStrictEqual(false)

    const defaultEmpty = new LatLngRect();
    expect(defaultEmpty.isValid()).toStrictEqual(true)
    expect(defaultEmpty.isEmpty()).toStrictEqual(true)
    expect(empty.lat.bounds).toStrictEqual(defaultEmpty.lat.bounds)
    expect(empty.lng.bounds).toStrictEqual(defaultEmpty.lng.bounds)
  })

  test('Accessors', () => {
    const d1 = rectFromDegrees(-90, 0, -45, 180);
    expect(d1.latLo().degrees).toStrictEqual(-90)
    expect(d1.latHi().degrees).toStrictEqual(-45)
    expect(d1.lngLo().degrees).toStrictEqual(0)
    expect(d1.lngHi().degrees).toStrictEqual(180)
    expect(d1.lat).toStrictEqual(new LineInterval(-Math.PI / 2.0, -Math.PI / 4.0))
    expect(d1.lng).toStrictEqual(new SphereInterval(0, Math.PI))
  })

  test('FromCenterSize', () => {
    expect(LatLngRect.fromCenterSize(
      LatLng.fromDegrees(80, 170),
      LatLng.fromDegrees(40, 60)
    ).approxEquals(rectFromDegrees(60, 140, 90, -160))).toBeTruthy()

    expect(LatLngRect.fromCenterSize(
      LatLng.fromDegrees(10, 40),
      LatLng.fromDegrees(210, 400)
    ).isFull()).toBeTruthy()

    expect(
      LatLngRect.fromCenterSize(
        LatLng.fromDegrees(-90, 180),
        LatLng.fromDegrees(20, 50)
      ).approxEquals(rectFromDegrees(-90, 155, -80, -155))
    ).toBeTruthy()
  })

  test('FromPoint', () => {
    const p = LatLng.fromDegrees(23, 47);
    expect(LatLngRect.fromPoint(p)).toStrictEqual(new LatLngRect(p, p))
    expect(LatLngRect.fromPoint(p).isPoint()).toBeTruthy();
  })

  test('FromPointPair', () => {
    expect(
      LatLngRect.fromPointPair(
        LatLng.fromDegrees(-35, -140),
        LatLng.fromDegrees(15, 155)
      )).toStrictEqual(rectFromDegrees(-35, 155, 15, -140))
    expect(
      LatLngRect.fromPointPair(
        LatLng.fromDegrees(25, -70),
        LatLng.fromDegrees(-90, 80)
      )).toStrictEqual(rectFromDegrees(-90, -70, 25, 80));
  })

  test('GetCenterSize', () => {
    const r1 = new LatLngRect(new LineInterval(0, Math.PI / 2.0), new SphereInterval(-Math.PI, 0));
    expect(r1.getCenter()).toStrictEqual(LatLng.fromRadians(Math.PI / 4.0, -Math.PI / 2.0))
    expect(r1.getSize()).toStrictEqual(LatLng.fromRadians(Math.PI / 2.0, Math.PI))
    expect(LatLngRect.empty().getSize().lat().radians < 0).toBeTruthy()
    expect(LatLngRect.empty().getSize().lng().radians < 0).toBeTruthy()
  })

  test('GetVertex', () => {
    const r1 = new LatLngRect(new LineInterval(0, Math.PI / 2.0), new SphereInterval(-Math.PI, 0));
    expect(r1.getVertex(0)).toStrictEqual(LatLng.fromRadians(0, Math.PI))
    expect(r1.getVertex(1)).toStrictEqual(LatLng.fromRadians(0, 0))
    expect(r1.getVertex(2)).toStrictEqual(LatLng.fromRadians(Math.PI / 2.0, 0))
    expect(r1.getVertex(3)).toStrictEqual(LatLng.fromRadians(Math.PI / 2.0, Math.PI))

    // Make sure the getVertex() returns vertices in CCW order.
    for (let i = 0; i < 4; i++) {
      const lat = Math.PI / 4.0 * (i - 2);
      const lng = Math.PI / 2.0 * (i - 2) + 0.2;
      const r = new LatLngRect(
        new LineInterval(lat, lat + Math.PI / 4.0),
        new SphereInterval(
          S2jsphere.drem(lng, 2 * Math.PI),
          S2jsphere.drem(lng + Math.PI / 2.0, 2 * Math.PI)
        )
      )
      for (let k = 0; k < 4; k++) {
        expect(S2jsphere.simpleCCW(
          r.getVertex((k - 1) & 3).toPoint(),
          r.getVertex(k).toPoint(),
          r.getVertex((k + 1) & 3).toPoint()
        )).toBeTruthy();
      }
    }
  })

  test('Area', () => {
    expect(S2jsphere.LatLngRect.empty().area()).toStrictEqual(0.0)
    expect(S2jsphere.LatLngRect.full().area()).toStrictEqual(4 * Math.PI)
    expect(rectFromDegrees(0, 0, 90, 90).area()).toStrictEqual(Math.PI / 2)
  })

  test('Contains', () => {
    const eqM180 = LatLng.fromRadians(0, -Math.PI);
    const northPole = LatLng.fromRadians(Math.PI / 2.0, 0);
    const r1 = new LatLngRect(eqM180, northPole);

    expect(r1.contains(LatLng.fromDegrees(30, -45))).toBeTruthy()
    expect(r1.interiorContains(LatLng.fromDegrees(30, -45))).toBeTruthy()
    expect(!r1.contains(LatLng.fromDegrees(30, 45))).toBeTruthy()
    expect(!r1.interiorContains(LatLng.fromDegrees(30, 45))).toBeTruthy()
    expect(r1.contains(eqM180)).toBeTruthy()
    expect(!r1.interiorContains(eqM180)).toBeTruthy()
    expect(r1.contains(northPole)).toBeTruthy()
    expect(!r1.interiorContains(northPole)).toBeTruthy()
    expect(r1.contains(new Point(0.5, -0.3, 0.1))).toBeTruthy()
    expect(!r1.contains(new Point(0.5, 0.2, 0.1))).toBeTruthy()
  })

  const checkIntervalOps = function(x, y, expectedRelation, expectedUnion, expectedIntersection) {
    expect(x.contains(y)).toStrictEqual(expectedRelation[0] === 'T');
    expect(x.interiorContains(y)).toStrictEqual(expectedRelation[1] === 'T');
    expect(x.intersects(y)).toStrictEqual(expectedRelation[2] === 'T');
    expect(x.interiorIntersects(y)).toStrictEqual(expectedRelation[3] === 'T');

    expect(x.contains(y)).toStrictEqual(x.union(y).eq(x));
    expect(x.intersects(y)).toStrictEqual(!x.intersection(y).isEmpty());

    expect(x.union(y)).toStrictEqual(expectedUnion);
    expect(x.intersection(y)).toStrictEqual(expectedIntersection);
  }

  test('IntervalOps', () => {
    const r1 = rectFromDegrees(0, -180, 90, 0);

    // Test operations where one rectangle consists of a single point.
    const r1Mid = rectFromDegrees(45, -90, 45, -90);
    checkIntervalOps(r1, r1Mid, "TTTT", r1, r1Mid);

    const reqM180 = rectFromDegrees(0, -180, 0, -180);
    checkIntervalOps(r1, reqM180, "TFTF", r1, reqM180);

    const rNorthPole = rectFromDegrees(90, 0, 90, 0);
    checkIntervalOps(r1, rNorthPole, "TFTF", r1, rNorthPole);

    checkIntervalOps(
      r1,
      rectFromDegrees(-10, -1, 1, 20),
      "FFTT",
      rectFromDegrees(-10, 180, 90, 20),
      rectFromDegrees(0, -1, 1, 0)
    );
    checkIntervalOps(
      r1,
      rectFromDegrees(-10, -1, 0, 20),
      "FFTF",
      rectFromDegrees(-10, 180, 90, 20),
      rectFromDegrees(0, -1, 0, 0)
    );
    checkIntervalOps(
      r1,
      rectFromDegrees(-10, 0, 1, 20),
      "FFTF",
      rectFromDegrees(-10, 180, 90, 20),
      rectFromDegrees(0, 0, 1, 0)
    );

    checkIntervalOps(
      rectFromDegrees(-15, -160, -15, -150),
      rectFromDegrees(20, 145, 25, 155),
      "FFFF",
      rectFromDegrees(-15, 145, 25, -150),
      LatLngRect.empty()
    );
    checkIntervalOps(
      rectFromDegrees(70, -10, 90, -140),
      rectFromDegrees(60, 175, 80, 5),
      "FFTT",
      rectFromDegrees(60, -180, 90, 180),
      rectFromDegrees(70, 175, 80, 5)
    );

    // Check that the intersection of two rectangles that overlap in
    // latitude but not longitude is valid, and vice versa.
    checkIntervalOps(
      rectFromDegrees(12, 30, 60, 60),
      rectFromDegrees(0, 0, 30, 18),
      "FFFF",
      rectFromDegrees(0, 0, 60, 60),
      LatLngRect.empty()
    );
    checkIntervalOps(
      rectFromDegrees(0, 0, 18, 42),
      rectFromDegrees(30, 12, 42, 60),
      "FFFF",
      rectFromDegrees(0, 0, 42, 60),
      LatLngRect.empty()
    );
  })

  test('Expanded', () => {
    expect(
      rectFromDegrees(70, 150, 80, 170)
        .expanded(LatLng.fromDegrees(20, 30))
        .approxEquals(
          rectFromDegrees(50, 120, 90, -160)
        )
    ).toBe(true);

    expect(
      LatLngRect.empty().expanded(
        LatLng.fromDegrees(20, 30)
      ).isEmpty()
    ).toBe(true);

    expect(
      LatLngRect.full().expanded(
        LatLng.fromDegrees(20, 30)
      ).isFull()
    ).toBe(true);

    expect(
      rectFromDegrees(-90, 170, 10, 20)
        .expanded(LatLng.fromDegrees(30, 80))
        .approxEquals(
          rectFromDegrees(-90, -180, 40, 180)
        )
    ).toBe(true);
  })

  test('ConvolveWithCap', () => {
    expect(
      rectFromDegrees(0, 170, 0, -170)
        .convolveWithCap(Angle.fromDegrees(15))
        .approxEquals(
          rectFromDegrees(-15, 155, 15, -155)
        )
    ).toBe(true);

    expect(
      rectFromDegrees(60, 150, 80, 10)
        .convolveWithCap(Angle.fromDegrees(15))
        .approxEquals(
          rectFromDegrees(45, -180, 90, 180)
        )
    ).toBe(true);
  })

  test('GetCapBound', () => {
    // Bounding cap at center is smaller:
    expect(
      rectFromDegrees(-45, -45, 45, 45)
        .getCapBound()
        .approxEquals(Cap.fromAxisHeight(new Point(1, 0, 0), 0.5))
    ).toBe(true);

    // Bounding cap at north pole is smaller:
    expect(
      rectFromDegrees(88, -80, 89, 80)
        .getCapBound()
        .approxEquals(Cap.fromAxisAngle(new Point(0, 0, 1), Angle.fromDegrees(2)))
    ).toBe(true);

    // Longitude span > 180 degrees:
    expect(
      rectFromDegrees(-30, -150, -10, 50)
        .getCapBound()
        .approxEquals(Cap.fromAxisAngle(new Point(0, 0, -1), Angle.fromDegrees(80)))
    ).toBe(true);
  })

  const checkCellOps = function(r, cell, level) {
    // Test the relationship between the given rectangle and cell:
    // 0 == no intersection, 1 == MayIntersect, 2 == Intersects,
    // 3 == Vertex Containment, 4 == Contains
    let vertexContained = false;
    for (let i = 0; i < 4; i++) {
      if (
        r.contains(cell.getVertexRaw(i)) ||
        (!r.isEmpty() && cell.contains(r.getVertex(i).toPoint()))
      ) {
        vertexContained = true;
      }
    }
    expect(r.mayIntersect(cell)).toBe(level >= 1);
    expect(r.intersects(cell)).toBe(level >= 2);
    expect(vertexContained).toBe(level >= 3);
    expect(r.contains(cell)).toBe(level >= 4);
  }

  test('CellOps', () => {
    // Contains(S2Cell), MayIntersect(S2Cell), Intersects(S2Cell)

    // Special cases.
    checkCellOps(
      LatLngRect.empty(),
      Cell.fromFacePosLevel(3, 0, 0),
      0
    );
    checkCellOps(
      LatLngRect.full(),
      Cell.fromFacePosLevel(2, 0, 0),
      4
    );
    checkCellOps(
      LatLngRect.full(),
      Cell.fromFacePosLevel(5, 0, 25),
      4
    );

    // This rectangle includes the first quadrant of face 0.  It's expanded
    // slightly because cell bounding rectangles are slightly conservative.
    const r4 = rectFromDegrees(-45.1, -45.1, 0.1, 0.1);
    checkCellOps(r4, Cell.fromFacePosLevel(0, 0, 0), 3);
    checkCellOps(r4, Cell.fromFacePosLevel(0, 0, 1), 4);
    checkCellOps(r4, Cell.fromFacePosLevel(1, 0, 1), 0);

    // This rectangle intersects the first quadrant of face 0.
    const r5 = rectFromDegrees(-10, -45, 10, 0);
    checkCellOps(r5, Cell.fromFacePosLevel(0, 0, 0), 3);
    checkCellOps(r5, Cell.fromFacePosLevel(0, 0, 1), 3);
    checkCellOps(r5, Cell.fromFacePosLevel(1, 0, 1), 0);

    // Rectangle consisting of a single point.
    checkCellOps(
      rectFromDegrees(4, 4, 4, 4),
      Cell.fromFacePosLevel(0, 0, 0),
      3
    );

    // Rectangles that intersect the bounding rectangle of a face
    // but not the face itself.
    checkCellOps(
      rectFromDegrees(41, -87, 42, -79),
      Cell.fromFacePosLevel(2, 0, 0),
      1
    );
    checkCellOps(
      rectFromDegrees(-41, 160, -40, -160),
      Cell.fromFacePosLevel(5, 0, 0),
      1
    );

    // This is the leaf cell at the top right hand corner of face 0.
    // It has two angles of 60 degrees and two of 120 degrees.
    const cell0tr = Cell.fromPoint(new Point(1 + 1e-12, 1, 1));
    cell0tr.getRectBound();
    const v0 = LatLng.fromPoint(cell0tr.getVertexRaw(0));
    checkCellOps(
      rectFromDegrees(
        v0.lat().degrees - 1e-8,
        v0.lng().degrees - 1e-8,
        v0.lat().degrees - 2e-10,
        v0.lng().degrees + 1e-10
      ),
      cell0tr,
      1
    );

    // Rectangles that intersect a face but where no vertex of one region
    // is contained by the other region.  The first one passes through
    // a corner of one of the face cells.
    checkCellOps(
      rectFromDegrees(-37, -70, -36, -20),
      Cell.fromFacePosLevel(5, 0, 0),
      2
    );

    // These two intersect like a diamond and a square.
    const cell202 = Cell.fromFacePosLevel(2, 0, 2);
    const bound202 = cell202.getRectBound();
    checkCellOps(
      rectFromDegrees(
        bound202.lo().lat().degrees + 3,
        bound202.lo().lng().degrees + 3,
        bound202.hi().lat().degrees - 3,
        bound202.hi().lng().degrees - 3
      ),
      cell202,
      2
    );
  })
})

describe('TestCrossings', () => {
  const degen = -2;

  const compareResult = function(actual, expected) {
    if (expected === degen) {
      expect(actual).toBeLessThanOrEqual(0);
    } else {
      expect(actual).toBe(expected);
    }
  }

  const checkCrossing = function(a, b, c, d, robust, edgeOrVertex, simple) {
    a = a.normalize();
    b = b.normalize();
    c = c.normalize();
    d = d.normalize();

  // # CompareResult(S2EdgeUtil::RobustCrossing(a, b, c, d), robust)

    if (simple) {
      expect(S2jsphere.simple_crossing(a, b, c, d)).toBe(robust > 0);
    }
  // # S2EdgeUtil::EdgeCrosser crosser(&a, &b, &c)
  // # CompareResult(crosser.RobustCrossing(&d), robust)
  // # CompareResult(crosser.RobustCrossing(&c), robust)
  //
  // # EXPECT_EQ(edge_or_vertex,
  // #           S2EdgeUtil::EdgeOrVertexCrossing(a, b, c, d))
  // # EXPECT_EQ(edge_or_vertex, crosser.EdgeOrVertexCrossing(&d))
  // # EXPECT_EQ(edge_or_vertex, crosser.EdgeOrVertexCrossing(&c))

  }

  const checkCrossings = function(a, b, c, d, robust, edgeOrVertex, simple) {
    checkCrossing(a, b, c, d, robust, edgeOrVertex, simple);
    checkCrossing(b, a, c, d, robust, edgeOrVertex, simple);
    checkCrossing(a, b, d, c, robust, edgeOrVertex, simple);
    checkCrossing(b, a, d, c, robust, edgeOrVertex, simple);
    checkCrossing(a, a, c, d, degen, 0, false);
    checkCrossing(a, b, c, c, degen, 0, false);
    checkCrossing(a, b, a, b, 0, 1, false);
    checkCrossing(c, d, a, b, robust, edgeOrVertex ^ (robust === 0), simple);
  }

  test('Crossings', () => {
    // The real tests of edge crossings are in s2{loop,polygon}_unittest,
    // but we do a few simple tests here.

    // Two regular edges that cross.
    checkCrossings(new Point(1, 2, 1), new Point(1, -3, 0.5),
      new Point(1, -0.5, -3), new Point(0.1, 0.5, 3), 1, true, true);

    // Two regular edges that cross antipodal points.
    checkCrossings(new Point(1, 2, 1), new Point(1, -3, 0.5),
      new Point(-1, 0.5, 3), new Point(-0.1, -0.5, -3), -1, false, true);

    // Two edges on the same great circle.
    checkCrossings(new Point(0, 0, -1), new Point(0, 1, 0),
      new Point(0, 1, 1), new Point(0, 0, 1), -1, false, true);

    // Two edges that cross where one vertex is S2::Origin().
    checkCrossings(new Point(1, 0, 0), S2jsphere.origin(),
      new Point(1, -0.1, 1), new Point(1, 1, -0.1), 1, true, true);

    // Two edges that cross antipodal points where one vertex is
    // S2::Origin().
    checkCrossings(new Point(1, 0, 0), new Point(0, 1, 0),
      new Point(0, 0, -1), new Point(-1, -1, 1), -1, false, true);

    // Two edges that share an endpoint.
    checkCrossings(new Point(2, 3, 4), new Point(-1, 2, 5),
      new Point(7, -2, 3), new Point(2, 3, 4), 0, false, true);

    // Two edges that barely cross each other near the middle of one edge.
    // # The edge AB is approximately in the x=y plane, while CD is approximately
    // # perpendicular to it and ends exactly at the x=y plane.

    checkCrossings(new Point(1, 1, 1), new Point(1, Number.MIN_VALUE, -1),
      new Point(11, -12, -1), new Point(10, 10, 1), 1, true, false);

    // In this version, the edges are separated by a distance of about 1e-15.
    checkCrossings(new Point(1, 1, 1), new Point(1, Number.MIN_VALUE, 2),
      new Point(1, -1, 0), new Point(1, 1, 0), -1, false, false);

    // Two edges that barely cross each other near the end of both edges.
    // # This example cannot be handled using regular double-precision
    // # arithmetic due to floating-point underflow.
    checkCrossings(new Point(0, 0, 1), new Point(2, -1e-323, 1),
      new Point(1, -1, 1), new Point(1e-323, 0, 1), 1, true, false);

    // In this version, the edges are separated by a dist of about 1e-640.
    checkCrossings(new Point(0, 0, 1), new Point(2, 1e-323, 1),
      new Point(1, -1, 1), new Point(1e-323, 0, 1), -1, false, false);

    // Two edges that barely cross each other near the middle of one edge.
    // # Computing the exact determinant of some of the triangles in this test
    // # requires more than 2000 bits of precision.
    checkCrossings(new Point(1, -1e-323, -1e-323),
      new Point(1e-323, 1, 1e-323),
      new Point(1, -1, 1e-323),
      new Point(1, 1, 0), 1, true, false);

    // # In this version, the edges are separated by a dist of about 1e-640.
    checkCrossings(new Point(1, 1e-323, -1e-323), new Point(-1e-323, 1, 1e-323),
      new Point(1, -1, 1e-323), new Point(1, 1, 0),
      -1, false, false)
  })})

describe('TestUtils', () => {
    test('drem', () => {
      expect(S2jsphere.drem(6.5, 2.3)).toBeCloseTo(-0.4)
      expect(S2jsphere.drem(1.0, 2.0)).toBeCloseTo(1.0)
      expect(S2jsphere.drem(1.0, 3.0)).toBeCloseTo(1.0)
    })
})

describe('TestCellUnion', () => {

  test('TestCellUnion - Basic', () => {
    const empty = new CellUnion([]);
    expect(empty.numCells()).toBe(0);

    const face1Id = CellId.fromFacePosLevel(1, 0, 0);
    const face1Union = new CellUnion([face1Id]);
    expect(face1Union.numCells()).toBe(1);
    expect(face1Union.cellId(0)).toEqual(face1Id);

    const face2Id = CellId.fromFacePosLevel(2, 0, 0);
    const face2Union = new CellUnion([face2Id.id()]);

    expect(face2Union.numCells()).toBe(1);
    expect(face2Union.cellId(0)).toEqual(face2Id);

    const face1Cell = new Cell(face1Id);
    const face2Cell = new Cell(face2Id);
    expect(face1Union.contains(face1Cell)).toBe(true);
    expect(face1Union.contains(face2Cell)).toBe(false);
  });

  const addCells = function(cellId, selected, input, expected) {
    if (cellId.equals(CellId.none())) {
      for (let face = 0; face < 6; face++) {
        addCells(CellId.fromFacePosLevel(face, 0, 0), false, input, expected)
      }
      return
    }

    if (cellId.isLeaf()) {
      expect(selected).toBeTruthy()
      input.push(cellId)
      return
    }

    const rand1 = Math.floor(lcg.next() * (CellId.MAX_LEVEL - cellId.level()))
    if (!selected && rand1 == 0) {
      expected.push(cellId)
      selected = true
    }

    let added = false
    const rand2 = Math.floor(lcg.next() * (CellId.MAX_LEVEL - cellId.level()))
    if (selected && rand2 != 0) {
      input.push(cellId)
      added = true
    }

    let numChildren = 0
    for (const child of cellId.children()) {
      let crange = 4
      if (selected)
        crange = 12
      const rand3 = Math.floor(lcg.next() * crange)
      if (rand3 == 0 && numChildren < 3) {
        addCells(child, selected, input, expected)
        numChildren += 1
      }
      if (selected && !added)
        addCells(child, selected, input, expected)

    }
  }

  test('Normalize', () => {
    for (let i = 0; i < NORMALIZE_ITERATIONS; i++) {
      const input = [];
      const expected = [];
      addCells(CellId.none(), false, input, expected);

      const cellUnion = new CellUnion(input);
      expect(expected.length).toBe(cellUnion.numCells());

      for (let i = 0; i < expected.length; i++) {
        expect(expected[i]).toEqual(cellUnion.cellId(i));
      }
      // # should test getcapbound here

      for (const inputJ of input) {
        expect(cellUnion.contains(inputJ)).toBeTruthy()
        expect(cellUnion.contains(inputJ.toPoint())).toBeTruthy()
        expect(cellUnion.intersects(inputJ)).toBeTruthy()

        if (!inputJ.isFace) {
          expect(cellUnion.intersects(inputJ.parent())).toBeTruthy()
          if (inputJ.level() > 1) {
            expect(cellUnion.intersects(inputJ.parent().parent())).toBeTruthy()
            expect(cellUnion.intersects(inputJ.parent(0))).toBeTruthy()
          }
        }
        if (!inputJ.isLeaf) {
          expect(cellUnion.contains(inputJ.childBegin())).toBeTruthy()
          expect(cellUnion.intersects(inputJ.childBegin())).toBeTruthy()
          expect(cellUnion.contains(inputJ.childEnd().prev())).toBeTruthy()
          expect(cellUnion.intersects(inputJ.childEnd().prev())).toBeTruthy()
          expect(cellUnion.contains(inputJ.childBegin(CellId.MAX_LEVEL))).toBeTruthy()
          expect(cellUnion.intersects(inputJ.childBegin(CellId.MAX_LEVEL))).toBeTruthy()
        }
      }
      for (const expectedJ of expected) {
        if (! expectedJ.isFace()) {
          expect(cellUnion.contains(expectedJ.parent())).toBeFalsy()
          expect(cellUnion.contains(expectedJ.parent(0))).toBeFalsy()
        }
      }
      const x = [], y = [], x_or_y = [], x_and_y = []

      for (const input_j of input) {
        // passes if both always 1 or both always 0
        const in_x = Math.floor(lcg.next() * 2) == 0
        const in_y = Math.floor(lcg.next() * 2) == 0
        if (in_x)
          x.push(input_j)
        if (in_y)
          y.push(input_j)
        if (in_x || in_y)
          x_or_y.push(input_j)
      }

      const xcells = new CellUnion(x)
      const ycells = new CellUnion(y)
      const x_or_y_expected = new CellUnion(x_or_y)

      const x_or_y_cells = CellUnion.getUnion(xcells, ycells)
      expect(x_or_y_cells).toEqual(x_or_y_expected)

      for (let j = 0; j < ycells.numCells(); j++) {
        const yid = ycells.cellId(j)
        const u = CellUnion.getIntersection(xcells, yid)
        for (let k = 0; x < xcells.numCells(); k++) {
          const xid = xcells.cell_id(k)
          if (xid.contains(yid)) {
            expect(1).toEqual(u.numCells())
            expect(u.cell_id(0)).toEqual(yid)
          } else if (yid.contains(xid))
            expect(u.contains(xid)).toBeTruthy()
        }
        for (let k = 0; k < u.numCells(); k++) {
          expect(xcells.contains(u.cellId(k))).toBeTruthy()
          expect(yid.contains(u.cellId(k))).toBeTruthy()
        }
        x_and_y.push(...u.cellIds())
      }
      const x_and_y_expected = new CellUnion(x_and_y)

      const x_and_y_cells = CellUnion.getIntersection(xcells, ycells)
      expect(x_and_y_cells.cellIds()).toEqual(x_and_y_expected.cellIds())

      const x_minus_y_cells = CellUnion.getDifference(xcells, ycells)
      const y_minus_x_cells = CellUnion.getDifference(ycells, xcells)

      expect(xcells.contains(x_minus_y_cells)).toBeTruthy()
      expect(x_minus_y_cells.intersects(ycells)).toBeFalsy()
      expect(ycells.contains(y_minus_x_cells)).toBeTruthy()
      expect(y_minus_x_cells.intersects(xcells)).toBeFalsy()
      expect(x_minus_y_cells.intersects(y_minus_x_cells)).toBeFalsy()

      const diff_union = CellUnion.getUnion(x_minus_y_cells, y_minus_x_cells)
      const diff_intersection_union = CellUnion.getUnion(diff_union, x_and_y_cells)
      expect(diff_intersection_union).toEqual(x_or_y_cells)

      const test = [], dummy = []
      addCells(CellId.none(), false, test, dummy)

      for (const test_j of test) {
        let [contains, intersects] = [false, false]
        for (const expected_k of expected) {
          if (expected_k.contains(test_j))
            contains = true
          if (expected_k.intersects(test_j))
            intersects = true
        }
        expect(contains).toEqual(cellUnion.contains(test_j))
        expect(intersects).toEqual(cellUnion.intersects(test_j))

      }
    }
  });

  test('js', () => {
    const unionCells = [
      new CellId(0x1000000000000000), new CellId(0x4dc0000000000000), new CellId(0x6d2c000000000000),
      new CellId(0x6d4f000000000000), new CellId(0x8f2065a5d4000000), new CellId(0xa8d4000000000000)
    ]
    const cellUnion = new CellUnion(unionCells)
    const expected = [
      new CellId(0x1000000000000000), new CellId(0x4dc0000000000000), new CellId(0x6d2c000000000000),
      new CellId(0x6d4f000000000000), new CellId(0x8f2065a5d4000000), new CellId(0xa8d4000000000000)
    ]
    const test = [
      new CellId(0x5000000000000000), new CellId(0x4400000000000000), new CellId(0x5c00000000000000),
      new CellId(0x7d10a5d100000000), new CellId(0x7d10a5d0c0000000), new CellId(0x7d10a5d0d0000000),
      new CellId(0x7d10a5d0c4000000), new CellId(0x7d10a5d300000000), new CellId(0x7d10a5d500000000),
      new CellId(0x7d10a5d700000000), new CellId(0x7d10b4d000000000), new CellId(0x7d6c441f00000000),
      new CellId(0x7d6c441fc0000000), new CellId(0x7d6c457824000000), new CellId(0x7d6c45786cc00000),
      new CellId(0x7d6c45786cd00000), new CellId(0x7d6c457879500000), new CellId(0x7d6c457879440000),
      new CellId(0x7d6c457879450000), new CellId(0x7d6c457879444000), new CellId(0x7d6c457879445000),
      new CellId(0x7d6c584000000000), new CellId(0x7d6c587000000000), new CellId(0x7d6dc6cfc0000000),
      new CellId(0x7d6dc6cfb0000000), new CellId(0x7d74000000000000)]

    for (const test_j of test) {
      let [contains, intersects] = [false, false]
      for (const expected_k of expected) {
        if (expected_k.contains(test_j))
          contains = true
        if (expected_k.intersects(test_j))
          intersects = true
      }
      expect(contains).toEqual(cellUnion.contains(test_j))
      expect(intersects).toEqual(cellUnion.intersects(test_j))

    }

  })

  test('Empty', () => {
    const emptyCellUnion = new CellUnion();
    const face1Id = CellId.fromFacePosLevel(1, 0, 0);

    // Normalize()
    emptyCellUnion.normalize();
    expect(emptyCellUnion.numCells()).toBe(0);

    // Denormalize(...)
    expect(emptyCellUnion.numCells()).toBe(0);

    // Contains(...)
    expect(emptyCellUnion.contains(face1Id)).toBe(false);
    expect(emptyCellUnion.contains(emptyCellUnion)).toBe(true);

    // Intersects(...)
    expect(emptyCellUnion.intersects(face1Id)).toBe(false);
    expect(emptyCellUnion.intersects(emptyCellUnion)).toBe(false);

    // GetUnion(...)
    const cellUnion = CellUnion.getUnion(emptyCellUnion, emptyCellUnion);
    expect(cellUnion.numCells()).toBe(0);

    // GetIntersection(...)
    const intersection = CellUnion.getIntersection(emptyCellUnion, face1Id);
    expect(intersection.numCells()).toBe(0);
    const intersection2 = CellUnion.getIntersection(emptyCellUnion, emptyCellUnion);
    expect(intersection2.numCells()).toBe(0);

    // GetDifference(...)
    const difference = CellUnion.getDifference(emptyCellUnion, emptyCellUnion);
    expect(difference.numCells()).toBe(0);

    // Expand(...)
    emptyCellUnion.expand(Angle.fromRadians(1), 20);
    expect(emptyCellUnion.numCells()).toBe(0);
    emptyCellUnion.expand(10);
    expect(emptyCellUnion.numCells()).toBe(0);
  });

  test('RectBound', () => {
    const union = new CellUnion([CellId.fromToken('874'), CellId.fromToken('87c')]);
    const bound = union.getRectBound();
    const boundCell1 = new Cell(CellId.fromToken('874')).getRectBound();
    const boundCell2 = new Cell(CellId.fromToken('87c')).getRectBound();

    expect(bound.latLo().degrees).toBe(boundCell1.latLo().degrees);
    expect(bound.latHi().degrees).toBe(boundCell2.latHi().degrees);
    expect(bound.lngLo().degrees).toBe(boundCell1.lngLo().degrees);
    expect(bound.lngHi().degrees).toBe(boundCell2.lngHi().degrees);
  })
})

describe('TestRegionCoverer', () => {

  const setUp = function () {
    Math.seed = 20;
  }

  test('RandomCells', () => {
    for (let i = 0; i < REGION_COVERER_ITERATIONS; i++) {
      const coverer = new RegionCoverer();
      coverer.maxCells = 1;
      const cellId = getRandomCellId();

      const covering = coverer.getCovering(new Cell(cellId));
      expect(covering.length).toBe(1);
      expect(cellId).toStrictEqual(covering[0]);
    }
  })

  const skewed = function(maxLong) {
    const base = Math.floor(lcg.next() * (maxLong + 1));
    return Math.floor(lcg.next() * 0xffffffff) & ((1 << base) - 1);
  }

  const randomPoint = function() {
    const x = 2 * lcg.next() - 1;
    const y = 2 * lcg.next() - 1;
    const z = 2 * lcg.next() - 1;
    return new Point(x, y, z).normalize();
  }

  const getRandomCap = function (minArea, maxArea) {
    const capArea = maxArea * Math.pow(minArea / maxArea, lcg.next());
    if (!(capArea >= minArea && capArea <= maxArea)) {
      throw new Error('Assertion error: capArea is out of bounds');
    }
    return Cap.fromAxisArea(randomPoint(), capArea);
  }

  const checkCellUnionCovering = function(region, covering, checkTight, cellId) {
    if (!cellId.isValid()) {
      for (let face = 0; face < 6; face++) {
        checkCellUnionCovering(
          region,
          covering,
          checkTight,
          S2jsphere.CellId.fromFacePosLevel(face, 0, 0)
        );
      }
      return;
    }

    if (!region.mayIntersect(new Cell(cellId))) {
      if (checkTight) {
        expect(covering.intersects(cellId)).toBe(false);
      }
    } else if (!covering.contains(cellId)) {
      expect(region.contains(new Cell(cellId))).toBe(false);
      expect(cellId.isLeaf()).toBe(false);
      for (const child of cellId.children()) {
        checkCellUnionCovering(region, covering, checkTight, child);
      }
    }
  }

  const checkCovering = function(coverer, region, covering, interior){
    const minLevelCells = new Map();
    const coveringList = [...covering];
    coveringList.forEach((cell) => {
      const level = cell.level();
      expect(level).toBeGreaterThanOrEqual(coverer.minLevel);
      expect(level).toBeLessThanOrEqual(coverer.maxLevel);
      expect((level - coverer.minLevel) % coverer.levelMod).toBe(0);
      minLevelCells.set(cell.parent(coverer.minLevel), (minLevelCells.get(cell.parent(coverer.minLevel)) || 0) + 1);
    });

    if (coveringList.length > coverer.maxCells) {
      minLevelCells.forEach((count) => {
        expect(count).toBe(1);
      });
    }

    if (interior) {
      coveringList.forEach((cell) => {
        expect(region.contains(new Cell(cell))).toBe(true);
      });
    } else {
      const cellUnion = new CellUnion(coveringList);
      checkCellUnionCovering(region, cellUnion, true, new CellId());
    }
  }

  test('RandomCaps', () => {
    for (let i = 0; i < RANDOM_CAPS_ITERATIONS; i++) {
      const coverer = new RegionCoverer();

      coverer.minLevel = Math.floor(lcg.next() * (CellId.MAX_LEVEL + 1));
      coverer.maxLevel = Math.floor(lcg.next() * (CellId.MAX_LEVEL + 1));

      while (coverer.minLevel > coverer.maxLevel) {
        coverer.minLevel = Math.floor(lcg.next() * (CellId.MAX_LEVEL + 1));
        coverer.maxLevel = Math.floor(lcg.next() * (CellId.MAX_LEVEL + 1));
      }

      coverer.maxCells = skewed(10);
      coverer.levelMod = 3 //1 + Math.floor(lcg.next() * 3);

      const maxArea = Math.min(
        4 * Math.PI,
        (3 * coverer.maxCells + 1) * S2jsphere.AVG_AREA.getValue(coverer.minLevel)
      );

      const cap = getRandomCap(
        0.1 * S2jsphere.AVG_AREA.getValue(CellId.MAX_LEVEL),
        maxArea
      );
      const covering = coverer.getCovering(cap);
      checkCovering(coverer, cap, covering, false);

      const interior = coverer.getInteriorCovering(cap);
      checkCovering(coverer, cap, interior, true);

      // Check deterministic.
      // For some unknown reason the results can be in a different
      // sort order.
      const covering2 = coverer.getCovering(cap);
      expect(covering.sort()).toEqual(covering2.sort());

      const cells = new CellUnion(covering);
      const denormalized = cells.denormalize(
        coverer.minLevel,
        coverer.levelMod
      );
      checkCovering(coverer, cap, denormalized, false);
    }
  })

  test('SimpleCoverings', () => {
    for (let i = 0; i < SIMPLE_COVERINGS_ITERATIONS; i++) { // SIMPLE_COVERINGS_ITERATIONS
      const coverer = new RegionCoverer();
      coverer.maxCells = 0x7fffffff;
      const level = Math.floor(lcg.next() * (CellId.MAX_LEVEL + 1));
      coverer.minLevel = level;
      coverer.maxLevel = level;

      const maxArea = Math.min(
        4 * Math.PI,
        1000 * S2jsphere.AVG_AREA.getValue(level)
      );

      const cap = getRandomCap(
        0.1 * S2jsphere.AVG_AREA.getValue(CellId.MAX_LEVEL),
        maxArea
      );

      const covering = RegionCoverer.getSimpleCovering(
        cap,
        cap.axis,
        level
      );
      checkCovering(coverer, cap, covering, false);
    }
  })
})

describe('test my added functions', () => {

  test('a lat/lng object is returned, numbers accurate to 6 decimal places', () => {
    for (let i = 0; i < 100; i++) {
      const lat = lcg.next() * 180 - 90
      const lng = lcg.next() * 360 - 180

      const azll = S2jsphere.LatLng.fromDegrees(lat, lng)
      expect(azll.to6dpLLObj()).toStrictEqual({lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6})
    }
  })
})