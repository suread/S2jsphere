/*
Javascript versions of Python library functions used in s2sphere.
Copyright (c) 2024 Azrael42

Licence and copyright for S2jsphere
Copyright (c) 2024 Azrael42

S2jsphere has been based on the Python port, s2sphere, rather than working direct from the original S2 library, this has been based on the Python port, s2sphere.

Licence and copyright for s2sphere:
The MIT License (MIT)

Copyright (c) 2014 qedus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

const az = {}
const S2jsphere = {}

// window.az = az
// window.S2jsphere = S2jsphere


// min heap priority queue  written to match behaviour of Python's heapq
// to give complete functionality, also required heappushpop, heapify, heapreplace, merge, nlargest, nsmallest
// these are not required for current usage so not bothered.
az.heapq = {
  heappush(heap, item) {
    // add item to end of heap
    let pos = heap.length
    heap.push(item)

    // sort item to correct place in heap
    while (pos > 0) {
      let parent = Math.floor((pos-1)/2)
      if (heap[pos].priority < heap[parent].priority) {
        let tmp = heap[parent]
        heap[parent] = heap[pos]
        heap[pos] = tmp
        pos = parent
      }  else {
        return
      }
    }
  },

  heappop(heap) {
    if (heap.length === 0)
      return null
    if (heap.length === 1)
      return heap.pop()

    let rtn = heap[0]
    heap[0] = heap.pop()

    let pos = 0
    while (pos < Math.floor(heap.length / 2)) {
      let swap = pos
      let c1 = pos * 2 + 1
      let c2 = pos * 2 + 2
      // if c2 index is equal to array length - this child does not exist!!
      if (c2 === heap.length) {
        if (heap[pos].priority > heap[c1].priority) {
          swap = c1
        } else {
          return rtn
        }
      } else if (heap[c1].priority > heap[c2].priority && heap[pos].priority > heap[c2].priority) {
        swap = c2
      }
      else if (heap[pos].priority > heap[c1].priority) {
        swap = c1
      }
      else
        return rtn
      let tmp = heap[swap]
      heap[swap] = heap[pos]
      heap[pos] = tmp
      pos = swap
    }
    return rtn
  }

}

// Array bisection algorithm written to match selected behaviour of Python's bisect.
// not included: all parameters for bisect_left; bisect_right, bisect, insort_left, insort_right, insort
// comparator - function that defines less than for user classes
az.bisect = {
  bisectLeft(a, x, options = {}) {
    let lo = 0, hi = a.length
    if (options.lo !== undefined)
      lo = options.lo
    if (options.hi !== undefined)
      hi = options.hi
    if (options.comparator === undefined) {
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (a[mid] < x) {
          lo = mid + 1
        } else {
          hi = mid
        }
      }
    } else {
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (options.comparator(a[mid],x)) {
          lo = mid + 1
        } else {
          hi = mid
        }
      }

    }
    return lo
  }
}

az.ldexp = function(x, exp) {
  return x * Math.pow(2, exp);
}

az.frexp = function frexp(x) {
  if (x === 0) {
    return [0, 0];
  }

  const exponent = Math.ceil(Math.log2(Math.abs(x)))
  const fraction = x / Math.pow(2, exponent);

  return [fraction, exponent];
}

az.pythonModulo = function(n, M) {
    return ((n % M) + M) % M
}

az.bigIntToNumber = function(n) {
  const asNumber = Number(n)
  if (BigInt(asNumber) !== n) {
    throw new Error("problem with BigInt conversions: " + n)
  }
  return asNumber
}

S2jsphere.Angle = class {
  /**
   * A one-dimensional angle (as opposed to a two-dimensional solid angle).
   * It has methods for converting angles to or from radians and degrees.
   * @param {number} radians - Angle in radians
   * @see S1Angle
   */
  #radians

  constructor(radians = 0) {
    if (typeof radians !== 'number') {
      throw new Error('Invalid argument: radians must be a number');
    }
    this.#radians = radians;
  }

  equals(other) {
    return other instanceof S2jsphere.Angle && this.#radians === other.#radians;
  }

  notEquals(other) {
    return !this.equals(other);
  }

  lessThan(other) {
    return this.#radians < other.#radians;
  }

  add(other) {
    return new S2jsphere.Angle(this.#radians + other.#radians);
  }

  toString() {
    return `${this.constructor.name}: ${this.radians}`;
  }

  //utility functions as not in Javascript Math library
  static radiansFromDegrees(degrees) {
    return (Math.PI / 180) * degrees
  }

  static degreesFromRadians(radians) {
    return (180 / Math.PI) * radians
  }

  static fromDegrees(degrees) {
    /**
     * Class generator
     * @param {number} degrees - Degrees
     */
    return new S2jsphere.Angle(S2jsphere.Angle.radiansFromDegrees(degrees));
  }

  static fromRadians(radians) {
    return new S2jsphere.Angle(radians);
  }

  get radians() {
    return this.#radians;
  }

  get degrees() {
    return S2jsphere.Angle.degreesFromRadians(this.#radians)
  }
}

/*
 * A point in 3d Euclidean space.
 * "Normalised" points are points on the unit sphere
 * see :cpp:type:`S2Point`
 */
S2jsphere.Point = class {
  /**
   * A point in 3D Euclidean space.
   * "Normalized" points are points on the unit sphere.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @see S2Point
   */

  #point

  constructor(x, y, z) {
    this.#point = [x, y, z];
  }

  get(index) {
    return this.#point[index];
  }

  neg() {
    return new S2jsphere.Point(-this.get(0), -this.get(1), -this.get(2));
  }

  equals(other) {
    return (
      other instanceof S2jsphere.Point &&
      this.#point.toString() === other.#point.toString()
    );
  }

  notEquals(other) {
    return !this.equals(other);
  }

  toString() {
    return `Point: ${this.#point.toString()}`;
  }

  add(other) {
    return new S2jsphere.Point(
      this.get(0) + other.get(0),
      this.get(1) + other.get(1),
      this.get(2) + other.get(2)
    );
  }

  subtract(other) {
    return new S2jsphere.Point(
      this.get(0) - other.get(0),
      this.get(1) - other.get(1),
      this.get(2) - other.get(2)
    );
  }

  mul(other) {
    return new S2jsphere.Point(
      this.get(0) * other,
      this.get(1) * other,
      this.get(2) * other
    );
  }

  rmul(other) {
    return new S2jsphere.Point(
      this.get(0) * other,
      this.get(1) * other,
      this.get(2) * other
    );
  }

  abs() {
    return new S2jsphere.Point(
      Math.abs(this.get(0)),
      Math.abs(this.get(1)),
      Math.abs(this.get(2))
    );
  }

  largestAbsComponent() {
    const temp = this.abs();
    if (temp.get(0) > temp.get(1)) {
      if (temp.get(0) > temp.get(2)) {
        return 0;
      } else {
        return 2;
      }
    } else {
      if (temp.get(1) > temp.get(2)) {
        return 1;
      } else {
        return 2;
      }
    }
  }

  angle(other) {
    return Math.atan2(this.crossProd(other).norm(), this.dotProd(other));
  }

  crossProd(other) {
    const [x, y, z] = this.#point;
    const [ox, oy, oz] = other.#point;
    return new S2jsphere.Point(
      y * oz - z * oy,
      z * ox - x * oz,
      x * oy - y * ox
    );
  }

  dotProd(other) {
    const [x, y, z] = this.#point;
    const [ox, oy, oz] = other.#point;
    return x * ox + y * oy + z * oz;
  }

  norm2() {
    const [x, y, z] = this.#point;
    return x * x + y * y + z * z;
  }

  norm() {
    return Math.sqrt(this.norm2());
  }

  normalize() {
    let n = this.norm();
    if (n !== 0) {
      n = 1.0 / n;
    }
    return new S2jsphere.Point(
      this.get(0) * n,
      this.get(1) * n,
      this.get(2) * n
    );
  }
}

S2jsphere.LatLng = class {
  /**
   * A point on a sphere in latitude-longitude coordinates.
   * @param {number} lat - Latitude in radians
   * @param {number} lng - Longitude in radians
   * @see S2LatLng
   */

  #coords

  constructor(lat, lng) {
    this.#coords = [lat, lng]
  }

  static fromDegrees(lat, lng) {
    return new S2jsphere.LatLng(S2jsphere.Angle.radiansFromDegrees(lat),
                                         S2jsphere.Angle.radiansFromDegrees(lng));
  }

  static fromRadians(lat, lng) {
    return new S2jsphere.LatLng(lat, lng);
  }

  static fromPoint(point) {
    return new S2jsphere.LatLng(
      S2jsphere.LatLng.latitude(point).radians,
      S2jsphere.LatLng.longitude(point).radians
    );
  }

  static fromAngles(lat, lng) {
    return new S2jsphere.LatLng(lat.radians, lng.radians);
  }

  static default() {
    return new S2jsphere.LatLng(0, 0);
  }

  static invalid() {
    return new S2jsphere.LatLng(Math.PI, 2 * Math.PI);
  }

  equals(other) {
    return (
      other instanceof S2jsphere.LatLng &&
      this.#coords.toString() === other.#coords.toString() // TODO do we need string conversion to check equality of array?
    );
  }

  notEquals(other) {
    return !this.equals(other);
  }

  toString() {
    const lat = S2jsphere.Angle.degreesFromRadians(this.#coords[0])
    const lng = S2jsphere.Angle.degreesFromRadians(this.#coords[1])
    return `LatLng: ${lat},${lng}`;
  }

  add(other) {
    return new S2jsphere.LatLng(
      this.lat().radians + other.lat().radians,
      this.lng().radians + other.lng().radians
    );
  }

  subtract(other) {
    return new S2jsphere.LatLng(
      this.lat().radians - other.lat().radians,
      this.lng().radians - other.lng().radians
    );
  }

  // only implemented so we can do scalar * LatLng
  rmul(scalar) {
    return new S2jsphere.LatLng(
      scalar * this.lat().radians,
      scalar * this.lng().radians
    );
  }

  static latitude(point) {
    return S2jsphere.Angle.fromRadians(
      Math.atan2(point.get(2), Math.sqrt(point.get(0) * point.get(0) + point.get(1) * point.get(1)))
    );
  }

  static longitude(point) {
    return S2jsphere.Angle.fromRadians(Math.atan2(point.get(1), point.get(0)));
  }

  lat() {
    return S2jsphere.Angle.fromRadians(this.#coords[0]);
  }

  lng() {
    return S2jsphere.Angle.fromRadians(this.#coords[1]);
  }

  isValid() {
    return (
      Math.abs(this.lat().radians) <= Math.PI / 2 &&
      Math.abs(this.lng().radians) <= Math.PI
    );
  }

  toPoint() {
    const phi = this.lat().radians;
    const theta = this.lng().radians;
    const cosphi = Math.cos(phi);
    return new S2jsphere.Point(
      Math.cos(theta) * cosphi,
      Math.sin(theta) * cosphi,
      Math.sin(phi)
    );
  }

  /*
  convert a LatLng object to an object of the form {lat: lat, lng: lng}
  rounded to 6dp - this makes a reasonably precise value, and matches the precision seen in Niantic's games
   */
  to6dpLLObj() {
    return {lat: parseFloat(S2jsphere.Angle.degreesFromRadians(this.#coords[0]).toFixed(6)),
            lng: parseFloat(S2jsphere.Angle.degreesFromRadians(this.#coords[1]).toFixed(6))}
  }
  normalized() {
    return new S2jsphere.LatLng(
      Math.max(-Math.PI / 2.0, Math.min(Math.PI / 2.0, this.lat().radians)),
      S2jsphere.drem(this.lng().radians, 2 * Math.PI)
    );
  }

  approxEquals(other, maxError = 1e-15) {
    return (
      Math.abs(this.lat().radians - other.lat().radians) < maxError &&
      Math.abs(this.lng().radians - other.lng().radians) < maxError
    );
  }

  getDistance(other) {
    if (!this.isValid() || !other.isValid()) {
      throw new Error('Invalid LatLng object');
    }

    const fromLat = this.lat().radians;
    const toLat = other.lat().radians;
    const fromLng = this.lng().radians;
    const toLng = other.lng().radians;

    const dLat = Math.sin(0.5 * (toLat - fromLat));
    const dLng = Math.sin(0.5 * (toLng - fromLng));
    const x = dLat * dLat + dLng * dLng * Math.cos(fromLat) * Math.cos(toLat);

    return S2jsphere.Angle.fromRadians(
      2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0.0, 1.0 - x)))
    );
  }
}

S2jsphere.Cap = class {
  #axis
  #height
    /**
     * A spherical cap, which is a portion of a sphere cut off by a plane.
     * @param {S2jsphere.Point} axis
     * @param {number} height
     * @see S2Cap
     */
    constructor(axis = new S2jsphere.Point(1, 0, 0), height = -1) {
      this.#axis = axis;
      this.#height = height;
    }

    static get ROUND_UP() {
      return 1.0 + (1.0 / (1 << 26)) / (1 << 26)
    }

    ROUND_UP = 1.0 + (1.0 / (1 << 26)) / (1 << 26)


    toString() {
      return `${this.constructor.name}: ${this.#axis} ${this.#height}`;
    }

    static fromAxisHeight(axis, height) {
      if (S2jsphere.isUnitLength(axis))
        return new S2jsphere.Cap(axis, height);
      throw new Error("Axis isn't unit length")
    }

    static fromAxisAngle(axis, angle) {
      if (S2jsphere.isUnitLength(axis) && angle.radians >= 0)
        return new S2jsphere.Cap(axis, this.getHeightForAngle(angle.radians));
      throw new Error("Invalid axis/angle combo")
    }

    static getHeightForAngle(radians) {
      if (radians >= 0) {
        if (radians >= Math.PI) {
          return 2;
        }
        const d = Math.sin(0.5 * radians);
        return 2 * d * d;
      }
      throw new Error("Angle cannot be negative")
      }

    static fromAxisArea(axis, area) {
      if (S2jsphere.isUnitLength(axis))
        return new S2jsphere.Cap(axis, area / (2 * Math.PI));
      throw new Error("Axis is not unit length")
    }

    static empty() {
      return new S2jsphere.Cap();
    }

    static full() {
      return new S2jsphere.Cap(new S2jsphere.Point(1, 0, 0), 2);
    }

    get height() {
      return this.#height;
    }

    get axis() {
      return this.#axis;
    }

    area() {
      // 2 * pi * height
      return 2 * Math.PI * Math.max(0.0, this.height);
    }

    angle() {
      if (this.isEmpty()) {
        return S2jsphere.Angle.fromRadians(-1);
      }
      return S2jsphere.Angle.fromRadians(2 * Math.asin(Math.sqrt(0.5 * this.height)));
    }

    isValid() {
      return S2jsphere.isUnitLength(this.#axis) && this.height <= 2;
    }

    isEmpty() {
      return this.height < 0;
    }

    isFull() {
      return this.height >= 2;
    }

    getCapBound() {
      return this;
    }

    addPoint(point) {
      if (!S2jsphere.isUnitLength(point)) throw new Error("Point must be unit length")
      if (this.isEmpty()) {
        this.#axis = point;
        this.#height = 0;
      } else {
        const dist2 = (this.#axis.subtract(point)).norm2();
        this.#height = Math.max(this.height, S2jsphere.Cap.ROUND_UP * 0.5 * dist2);
      }
    }

    complement() {
      let height
      if (this.isFull()) {
        height = -1;
      } else {
        height = 2 - Math.max(this.height, 0.0);
      }
      return S2jsphere.Cap.fromAxisHeight(this.#axis.neg(), height);
    }

    contains(other) {
      if (other instanceof S2jsphere.Cap) {
        if (this.isFull() || other.isEmpty()) {
          return true;
        }
        return this.angle().radians >= this.#axis.angle(other.axis) + other.angle().radians;
      } else if (other instanceof S2jsphere.Point) {
        if (! S2jsphere.isUnitLength(other)) throw new Error("Must be unit length")
        return (this.axis.subtract(other)).norm2() <= 2 * this.height;
      } else if (other instanceof S2jsphere.Cell) {
        let vertices = []
        for (let k = 0; k < 4; k++) {
          vertices.push(other.getVertex(k))
          if (! this.contains(vertices[k]))
            return false
        }
        return (!this.complement().intersects(other, vertices))
      } else {
        throw new Error('Not implemented');
      }
    }

    interiorContains(other) {
      if (other instanceof S2jsphere.Point) {
        if (!S2jsphere.isUnitLength(other)) throw new Error()
        return this.isFull() || (this.#axis.subtract(other)).norm2() < 2 * this.height;
      } else {
        throw new Error('Not implemented');
      }
    }

    intersects() {
      if (arguments.length === 1 && arguments[0] instanceof S2jsphere.Cap) {
        let other = arguments[0]
        if (this.isEmpty() || other.isEmpty())
          return false
        return (this.angle().radians + other.angle().radians >= this.#axis().angle(other.axis()))
      } else if (arguments.length === 2 && arguments[0] instanceof S2jsphere.Cell && Array.isArray(arguments[1])) {
        let [cell, vertices] = arguments
        if (this.height >= 1)
          return false
        if (this.isEmpty())
          return false
        if (cell.contains(this.axis))
          return true
        let sin2_angle = this.height * (2 - this.height)
        for (let k = 0; k < 4; k++) {
          let edge = cell.getEdgeRaw(k)
          let dot = this.axis.dotProd(edge)
          if (dot > 0)
            continue
          if (dot * dot > sin2_angle * edge.norm2())
            return false
          let dir = edge.crossProd(this.axis)
          if (dir.dotProd(vertices[k]) < 0 && dir.dotProd(vertices[(k + 1) & 3]) > 0)
            return true
        }
        return false
      } else {
        throw new Error('Not implemented');
      }
    }

    mayIntersect(other) {
      const vertices = [];
      for (let k = 0; k < 4; k++) {
        vertices.push(other.getVertex(k));
        if (this.contains(vertices[k])) {
          return true;
        }
      }
      return this.intersects(other, vertices);
    }

    interiorIntersects(other) {
      if (this.height <= 0 || other.isEmpty())
        return false
      return (this.angle().radians + other.angle().radians > this.axis.angle(other.axis))
    }

    getRectBound() {
      if (this.isEmpty()) {
        return S2jsphere.LatLngRect.empty();
      }

      const axisLL = S2jsphere.LatLng.fromPoint(this.#axis);
      const capAngle = this.angle().radians;
      let allLongitudes = false;

      const lat = [axisLL.lat().radians - capAngle, axisLL.lat().radians + capAngle];
      const lng = [-Math.PI, Math.PI]

      if (lat[0] <= -Math.PI / 2.0) {
        lat[0] = -Math.PI / 2.0;
        allLongitudes = true;
      }
      if (lat[1] >= Math.PI / 2.0) {
        lat[1] = Math.PI / 2.0;
        allLongitudes = true;
      }

      if (!allLongitudes) {
        const sinA = Math.sqrt(this.height * (2 - this.height));
        const sinC = Math.cos(axisLL.lat().radians);
        if (sinA <= sinC) {
          const angleA = Math.asin(sinA / sinC);
          lng[0] = S2jsphere.drem(axisLL.lng().radians - angleA, 2 * Math.PI);
          lng[1] = S2jsphere.drem(axisLL.lng().radians + angleA, 2 * Math.PI);
        }
      }

      return new S2jsphere.LatLngRect(new S2jsphere.LineInterval(...lat), new S2jsphere.SphereInterval(...lng));
    }

    approxEquals(other, maxError = 1e-14) {
      return (
        (this.#axis.angle(other.axis) <= maxError && Math.abs(this.height - other.height) <= maxError) ||
        (this.isEmpty() && other.height <= maxError) ||
        (other.isEmpty() && this.height <= maxError) ||
        (this.isFull() && other.height >= 2 - maxError) ||
        (other.isFull() && this.height >= 2 - maxError)
      );
    }

    expanded(distance) {
      if (distance.radians < 0) throw new Error()
      if (this.isEmpty()) {
        return this.constructor.empty();
      }
      return this.constructor.fromAxisAngle(this.#axis, this.angle().add(distance));
    }
 }

S2jsphere.LatLngRect = class {
/*
    """A rectangle in latitude-longitude space.

    see :cpp:class:`S2LatLngRect`
    """
 */
  #lat
  #lng
  constructor() {
    if (arguments.length === 0) {
      this.#lat = S2jsphere.LineInterval.empty();
      this.#lng = S2jsphere.SphereInterval.empty();
    } else if (arguments[0] instanceof S2jsphere.LatLng && arguments[1] instanceof S2jsphere.LatLng) {
      const [lo, hi] = arguments;
      this.#lat = new S2jsphere.LineInterval(lo.lat().radians, hi.lat().radians);
      this.#lng = new S2jsphere.SphereInterval(lo.lng().radians, hi.lng().radians);
    } else if (arguments[0] instanceof S2jsphere.LineInterval && arguments[1] instanceof S2jsphere.SphereInterval) {
      [this.#lat, this.#lng] = arguments;
    } else {
      throw new Error("Not implemented");
    }
  }

  eq(other) {
    return (
      other instanceof this.constructor &&
      this.lat.equals(other.lat) &&
      this.lng.equals(other.lng)
    );
  }

  ne(other) {
    return !this.eq(other);
  }

  toString() {
    return `${this.constructor.name}: ${this.lat}, ${this.lng}`;
  }

  get lat() {
    return this.#lat;
  }

  get lng() {
    return this.#lng;
  }

  latLo() {
    return S2jsphere.Angle.fromRadians(this.lat.lo);
  }

  latHi() {
    return S2jsphere.Angle.fromRadians(this.lat.hi);
  }

  lngLo() {
    return S2jsphere.Angle.fromRadians(this.lng.lo);
  }

  lngHi() {
    return S2jsphere.Angle.fromRadians(this.lng.hi);
  }

  lo() {
    return S2jsphere.LatLng.fromAngles(this.latLo(), this.lngLo());
  }

  hi() {
    return S2jsphere.LatLng.fromAngles(this.latHi(), this.lngHi());
  }

  // Construct a rectangle of the given size centered around the given point.
  // "center" needs to be normalized, but "size" does not.  The latitude
  // interval of the result is clamped to [-90,90] degrees, and the longitude
  // interval of the result is Full() if and only if the longitude size is
  // 360 degrees or more.  Examples of clamping (in degrees):
  //
  //   center=(80,170),  size=(40,60)   -> lat=[60,90],   lng=[140,-160]
  //   center=(10,40),   size=(210,400) -> lat=[-90,90],  lng=[-180,180]
  //   center=(-90,180), size=(20,50)   -> lat=[-90,-80], lng=[155,-155]
  static fromCenterSize(center, size) {
    return this.fromPoint(center).expanded(size.rmul(0.5));
  }

  static fromPoint(p) {
    if (!p.isValid()) {
      throw new Error("Invalid point");
    }
    return new this(p, p);
  }

  static fromPointPair(a, b) {
    if (!a.isValid() || !b.isValid()) {
      throw new Error("Invalid points");
    }
    return new S2jsphere.LatLngRect(
      S2jsphere.LineInterval.fromPointPair(a.lat().radians, b.lat().radians),
      S2jsphere.SphereInterval.fromPointPair(a.lng().radians, b.lng().radians)
    );
  }

  static full_lat() {
    return new S2jsphere.LineInterval(-Math.PI / 2.0, Math.PI / 2.0);
  }

  static full_lng() {
    return S2jsphere.SphereInterval.full();
  }

  static full() {
    return new S2jsphere.LatLngRect(this.full_lat(), this.full_lng());
  }

  isFull() {
    return this.lat.equals(this.constructor.full_lat()) && this.lng.isFull();
  }

  isValid() {
    return (
      Math.abs(this.lat.lo) <= Math.PI / 2.0 &&
      Math.abs(this.lat.hi) <= Math.PI / 2.0 &&
      this.lng.isValid() &&
      this.lat.isEmpty() === this.lng.isEmpty()
    );
  }

  static empty() {
    return new this();
  }

  getCenter() {
    return S2jsphere.LatLng.fromRadians(this.lat.getCenter(), this.lng.getCenter());
  }

  getSize() {
    return S2jsphere.LatLng.fromRadians(this.lat.getLength(), this.lng.getLength());
  }

  getVertex(k) {
    // Twiddle bits to return the points in CCW order (SW, SE, NE, NW)
    return S2jsphere.LatLng.fromRadians(
      this.lat.bound(k >> 1),
      this.lng.bound((k >> 1) ^ (k & 1))
    );
  }

  area() {
    // """Area in steradians."""
    if (this.isEmpty()) {
      return 0.0;
    }

    return this.lng.getLength() * Math.abs(
      Math.sin(this.latHi().radians) - Math.sin(this.latLo().radians)
    );
  }

  isEmpty() {
    return this.lat.isEmpty();
  }

  isPoint() {
    return this.lat.lo === this.lat.hi && this.lng.lo === this.lng.hi;
  }

  convolveWithCap(angle) {
    const cap = S2jsphere.Cap.fromAxisAngle(new S2jsphere.Point(1, 0, 0), angle);

    let r = this;
    for (let k = 0; k < 4; k++) {
      const vertex_cap = S2jsphere.Cap.fromAxisHeight(
        this.getVertex(k).toPoint(),
        cap.height
      );
      r = r.union(vertex_cap.getRectBound());
    }
    return r;
  }

  contains(other) {
    if (other instanceof S2jsphere.Point) {
      return this.contains(S2jsphere.LatLng.fromPoint(other));
    } else if (other instanceof S2jsphere.LatLng) {
      if (! other.isValid()) throw new Error("Invalid Point")
      return (
        this.lat.contains(other.lat().radians) &&
        this.lng.contains(other.lng().radians)
      );
    } else if (other instanceof this.constructor) {
      return (
        this.lat.contains(other.lat) &&
        this.lng.contains(other.lng)
      );
    } else if (other instanceof S2jsphere.Cell) {
      return this.contains(other.getRectBound());
    } else {
      throw new Error("Not implemented");
    }
  }

  interiorContains(other) {
    if (other instanceof S2jsphere.Point) {
      this.interiorContains(S2jsphere.Angle.LatLng(other));
    } else if (other instanceof S2jsphere.LatLng) {
      if(! other.isValid()) throw new Error("Invalid LatLng")
      return (
        this.lat.interiorContains(other.lat().radians) &&
        this.lng.interiorContains(other.lng().radians)
      );
    } else if (other instanceof this.constructor) {
      return (
        this.lat.interiorContains(other.lat) &&
        this.lng.interiorContains(other.lng)
      );
    } else {
      throw new Error("Not implemented");
    }
  }

  mayIntersect(cell) {
    return this.intersects(cell.getRectBound());
  }

  intersects() {
    if (arguments[0] instanceof this.constructor) {
      const other = arguments[0];
      return (
        this.lat.intersects(other.lat) &&
        this.lng.intersects(other.lng)
      );
    } else if (arguments[0] instanceof S2jsphere.Cell) {
      const cell = arguments[0];
      if (this.isEmpty()) {
        return false;
      }
      if (this.contains(cell.getCenterRaw())) {
        return true;
      }
      if (cell.contains(this.getCenter().toPoint())) {
        return true;
      }
      if (!this.intersects(cell.getRectBound())) {
        return false;
      }

      const cell_v = [];
      const cell_ll = [];
      for (let i = 0; i < 4; i++) {
        cell_v.push(cell.getVertex(i));
        cell_ll.push(S2jsphere.LatLng.fromPoint(cell_v[i]));
        if (this.contains(cell_ll[i])) {
          return true;
        }
        if (cell.contains(this.getVertex(i).toPoint())) {
          return true;
        }
      }

      for (let i = 0; i < 4; i++) {
        const edge_lng = S2jsphere.SphereInterval.fromPointPair(
          cell_ll[i].lng().radians,
          cell_ll[(i + 1) & 3].lng().radians
        );
        if (!this.lng.intersects(edge_lng)) {
          continue;
        }

        const a = cell_v[i];
        const b = cell_v[(i + 1) & 3];
        if (edge_lng.contains(this.lng.lo)) {
          if (this.constructor.intersects_lng_edge(
            a, b,
            this.lat, this.lng.lo
          )) {
            return true;
          }
        }
        if (edge_lng.contains(this.lng.hi)) {
          if (this.constructor.intersects_lng_edge(
            a, b,
            this.lat, this.lng.hi
          )) {
            return true;
          }
        }
        if (this.constructor.intersects_lat_edge(
          a, b,
          this.lat.lo, this.lng
        )) {
          return true;
        }
        if (this.constructor.intersects_lat_edge(
          a, b,
          this.lat.hi, this.lng
        )) {
          return true;
        }
      }
      return false;
    } else {
      throw new Error("Not implemented");
    }
  }

  static intersects_lng_edge(a, b, lat, lng) {
    return S2jsphere.simple_crossing(
      a, b,
      S2jsphere.LatLng.fromRadians(lat.lo, lng).toPoint(),
      S2jsphere.LatLng.fromRadians(lat.hi, lng).toPoint()
    );
  }

  static intersects_lat_edge(a, b, lat, lng) {
    if (!S2jsphere.isUnitLength(a) || !S2jsphere.isUnitLength(b)) throw new Error()

    let z = S2jsphere.robustCrossProd(a, b).normalize();
    if (z[2] < 0) {
      z = -z;
    }

    let y = S2jsphere.robustCrossProd(z, new S2jsphere.Point(0, 0, 1)).normalize();
    let x = y.crossProd(z);
    if (!S2jsphere.isUnitLength(x) || x[2] < 0) throw new Error()

    const sin_lat = Math.sin(lat);
    if (Math.abs(sin_lat) >= x[2]) {
      return false;
    }

    if (x[2] <= 0) throw new Error()
    const cos_theta = sin_lat / x[2];
    const sin_theta = Math.sqrt(1 - cos_theta * cos_theta);
    const theta = Math.atan2(sin_theta, cos_theta);

    const ab_theta = S2jsphere.SphereInterval.fromPointPair(
      Math.atan2(a.dotProd(y), a.dotProd(x)),
      Math.atan2(b.dotProd(y), b.dotProd(x))
    );

    if (ab_theta.contains(theta)) {
      let isect = x * cos_theta + y * sin_theta;
      if (lng.contains(Math.atan2(isect[1], isect[0]))) {
        return true;
      }
    }
    if (ab_theta.contains(-theta)) {
      let isect = x * cos_theta - y * sin_theta;
      if (lng.contains(Math.atan2(isect[1], isect[0]))) {
        return true;
      }
    }
    return false;
  }

  interiorIntersects() {
    if (arguments[0] instanceof this.constructor) {
      const other = arguments[0];
      return (
        this.lat.interiorIntersects(other.lat) &&
        this.lng.interiorIntersects(other.lng)
      );
    } else {
      throw new Error("Not implemented");
    }
  }

  union(other) {
    return new this.constructor(
      this.lat.union(other.lat),
      this.lng.union(other.lng)
    );
  }

  intersection(other) {
    const lat = this.lat.intersection(other.lat);
    const lng = this.lng.intersection(other.lng);
    if (lat.isEmpty() || lng.isEmpty()) {
      return this.constructor.empty();
    }
    return new this.constructor(lat, lng);
  }

  // Return a rectangle that contains all points whose latitude distance from
  // this rectangle is at most margin.lat(), and whose longitude distance
  // from this rectangle is at most margin.lng().  In particular, latitudes
  // are clamped while longitudes are wrapped.  Note that any expansion of an
  // empty interval remains empty, and both components of the given margin
  // must be non-negative.  "margin" does not need to be normalized.
  //
  // NOTE: If you are trying to grow a rectangle by a certain *distance* on
  // the sphere (e.g. 5km), use the ConvolveWithCap() method instead.
  expanded(margin) {
    if (margin.lat().radians <= 0 || margin.lng().radians <= 0)
      throw new Error()
    return new this.constructor(
      this.lat
        .expanded(margin.lat().radians)
        .intersection(this.constructor.full_lat()),
      this.lng.expanded(margin.lng().radians)
    );
  }

  approxEquals(other, max_error = 1e-15) {
    return (
      this.lat.approxEquals(other.lat, max_error) &&
      this.lng.approxEquals(other.lng, max_error)
    );
  }

  getCapBound() {
    if (this.isEmpty()) {
      return Cap.empty();
    }

    let pole_z;
    let pole_angle;
    if (this.lat.lo + this.lat.hi < 0) {
      pole_z = -1;
      pole_angle = Math.PI / 2.0 + this.lat.hi;
    } else {
      pole_z = 1;
      pole_angle = Math.PI / 2.0 - this.lat.lo;
    }

    const pole_cap = S2jsphere.Cap.fromAxisAngle(
      new S2jsphere.Point(0, 0, pole_z),
      S2jsphere.Angle.fromRadians(pole_angle)
    );

    const lngSpan = this.lng.hi- this.lng.lo;
    if (S2jsphere.drem(lngSpan, 2 * Math.PI) >= 0) {
      if (lngSpan < 2 * Math.PI) {
        const mid_cap = S2jsphere.Cap.fromAxisAngle(
          this.getCenter().toPoint(),
          S2jsphere.Angle.fromRadians(0)
        );

        for (let k = 0; k < 4; k++) {
          mid_cap.addPoint(this.getVertex(k).toPoint());
        }
        if (mid_cap.height < pole_cap.height) {
          return mid_cap;
        }
      }
    }
    return pole_cap;
  }
};

// Constants for CellId
S2jsphere.LOOKUP_BITS = 4
S2jsphere.SWAP_MASK = 0x01
S2jsphere.INVERT_MASK = 0x02
S2jsphere.SWAP_MASK_BIG = BigInt(S2jsphere.SWAP_MASK)
S2jsphere.INVERT_MASK_BIG = BigInt(S2jsphere.INVERT_MASK)

S2jsphere.POS_TO_IJ = [[0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2]]
S2jsphere.POS_TO_ORIENTATION = [S2jsphere.SWAP_MASK, 0, 0, S2jsphere.INVERT_MASK | S2jsphere.SWAP_MASK]
S2jsphere.LOOKUP_POS = Array((1 << (2 * S2jsphere.LOOKUP_BITS + 2)))
S2jsphere.LOOKUP_IJ = Array((1 << (2 * S2jsphere.LOOKUP_BITS + 2)))

// used for one-off initialisation of static arrays
S2jsphere._init_lookup_cell = function(level, i, j, orig_orientation, pos, orientation) {
  if (level === S2jsphere.LOOKUP_BITS) {
    const ij = (i << S2jsphere.LOOKUP_BITS) + j
    S2jsphere.LOOKUP_POS[(ij << 2) + orig_orientation] = (pos << 2) + orientation
    S2jsphere.LOOKUP_IJ[(pos << 2) + orig_orientation] = BigInt((ij << 2) + orientation)
  } else {
    level = level + 1
    i <<= 1
    j <<= 1
    pos <<= 2
    let r = S2jsphere.POS_TO_IJ[orientation]
    for (let index = 0; index < 4; index++) {
      S2jsphere._init_lookup_cell(
        level, i + (r[index] >> 1),
        j + (r[index] & 1), orig_orientation,
        pos + index, orientation ^ S2jsphere.POS_TO_ORIENTATION[index],
      )
    }
  }
}

// call this for one-off initialisation of static arrays
console.log("AzS2 static array initialisation")
S2jsphere._init_lookup_cell(0, 0, 0, 0, 0, 0)
S2jsphere._init_lookup_cell(0, 0, 0, S2jsphere.SWAP_MASK, 0, S2jsphere.SWAP_MASK)
S2jsphere._init_lookup_cell(0, 0, 0, S2jsphere.INVERT_MASK, 0, S2jsphere.INVERT_MASK)
S2jsphere._init_lookup_cell(0, 0, 0, S2jsphere.SWAP_MASK | S2jsphere.INVERT_MASK, 0, S2jsphere.SWAP_MASK | S2jsphere.INVERT_MASK)

S2jsphere.CellId = class {
  /*
      S2 cell id (S2CellId)

      The 64-bit ID has:

      - 3 bits to encode the _face
      - 0-60 bits to encode the position
      - a 1

      The final 1 is the least significant bit (lsb) in the underlying integer
      representation and is returned with :func:`s2sphere.CellId.lsb`.
*/
  // Projection types
  static LINEAR_PROJECTION = 0;
  static TAN_PROJECTION = 1;
  static QUADRATIC_PROJECTION = 2;

  // Current projection used
  static PROJECTION = this.QUADRATIC_PROJECTION;

  static FACE_BITS = 3n;
  static NUM_FACES = 6;
  static MAX_LEVEL = 30;
  static POS_BITS = BigInt(2 * this.MAX_LEVEL + 1);
  static MAX_SIZE = 1 << this.MAX_LEVEL;
  static WRAP_OFFSET = BigInt(this.NUM_FACES) << this.POS_BITS;
  #id;

  constructor(id_=0n) {
    this.#id = az.pythonModulo(BigInt(id_), 0xffffffffffffffffn)
  }

  toString() {
    return 'CellId: ' + this.id().toString(16).padStart(16, '0');
  }

  equals(other) {
    return (other instanceof this.constructor && this.id() === other.id())
  }

  notEquals(other) {
    return !this.equals(other);
  }

  lessThan(other) {
    return this.id() < other.id();
  }

  static fromLatLng(ll) {
    return this.fromPoint(ll.toPoint());
  }

  static fromPoint(p) {
    const [ face, u, v ] = S2jsphere.xyzToFaceUv(p);
    const i = this.stToIJ(this.uvToSt(u));
    const j = this.stToIJ(this.uvToSt(v));
    return this.fromFaceIJ(face, i, j);
  }

  static fromFacePosLevel(face, pos, level) {
    return new S2jsphere.CellId((BigInt(face) << this.POS_BITS) + (BigInt(pos) | 1n)).parent(level);
  }

  static fromFaceIJ(face, i, j) {
    face = BigInt(face)
    i = BigInt(i)
    j = BigInt(j)
    let n = face << BigInt(this.POS_BITS - 1n)
    let bits = face & S2jsphere.SWAP_MASK_BIG;

    for (let k = 7; k >= 0; k--) {
      const mask = (1 << S2jsphere.LOOKUP_BITS) - 1;
      bits += (((i >> BigInt(k * S2jsphere.LOOKUP_BITS)) & BigInt(mask)) << BigInt(S2jsphere.LOOKUP_BITS + 2));
      bits += (((j >> BigInt(k * S2jsphere.LOOKUP_BITS)) & BigInt(mask)) << 2n);
      bits = BigInt(S2jsphere.LOOKUP_POS[bits]);
      n |= (bits >> 2n) << BigInt(k * 2 * S2jsphere.LOOKUP_BITS);
      bits &= BigInt(S2jsphere.SWAP_MASK | S2jsphere.INVERT_MASK);
    }

    return new this(n * 2n + 1n);
  }

  static fromFaceIJWrap(face, i, j) {
    // Convert i and j to the coordinates of a leaf cell just beyond the
    // boundary of this _face.  This prevents 32-bit overflow in the case
    // of finding the neighbors of a _face cell
    i = Math.max(-1, Math.min(this.MAX_SIZE, i));
    j = Math.max(-1, Math.min(this.MAX_SIZE, j));

    // Find the (u,v) coordinates corresponding to the center of cell (i,j).
    // For our purposes it's sufficient to always use the linear projection
    // from (s,t) to (u,v): u=2*s-1 and v=2*t-1.
    const scale = 1.0 / this.MAX_SIZE;
    const u = scale * (az.bigIntToNumber(BigInt(i) << 1n) + 1 - this.MAX_SIZE);
    const v = scale * (az.bigIntToNumber(BigInt(j) << 1n) + 1 - this.MAX_SIZE);

    // Find the leaf cell coordinates on the adjacent _face, and convert
    // them to a cell id at the appropriate _level.  We convert from (u,v)
    // back to (s,t) using s=0.5*(u+1), t=0.5*(v+1).
//    const { _face: newFace, u: newU, v: newV } = S2jsphere.xyzToFaceUV(S2jsphere.faceUvToXyx(_face, u, v));
    const [ newFace, newU, newV ] = S2jsphere.xyzToFaceUv(S2jsphere.faceUvToXyz(face, u, v));
    return this.fromFaceIJ(
      newFace,
      this.stToIJ(0.5 * (newU + 1)),
      this.stToIJ(0.5 * (newV + 1))
    );
  }

  static fromFaceIJSame(face, i, j, sameFace) {
    return sameFace ? this.fromFaceIJ(face, i, j) : this.fromFaceIJWrap(face, i, j);
  }

  static stToIJ(s) {
    return Math.max(0, Math.min(this.MAX_SIZE - 1, Math.floor(this.MAX_SIZE * s)))
  }

  static lsbForLevel(level) {
    return 1n << BigInt((2 * (this.MAX_LEVEL - level)));
  }

  parent() {
    if (! this.isValid()) new Error()
    if (arguments.length === 0) {
      if (this.isFace()) new Error()
      const newLsb = this.lsb() << 2n;
      return new this.constructor((this.id() & -newLsb) | newLsb);
    } else if (arguments.length === 1) {
      const level = arguments[0];
      if (level < 0) new Error()
      if (level > this.level()) new Error()
      const newLsb = this.constructor.lsbForLevel(level);
      return new this.constructor((this.id() & -newLsb) | newLsb);
    }
  }

  child(pos) {
    if (this.isValid() && !this.isLeaf()) {
      const newLsb = this.lsb() >> 2n;
      return new this.constructor(this.id() + BigInt(2 * pos + 1 - 4) * newLsb);
    }
    throw new Error('Invalid operation');
  }

  contains(other) {
    if (this.isValid() && other.isValid()) {
      return other >= this.rangeMin() && other <= this.rangeMax();
    }
    console.log(other)
    throw new Error('Invalid operation');
  }

  intersects(other) {
    if (this.isValid() && other.isValid()) {
      return other.rangeMin() <= this.rangeMax() && other.rangeMax() >= this.rangeMin();
    }
    throw new Error('Invalid operation');
  }

  isFace() {
    return (this.id() & (this.constructor.lsbForLevel(0) - 1n)) === 0n;
  }

  id() {
    return this.#id;
  }

  isValid() {
    return this.face() < this.constructor.NUM_FACES && (this.lsb() & 0x1555555555555555n) !== 0n;
  }

  lsb() {
   // console.log("lsb: ",(this.id() & -this.id()), ", ", Number(this.id() & -this.id()))
    return this.id() & -this.id();
  }

  face() {
    return this.bigIntToNumber(this.id() >> this.constructor.POS_BITS);
  }

  // face as a BigInt for internal use
  _face() {
    return this.id() >> this.constructor.POS_BITS;
  }

  pos() {
    // is this correct?

    return (this.id() & (0xffffffffffffffffn >> this.constructor.FACE_BITS))
  }

  bigIntToNumber(n) {
    return az.bigIntToNumber(n)
  }

  isLeaf() {
    return (this.id() & 1n) !== 0n;
  }

  level() {
    if (this.isLeaf()) {
      return this.constructor.MAX_LEVEL;
    }

    let x = this.id() & 0xffffffffn;
    let level = -1;
    if (x !== 0n) {
      level += 16;
    } else {
      // is this correct?
      x = (this.id() >> 32n) & 0xffffffffn;
    }

    x &= -x;
    if (x & 0x00005555n) {
      level += 8;
    }
    if (x & 0x00550055n) {
      level += 4;
    }
    if (x & 0x05050505n) {
      level += 2;
    }
    if (x & 0x11111111n) {
      level += 1;
    }

    if (level >= 0 && level <= this.constructor.MAX_LEVEL) {
      return level;
    }
    throw new Error("Level calculation out of range.")
  }

  childBegin() {
    if (! this.isValid()) throw new Error ()
    if (arguments.length === 0) {
      if (this.isLeaf())
        throw new Error()
      const oldLsb = this.lsb();
      return new this.constructor(this.#id - oldLsb + (oldLsb >> 2n));

    } else if (arguments.length === 1) {
      const level = arguments[0];
      if (level < this.level() || level > this.constructor.MAX_LEVEL) {
        throw new Error()

      }
      return new this.constructor(this.#id - this.lsb() + this.constructor.lsbForLevel(level));

    } else {
      throw new Error('no args or _level arg');
    }
    throw new Error('Invalid operation');
  }

  childEnd() {
    if (this.isValid()) {
      if (arguments.length === 0) {
        if (!this.isLeaf()) {
          const oldLsb = this.lsb();
          return new this.constructor(this.#id + oldLsb + (oldLsb >> 2n));
        }
      } else if (arguments.length === 1) {
        const level = arguments[0];
        if (level >= this.level() && level <= this.constructor.MAX_LEVEL) {
            return new this.constructor(this.#id + this.lsb() + this.constructor.lsbForLevel(level));
        }
      } else {
        throw new Error('no args or _level arg');
      }
    }
    throw new Error('Invalid operation');
  }

  prev() {
    return new this.constructor(this.#id - (this.lsb() << 1n));
  }

  next() {
    return new this.constructor(this.#id + (this.lsb() << 1n));
  }

  *children() {
    let cellId = this.childBegin(...arguments);
    const end = this.childEnd(...arguments);
    while (cellId.#id !== end.#id) {
      yield cellId;
      cellId = cellId.next();
    }
  }

  rangeMin() {
    return new this.constructor(this.#id - (this.lsb() - 1n));
  }

  rangeMax() {
    return new this.constructor(this.#id + (this.lsb() - 1n));
  }

  static begin(level) {
    return this.fromFacePosLevel(0, 0, 0).childBegin(level);
  }

  static end(level) {
    return this.fromFacePosLevel(5, 0, 0).childEnd(level);
  }

  static *walk(level) {
    /*
    Walk along a Hilbert curve at the given _level.

    This function does not exist in the SWIG bindings of the original C++
    library. It provides a more Pythonic way to iterate over cells.
    //TODO look at C++ and Python and figure if there is a more "Javascriptesque" way

  :returns:
      Iterator over instances of :class:`CellId` s.
     */
    let cellIdInt = this.begin(level).#id;
    const endIdInt = this.end(level).#id;

    // Doubling the lsb yields the increment between positions at a certain
    // _level as 64-bit IDs. See CellId docstring for bit encoding.
    const increment = this.begin(level).lsb() << 1n;

    while (cellIdInt !== endIdInt) {
      yield new this(cellIdInt);
      cellIdInt += increment;
    }
  }

  static *walkFast(level) {
    /*
            Walk along a Hilbert curve at the given _level.

            This function does not exist in the SWIG bindings of the original C++
            library. It provides a more Pythonic way to iterate over cells.

            Use with caution: this repeatedly mutates a single instance with a
            changing ``id``. If you save the object, it will change out from
            underneath you.

            :returns:
                Iterator over ids in the same instance of :class:`CellId`.
     */
    const instance = this.begin(level);
    let cellIdInt = instance.#id;
    const endIdInt = this.end(level).#id;

    // Doubling the lsb yields the increment between positions at a certain
    // _level as 64-bit IDs. See CellId docstring for bit encoding.
    const increment = instance.lsb() << 1n;

    while (cellIdInt !== endIdInt) {
      instance.#id = cellIdInt;
      yield instance;
      cellIdInt += increment;
    }
  }

  static none() {
    return new this();
  }

  prevWrap() {
    if (this.isValid()) {
      const p = this.prev();
      if (p.#id < this.constructor.WRAP_OFFSET) {
        return p;
      } else {
        return new this.constructor(p.#id + this.constructor.WRAP_OFFSET);
      }
    }
    throw new Error('Invalid operation');
  }

  nextWrap() {
    if (this.isValid()) {
      const n = this.next();
      if (n.#id < this.constructor.WRAP_OFFSET) {
        return n;
      } else {
        return new this.constructor(n.#id - this.constructor.WRAP_OFFSET);
      }
    }
    throw new Error('Invalid operation');
  }

  advanceWrap(steps) {
    steps = BigInt(steps)
    if (this.isValid()) {
      if (steps === 0n) {
        return this;
      }

      const stepShift = BigInt(2 * (this.constructor.MAX_LEVEL - this.level()) + 1);

      if (steps < 0n) {
        const minSteps = -(this.#id >> stepShift);

        if (steps < minSteps) {
          const stepWrap = this.constructor.WRAP_OFFSET >> stepShift;
          steps %= stepWrap; // % in Javascript should work like C++, different to Python

          if (steps < minSteps) {
            steps += stepWrap;
          }
        }
      } else {
        const maxSteps = (this.constructor.WRAP_OFFSET - this.#id) >> stepShift;

        if (steps > maxSteps) {
          const stepWrap = this.constructor.WRAP_OFFSET >> stepShift;
          steps %= stepWrap

          if (steps > maxSteps) {
            steps -= stepWrap;
          }
        }
      }

      return new this.constructor(this.#id + (steps << stepShift));
    }
    throw new Error('Invalid operation');
  }

  advance(steps) {
    steps = BigInt(steps)
    if (steps === 0n) {
      return this;
    }

    const stepShift = BigInt(2 * (this.constructor.MAX_LEVEL - this.level()) + 1);

    if (steps < 0) {
      const minSteps = -(this.#id >> stepShift);

      if (steps < minSteps) {
        steps = minSteps;
      }
    } else {
      const maxSteps = BigInt(this.constructor.WRAP_OFFSET) + this.lsb() - this.#id >> stepShift;

      if (steps > maxSteps) {
        steps = maxSteps;
      }
    }

    return new this.constructor(this.#id + (steps << stepShift));
  }

  // Return the S2LatLng corresponding to the center of the given cell.
  toLatLng() {
    return S2jsphere.LatLng.fromPoint(this.toPointRaw());
  }

  toPointRaw() {
    const [face, si, ti] = this.getCenterSiTi();
    return S2jsphere.faceUvToXyz(
      face,
      this.constructor.stToUv((0.5 / this.constructor.MAX_SIZE) * si),
      this.constructor.stToUv((0.5 / this.constructor.MAX_SIZE) * ti)
    );
  }

  toPoint() {
    return this.toPointRaw().normalize();
  }

  getCenterSiTi() {
    const [face, i, j, orientation] = this.toFaceIjOrientation();
    let delta;

    if (this.isLeaf()) {
      delta = 1;
    } else if ((BigInt(i) ^ (this.#id >> 2n)) & 1n) {
      delta = 2;
    } else {
      delta = 0;
    }

    return [face, 2 * i + delta, 2 * j + delta];
  }

  getCenterUV() {
    /*
    center of the cell in (u, v) coordinates

  :rtype: pair
    */
    const [face, si, ti] = this.getCenterSiTi();
    const cls = this.constructor;
    return [
      cls.stToUv((0.5 / cls.MAX_SIZE) * si),
      cls.stToUv((0.5 / cls.MAX_SIZE) * ti)
    ];
  }

  toFaceIjOrientation() {
    let s2 = S2jsphere, i = 0n, j = 0n;
    const face = this._face();
    let bits = face & s2.SWAP_MASK_BIG;

    for (let k = 7; k >= 0; k--) {
      let nbits;
      if (k === 7) {
        nbits = this.constructor.MAX_LEVEL - 7 * s2.LOOKUP_BITS;
      } else {
        nbits = s2.LOOKUP_BITS;
      }

      bits += (this.id() >> BigInt(k * 2 * s2.LOOKUP_BITS + 1) & BigInt((1 << (2 * nbits)) - 1)) << 2n;
      bits = s2.LOOKUP_IJ[bits];
      i += (bits >> BigInt(s2.LOOKUP_BITS + 2)) << BigInt(k * s2.LOOKUP_BITS);
      j += ((bits >> 2n) & BigInt((1 << s2.LOOKUP_BITS) - 1)) << BigInt(k * s2.LOOKUP_BITS);
      bits &= (s2.SWAP_MASK_BIG | s2.INVERT_MASK_BIG);
    }

    if (! 0 == s2.POS_TO_ORIENTATION[2] || ! s2.SWAP_MASK == s2.POS_TO_ORIENTATION[0])
      throw new Error()

    if ((this.lsb() & 0x1111111111111110n) !== 0n) {
      bits ^= s2.SWAP_MASK_BIG;
    }

    const orientation = bits;

    return [face, this.bigIntToNumber(i), this.bigIntToNumber(j), this.bigIntToNumber(orientation)];
  }

  getEdgeNeighbors() {
    const level = this.level();
    const size = this.getSizeIj(level);
    const [face, i, j, orientation] = this.toFaceIjOrientation();

    return [
      this.constructor.fromFaceIJSame(face, i, j - size, j - size >= 0).parent(level),
      this.constructor.fromFaceIJSame(face, i + size, j, i + size < this.constructor.MAX_SIZE).parent(level),
      this.constructor.fromFaceIJSame(face, i, j + size, j + size < this.constructor.MAX_SIZE).parent(level),
      this.constructor.fromFaceIJSame(face, i - size, j, i - size >= 0).parent(level)
    ];
  }

  getVertexNeighbors(level) {
    /*
        Return the neighbors of closest vertex to this cell.

        Normally there are four neighbors, but the closest vertex may only have
        three neighbors if it is one of the 8 cube vertices.
     */
    // "_level" must be strictly less than this cell's _level so that we can
    // determine which vertex this cell is closest to.
    if (level >= this.level())
      throw new Error()
    const [face, i, j, orientation] = this.toFaceIjOrientation();

     // Determine the i- and j-offsets to the closest neighboring cell in
     // each direction.  This involves looking at the next bit of "i" and
     // "j" to determine which quadrant of this->parent(_level) this cell
     // lies in.
    const halfsize = this.getSizeIj(level + 1);
    const size = halfsize << 1;
    let ioffset, isame, joffset, jsame;
    const neighbors = [];

    if (i & halfsize) {
      ioffset = size;
      isame = (i + size) < this.constructor.MAX_SIZE;
    } else {
      ioffset = -size;
      isame = (i - size) >= 0;
    }

    if (j & halfsize) {
      joffset = size;
      jsame = (j + size) < this.constructor.MAX_SIZE;
    } else {
      joffset = -size;
      jsame = (j - size) >= 0;
    }

    neighbors.push(this.parent(level));
    neighbors.push(this.constructor.fromFaceIJSame(face, i + ioffset, j, isame).parent(level));
    neighbors.push(this.constructor.fromFaceIJSame(face, i, j + joffset, jsame).parent(level));

    if (isame || jsame) {
      neighbors.push(this.constructor.fromFaceIJSame(face, i + ioffset, j + joffset, isame && jsame).parent(level));
    }

    return neighbors;
  }

  getAllNeighbors(nbrLevel) { // TODO Python has this as generator, yielding results instead of creating neighbors array
    let [face, i, j, orientation] = this.toFaceIjOrientation();

    // Find the coordinates of the lower left-hand leaf cell.  We need to
    // normalize (i,j) to a known position within the cell because nbr_level
    // may be larger than this cell's _level.
    let size = this.getSizeIj();
    i &= -size;
    j &= -size;
    let nbrSize = this.getSizeIj(nbrLevel);
    if (nbrSize > size) throw new Error()
    const neighbors = [];

    // We compute the N-S, E-W, and diagonal neighbors in one pass.
    // The loop test is at the end of the loop to avoid 32-bit overflow.
      let k = -nbrSize;

    while (true) {
      let sameFace;

      if (k < 0) {
        sameFace = (j + k >= 0);
      } else if (k >= size) {
        sameFace = (j + k < this.constructor.MAX_SIZE);
      } else {
        sameFace = false;
        // North and South neighbors.
        neighbors.push(this.constructor.fromFaceIJSame(face, i + k, j - nbrSize, j - size >= 0).parent(nbrLevel));
        neighbors.push(this.constructor.fromFaceIJSame(face, i + k, j + size, j + size < this.constructor.MAX_SIZE).parent(nbrLevel));
      }

      neighbors.push(this.constructor.fromFaceIJSame(face, i - nbrSize, j + k, sameFace && i - size >= 0).parent(nbrLevel));
      neighbors.push(this.constructor.fromFaceIJSame(face, i + size, j + k, sameFace && i + size < this.constructor.MAX_SIZE).parent(nbrLevel));

      if (k >= size) {
        break;
      }

      k += nbrSize;
    }

    return neighbors;
  }

  getSizeIj(level) { // TODO getSizeIj(_level = this._level)
    if (arguments.length === 0) {
      level = this.level();
    }

    return 1 << this.constructor.MAX_LEVEL - level;
  }

  toToken() { // TODO compare with DHS2
    /*
    A unique string token for this cell id.

    This is a hex encoded version of the cell id with the right zeros
    stripped of.
     */
    return this.id().toString(16).padStart(16, '0').replace(/0+$/, '');
  }

  static fromToken(token) {
    /*
    Creates a CellId from a hex encoded cell id string, called a token.

    :param str token:
    A hex representation of the cell id. If the input is shorter than
    16 characters, zeros are appended on the right.
     */
    return new this(BigInt('0x' + token.padEnd(16, '0')));
  }

  static stToUv(s) {
    const cls = this;
    if (cls.PROJECTION === cls.LINEAR_PROJECTION) {
      return 2 * s - 1;
    } else if (cls.PROJECTION === cls.TAN_PROJECTION) {
      s = Math.tan((Math.PI / 2.0) * s - Math.PI / 4.0);
      return s + (1.0 / (1 << 53)) * s; //TODO BigInt
    } else if (cls.PROJECTION === cls.QUADRATIC_PROJECTION) {
      if (s >= 0.5) {
        return (1.0 / 3.0) * (4 * s * s - 1);
      } else {
        return (1.0 / 3.0) * (1 - 4 * (1 - s) * (1 - s));
      }
    } else {
      throw new Error('Unknown projection type');
    }
  }

  static uvToSt(u) {
    const cls = this;
    if (cls.PROJECTION === cls.LINEAR_PROJECTION) {
      return 0.5 * (u + 1);
    } else if (cls.PROJECTION === cls.TAN_PROJECTION) {
      return (2 * (1.0 / Math.PI)) * (Math.atan(u) * Math.PI / 4.0);
    } else if (cls.PROJECTION === cls.QUADRATIC_PROJECTION) {
      if (u >= 0) {
        return 0.5 * Math.sqrt(1 + 3 * u);
      } else {
        return 1 - 0.5 * Math.sqrt(1 - 3 * u);
      }
    } else {
      throw new Error('Unknown projection type');
    }
  }

  static maxEdge() {
    return new S2jsphere.LengthMetric(this.maxAngleSpan().deriv());
  }

  static maxAngleSpan() {
    const cls = this;
    if (cls.PROJECTION === cls.LINEAR_PROJECTION) {
      return new S2jsphere.LengthMetric(2);
    } else if (cls.PROJECTION === cls.TAN_PROJECTION) {
      return new S2jsphere.LengthMetric(Math.PI / 2);
    } else if (cls.PROJECTION === cls.QUADRATIC_PROJECTION) {
      return new S2jsphere.LengthMetric(1.704897179199218452);
    } else {
      throw new Error('Unknown projection type');
    }
  }

  static maxDiag() {
    const cls = this;
    if (cls.PROJECTION === cls.LINEAR_PROJECTION) {
      return new S2jsphere.LengthMetric(2 * Math.sqrt(2));
    } else if (cls.PROJECTION === cls.TAN_PROJECTION) {
      return new S2jsphere.LengthMetric(Math.PI * Math.sqrt(2.0 / 3.0));
    } else if (cls.PROJECTION === cls.QUADRATIC_PROJECTION) {
      return new S2jsphere.LengthMetric(2.438654594434021032);
    } else {
      throw new Error('Unknown projection type');
    }
  }

  static minWidth() {
    const cls = this;
    if (cls.PROJECTION === cls.LINEAR_PROJECTION) {
      return new S2jsphere.LengthMetric(Math.sqrt(2));
    } else if (cls.PROJECTION === cls.TAN_PROJECTION) {
      return new S2jsphere.LengthMetric(Math.PI / 2 * Math.sqrt(2));
    } else if (cls.PROJECTION === cls.QUADRATIC_PROJECTION) {
      return new S2jsphere.LengthMetric(2 * Math.sqrt(2) / 3);
    } else {
      throw new Error('Unknown projection type');
    }
  }
}

S2jsphere.Metric = class {
  /*
  Metric

  The classes :class:`s2sphere.LengthMetric` and
  :class:`s2sphere.AreaMetric` are specializations of this class.

  see :cpp:class:`S2::Metric`
   */
  #deriv;
  #dim;

  constructor(deriv, dim) {
    this.#deriv = deriv
    this.#dim = dim
  }

  deriv() {
    return this.#deriv;
  }

  getValue(level) {
    /*
        The value of this metric at a given _level.

        :returns:
            Depending on whether this is used in one or two dimensions, this is
            an angle in radians or a solid angle in steradians.
     */
    return az.ldexp(this.#deriv, -this.#dim * level);
  }

  get_closest_level(value) {
    /*
            """Closest cell _level according to the given value.

        Return the _level at which the metric has approximately the given
        value.  For example, ``s2sphere.AVG_EDGE.get_closest_level(0.1)``
        returns the _level at which the average cell edge length is
        approximately 0.1. The return value is always a valid _level.

        :param value:
            Depending on whether this is used in one or two dimensions, this is
            an angle in radians or a solid angle in steradians.

     */
    return this.get_min_level(this.#dim === 1 ? Math.sqrt(2) : this.#dim) * value
  }

  get_min_level(value) {
    /*
            """Minimum cell _level for given value.

        Return the minimum _level such that the metric is at most the given
        value, or ``s2sphere.CellId.MAX_LEVEL`` if there is no such _level.
        For example, ``s2sphere.MAX_DIAG.get_min_level(0.1)`` returns the
        minimum _level such that all cell diagonal lengths are 0.1 or smaller.
        The return value is always a valid _level.

        :param value:
            Depending on whether this is used in one or two dimensions, this is
            an angle in radians or a solid angle in steradians.

     */
    if (value <= 0) {
      return CellId.MAX_LEVEL;
    }

    const [m, x] = az.frexp(value / this.deriv);
    const level = Math.max(0, Math.min(CellId.MAX_LEVEL, -((x - 1) >> (this.#dim - 1))));
    if (!(level === CellId.MAX_LEVEL || this.getValue(level) <= value)) {
      throw new Error('Assertion failed: _level === CellId.MAX_LEVEL || this.get_value(_level) <= value');
    }
    if (!(level === 0 || this.getValue(level - 1) > value)) {
      throw new Error('Assertion failed: _level === 0 || this.get_value(deriv, dim, _level - 1) > value');
    }
    return level;
  }

  getMaxLevel(value) {
    /*
            """Minimum cell _level for given value.

        Return the minimum _level such that the metric is at most the given
        value, or ``s2sphere.CellId.MAX_LEVEL`` if there is no such _level.
        For example, ``s2sphere.MAX_DIAG.get_min_level(0.1)`` returns the
        minimum _level such that all cell diagonal lengths are 0.1 or smaller.
        The return value is always a valid _level.

        :param value:
            Depending on whether this is used in one or two dimensions, this is
            an angle in radians or a solid angle in steradians.
     */
    if (value <= 0) {
      return S2jsphere.CellId.MAX_LEVEL;
    }

    const [m, x] = az.frexp(this.#deriv / value);
    const level = Math.max(0, Math.min(S2jsphere.CellId.MAX_LEVEL, (x - 1) >> (this.#dim - 1)));
    if (!(level === 0 || this.getValue(level) >= value)) {
      throw new Error('Assertion failed: _level === 0 || this.get_value(_level) >= value');
    }
    if (!(level === S2jsphere.CellId.MAX_LEVEL || this.getValue(level + 1) < value)) {
      throw new Error('Assertion failed: _level === S2jsphere.CellId.MAX_LEVEL || this.get_value(_level + 1) < value');
    }
    return level;
  }

};

S2jsphere.LengthMetric = class extends S2jsphere.Metric {
  /**
   * Length metric. A 1D specialization of S2jsphere.Metric.
   * @param {number} deriv
   */
  constructor(deriv) {
    super(deriv, 1)
  }

};

S2jsphere.AVG_ANGLE_SPAN = new S2jsphere.LengthMetric(Math.PI / 2) // true for all projections
S2jsphere.MIN_ANGLE_SPAN = new S2jsphere.LengthMetric(4 / 3) // quadratic projection
S2jsphere.MAX_ANGLE_SPAN = new S2jsphere.LengthMetric(1.704897179199218452) // quadratic projection
S2jsphere.AVG_EDGE = new S2jsphere.LengthMetric(1.459213746386106062) // quadratic projection
S2jsphere.MIN_EDGE = new S2jsphere.LengthMetric(2 * Math.sqrt(2) / 3) // quadratic projection
S2jsphere.MAX_EDGE = new S2jsphere.LengthMetric(S2jsphere.MAX_ANGLE_SPAN.deriv()) // true for all projections
S2jsphere.AVG_DIAG = new S2jsphere.LengthMetric(2.060422738998471683) // quadratic projection
S2jsphere.MIN_DIAG = new S2jsphere.LengthMetric(8 * Math.sqrt(2) / 9) // quadratic projection
S2jsphere.MAX_DIAG = new S2jsphere.LengthMetric(2.438654594434021032) // quadratic projection
S2jsphere.AVG_WIDTH = new S2jsphere.LengthMetric(1.434523672886099389) // quadratic projection
S2jsphere.MIN_WIDTH = new S2jsphere.LengthMetric(2 * Math.sqrt(2) / 3) // quadratic projection
S2jsphere.MAX_WIDTH = new S2jsphere.LengthMetric(S2jsphere.MAX_ANGLE_SPAN.deriv()) // true for all projections

S2jsphere.AreaMetric = class extends S2jsphere.Metric {
  /**
   * Area metric. A 2D specialization of Metric.
   * @param {number} deriv
   */
  constructor(deriv) {
    super(deriv, 2)
  }
};

// Preconfigured instances of AreaMetric
S2jsphere.AVG_AREA = new S2jsphere.AreaMetric(4 * Math.PI / 6); // Average cell area for all projections
S2jsphere.MIN_AREA = new S2jsphere.AreaMetric(8 * Math.sqrt(2) / 9); // Minimum cell area for quadratic projections
S2jsphere.MAX_AREA = new S2jsphere.AreaMetric(2.635799256963161491); // Maximum cell area for quadratic projections

S2jsphere.drem = function(x, y) {
  let n = Math.round(x / y)
  if (Math.abs(x / y - n) == 0.5) {
    if (n % 2 === 1) {
      n -= 1
    }
  }
  return x - n * y
}
S2jsphere.remainderNear = function(dividend, divisor) {
  const result = dividend / divisor;
  const roundedResult = Math.round(result);
  return dividend - roundedResult * divisor;
}
S2jsphere.validFaceXyzToUv = function(face, p) {
  if (p.dotProd(S2jsphere.faceUvToXyz(face, 0, 0)) <= 0) {
    throw new Error("Invalid input: dot product should be greater than 0");
  }
  if (face === 0n) {
    return [p.get(1) / p.get(0), p.get(2) / p.get(0)];
  } else if (face === 1n) {
    return [-p.get(0) / p.get(1), p.get(2) / p.get(1)];
  } else if (face === 2n) {
    return [-p.get(0) / p.get(2), -p.get(1) / p.get(2)];
  } else if (face === 3n) {
    return [p.get(2) / p.get(0), p.get(1) / p.get(0)];
  } else if (face === 4n) {
    return [p.get(2) / p.get(1), -p.get(0) / p.get(1)];
  } else {
    return [-p.get(1) / p.get(2), -p.get(0) / p.get(2)];
  }
}
S2jsphere.xyzToFaceUv = function(p) {
  let face = BigInt(p.largestAbsComponent());
  if (p.get(face) < 0) {
    face += 3n;
  }
  const [u, v] = S2jsphere.validFaceXyzToUv(face, p);
  return [face, u, v];
}
S2jsphere.faceXyzToUv = function(face, p) {
  /*
      """(_face, XYZ) to UV

    see :cpp:func:`S2::FaceXYZtoUV`

   */
  if (face < 3) {
    if (p.get(face) <= 0) {
      return [false, 0, 0];
    }
  } else {
    if (p.get(face - 3n) >= 0) {
      return [false, 0, 0];
    }
  }
  const [u, v] = S2jsphere.validFaceXyzToUv(face, p);
  return [true, u, v];
}
S2jsphere.faceUvToXyz = function(face, u, v) {
  /*
      """(_face, u, v) to xyz

    see :cpp:func:`S2::FaceUVtoXYZ`

   */
  if (face === 0n) {
    return new S2jsphere.Point(1, u, v);
  } else if (face === 1n) {
    return new S2jsphere.Point(-u, 1, v);
  } else if (face === 2n) {
    return new S2jsphere.Point(-u, -v, 1);
  } else if (face === 3n) {
    return new S2jsphere.Point(-1, -v, -u);
  } else if (face === 4n) {
    return new S2jsphere.Point(v, -1, -u);
  } else {
    return new S2jsphere.Point(v, u, -1);
  }
}
S2jsphere.getNorm = function(face) {
  return S2jsphere.faceUvToXyz(face, 0, 0);
}
S2jsphere.getUNorm = function(face, u) {
  /*
      """Vector normal to the positive v-axis and the plane through the origin.

    The vector is normal to the positive v-axis and a plane that contains the
    origin and the v-axis.

    The right-handed normal (not necessarily unit length) for an
    edge in the direction of the positive v-axis at the given u-value on
    the given _face.  (This vector is perpendicular to the plane through
    the sphere origin that contains the given edge.)

    :rtype: Point

    see :cpp:func:`S2::GetUNorm`
   */
  if (face === 0n) {
    return new S2jsphere.Point(u, -1, 0);
  } else if (face === 1n) {
    return new S2jsphere.Point(1, u, 0);
  } else if (face === 2n) {
    return new S2jsphere.Point(1, 0, u);
  } else if (face === 3n) {
    return new S2jsphere.Point(-u, 0, 1);
  } else if (face === 4n) {
    return new S2jsphere.Point(0, -u, 1);
  } else {
    return new S2jsphere.Point(0, -1, -u);
  }
}
S2jsphere.getVNorm = function(face, v) {
  /*
      """Vector normal to the positive u-axis and the plane through the origin.

    The vector is normal to the positive u-axis and a plane that contains the
    origin and the u-axis.

    Return the right-handed normal (not necessarily unit length) for an
    edge in the direction of the positive u-axis at the given v-value on
    the given _face.

    see :cpp:func:`S2::GetVNorm`
   */
  if (face === 0n) {
    return new S2jsphere.Point(-v, 0, 1);
  } else if (face === 1n) {
    return new S2jsphere.Point(0, -v, 1);
  } else if (face === 2n) {
    return new S2jsphere.Point(0, -1, -v);
  } else if (face === 3n) {
    return new S2jsphere.Point(v, -1, 0);
  } else if (face === 4n) {
    return new S2jsphere.Point(1, v, 0);
  } else {
    return new S2jsphere.Point(1, 0, v);
  }
}
S2jsphere.getUAxis = function(face) {
  if (face === 0n) {
    return new S2jsphere.Point(0, 1, 0);
  } else if (face === 1n) {
    return new S2jsphere.Point(-1, 0, 0);
  } else if (face === 2n) {
    return new S2jsphere.Point(-1, 0, 0);
  } else if (face === 3n) {
    return new S2jsphere.Point(0, 0, -1);
  } else if (face === 4n) {
    return new S2jsphere.Point(0, 0, -1);
  } else {
    return new S2jsphere.Point(0, 1, 0);
  }
}
S2jsphere.getVAxis = function(face) {
  if (face === 0n) {
    return new S2jsphere.Point(0, 0, 1);
  } else if (face === 1n) {
    return new S2jsphere.Point(0, 0, 1);
  } else if (face === 2n) {
    return new S2jsphere.Point(0, -1, 0);
  } else if (face === 3n) {
    return new S2jsphere.Point(0, -1, 0);
  } else if (face === 4n) {
    return new S2jsphere.Point(1, 0, 0);
  } else {
    return new S2jsphere.Point(1, 0, 0);
  }
}
S2jsphere.isUnitLength = function(p) {
  return Math.abs(p.norm() * p.norm() - 1) <= 1e-15;
}
S2jsphere.ortho = function(a) {
  let k = a.largestAbsComponent() - 1;
  if (k < 0) {
    k = 2;
  }
  let temp;
  if (k === 0) {
    temp = new Point(1, 0.0053, 0.00457);
  } else if (k === 1) {
    temp = new Point(0.012, 1, 0.00457);
  } else {
    temp = new Point(0.012, 0.0053, 1);
  }
  return a.crossProd(temp).normalize();
}
S2jsphere.origin = function () {
  // A unique and empirically chosen reference point.
  return new S2jsphere.Point(0.00457, 1, 0.0321).normalize();
}
S2jsphere.robustCrossProd = function(a, b) {
  /*
      """A numerically more robust cross product.

  The direction of :math:`a \\times b` becomes unstable as :math:`(a + b)` or
  :math:`(a - b)` approaches zero.  This leads to situations where
  :math:`a \\times b` is not very orthogonal to :math:`a` and/or :math:`b`.
  We could fix this using Gram-Schmidt, but we also want
  :math:`b \\times a = - a \\times b`.

  The easiest fix is to just compute the cross product of :math:`(b+a)` and
  :math:`(b-a)`. Mathematically, this cross product is exactly twice the
  cross product of :math:`a` and :math:`b`, but it has the numerical
  advantage that :math:`(b+a)` and :math:`(b-a)` are always perpendicular
  (since :math:`a` and :math:`b` are unit length).  This
  yields a result that is nearly orthogonal to both :math:`a` and :math:`b`
  even if these two values differ only in the lowest bit of one component.

  see :cpp:func:`S2::RobustCrossProd`

   */
  // A numerically more robust cross product.
  // The direction of a x b becomes unstable as (a + b) or (a - b) approaches zero.
  // This function computes the cross product of (b+a) and (b-a) to improve numerical stability.
  if (!S2jsphere.isUnitLength(a) || !S2jsphere.isUnitLength(b)) {
    throw new Error("Input vectors must be unit length");
  }

  const x = b.add(a).crossProd(b.subtract(a));
  if (!x.equals(new S2jsphere.Point(0, 0, 0))) {
    return x;
  }

  return this.ortho(a);
}
S2jsphere.simple_crossing = function(a, b, c, d) {
  const ab = a.crossProd(b);
  const acb = -(ab.dotProd(c));
  const bda = ab.dotProd(d);
  if (acb * bda <= 0) {
    return false;
  }

  const cd = c.crossProd(d);
  const cbd = -(cd.dotProd(b));
  const dac = cd.dotProd(a);
  return acb * cbd > 0 && acb * dac > 0;
}
S2jsphere.girardArea = function(a, b, c) {
  const ab = S2jsphere.robustCrossProd(a, b);
  const bc = S2jsphere.robustCrossProd(b, c);
  const ac = S2jsphere.robustCrossProd(a, c);
  const area = ab.angle(ac) - ab.angle(bc) + bc.angle(ac)
  return Math.max(0.0, area);
}
S2jsphere.area = function(a, b, c) {
  if (!S2jsphere.isUnitLength(a) || !S2jsphere.isUnitLength(b) || !S2jsphere.isUnitLength(c)) {
    throw new Error("Input vectors must be unit length");
  }

  const sa = b.angle(c);
  const sb = c.angle(a);
  const sc = a.angle(b);
  const s = 0.5 * (sa + sb + sc);

  if (s >= 3e-4) {
    const s2 = s * s;
    const dmin = s - Math.max(sa, Math.max(sb, sc));

    if (dmin < 1e-2 * s * s2 * s2) {
      const area = S2jsphere.girardArea(a, b, c);
      if (dmin < 2 * (0.1 * area)) {
        return area;
      }
    }
  }

  return 4 * Math.atan(Math.sqrt(Math.max(
    0.0,
    Math.tan(0.5 * s) * Math.tan(0.5 * (s - sa)) * Math.tan(0.5 * (s - sb)) * Math.tan(0.5 * (s - sc)))))
}
S2jsphere.simpleCCW = function(a, b, c) {
  /*
      """Simple Counterclockwise test.

  Return true if the points A, B, C are strictly counterclockwise.  Return
  false if the points are clockwise or collinear (i.e. if they are all
  contained on some great circle).

  Due to numerical errors, situations may arise that are mathematically
  impossible, e.g. ABC may be considered strictly CCW while BCA is not.
  However, the implementation guarantees the following:

    If simple_ccw(a,b,c), then !simple_ccw(c,b,a) for all a,b,c.

  see :cpp:func:`S2::SimpleCCW`

   */
  const result = c.crossProd(a).dotProd(b) > 0;
  return result;
}

S2jsphere.Interval = class {
  constructor(lo, hi) {
    this.bounds = [lo, hi];
  }

  toString() {
    return `${this.constructor.name}: (${this.bounds[0]}, ${this.bounds[1]})`
  }

  get lo() {
    return this.bounds[0];
  }

  get hi() {
    return this.bounds[1];
  }

  bound(i) {
    return this.bounds[i];
  }

  bounds() {
    return this.bounds;
  }

  static empty() {
    return new this();
  }
}

S2jsphere.LineInterval = class extends S2jsphere.Interval {
  /*
      """Line Interval in R1

    see :cpp:class:`R1Interval`
   */
  constructor(lo = 1, hi = 0) {
    super(lo, hi);
  }

  equals(other) {
    return (
      other instanceof this.constructor &&
      ((this.lo === other.lo && this.hi === other.hi) ||
        (this.isEmpty() && other.isEmpty()))
    );
  }

  notEquals(other) {
    return !this.equals(other);
  }

  static fromPointPair(a, b) {
    if (a <= b) {
      return new this(a, b);
    } else {
      return new this(b, a);
    }
  }

  contains(other) {
    if (other instanceof this.constructor) {
      if (other.isEmpty()) {
        return true;
      }
      return other.lo >= this.lo && other.hi <= this.hi;
    } else {
      return other >= this.lo && other <= this.hi;
    }
  }

  interiorContains(other) {
    if (other instanceof this.constructor) {
      if (other.isEmpty()) {
        return true;
      }
      return other.lo > this.lo && other.hi < this.hi;
    } else {
      return other > this.lo && other < this.hi;
    }
  }

  intersects(other) {
    if (this.lo <= other.lo) {
      return other.lo <= this.hi && other.lo <= other.hi;
    } else {
      return this.lo <= other.hi && this.lo <= this.hi;
    }
  }

  interiorIntersects(other) {
    return (
      other.lo < this.hi &&
      this.lo < other.hi &&
      this.lo < this.hi &&
      other.lo <= other.hi
    );
  }

  union(other) {
    if (this.isEmpty()) {
      return other;
    }
    if (other.isEmpty()) {
      return this;
    }
    return new this.constructor(
      Math.min(this.lo, other.lo),
      Math.max(this.hi, other.hi)
    );
  }

  intersection(other) {
    return new this.constructor(
      Math.max(this.lo, other.lo),
      Math.min(this.hi, other.hi)
    );
  }

  expanded(radius) {
    if (radius < 0)
      throw new Error()
    if (this.isEmpty()) {
      return this;
    }
    return new this.constructor(this.lo - radius, this.hi + radius);
  }

  getCenter() {
    return 0.5 * (this.lo + this.hi);
  }

  getLength() {
    return this.hi - this.lo;
  }

  isEmpty() {
    return this.lo > this.hi;
  }

  approxEquals(other, maxError = 1e-15) {
    if (this.isEmpty()) {
      return other.getLength() <= maxError;
    }
    if (other.isEmpty()) {
      return this.getLength() <= maxError;
    }
    return (
      Math.abs(other.lo - this.lo) +
      Math.abs(other.hi - this.hi) <=
      maxError
    );
  }
}

S2jsphere.SphereInterval = class extends S2jsphere.Interval {
  constructor(lo = Math.PI, hi = -Math.PI, args_checked = false) {
    if (args_checked) {
      super(lo, hi);
    } else {
      let clamped_lo = lo;
      let clamped_hi = hi;

      if (lo === -Math.PI && hi !== Math.PI) {
        clamped_lo = Math.PI;
      }
      if (hi === -Math.PI && lo !== Math.PI) {
        clamped_hi = Math.PI;
      }

      super(clamped_lo, clamped_hi);

    }
    if (!this.isValid()) {
      throw new Error()
    }
  }

  equals(other) {
    return (
      other instanceof this.constructor &&
      this.lo === other.lo &&
      this.hi === other.hi
    );
  }

  notEquals(other) {
    return !this.equals(other);
  }

  static fromPointPair(a, b) {
    if (Math.abs(a) > Math.PI || Math.abs(b) > Math.PI)
      throw new Error()

    if (a === -Math.PI) {
      a = Math.PI;
    }
    if (b === -Math.PI) {
      b = Math.PI;
    }

    if (this.positive_distance(a, b) <= Math.PI) {
      return new this(a, b, true);
    } else {
      return new this(b, a, true);
    }
  }

  static positive_distance(a, b) {
    const d = b - a;

    if (d >= 0) {
      return d;
    } else {
      return b + Math.PI - (a - Math.PI);
    }
  }

  static full() {
    return new this(-Math.PI, Math.PI, true);
  }

  isFull() {
    return this.hi - this.lo === 2 * Math.PI;
  }

  isValid() {
    return (
      Math.abs(this.lo) <= Math.PI &&
      Math.abs(this.hi) <= Math.PI &&
      !(this.lo === -Math.PI && this.hi !== Math.PI) &&
      !(this.hi === -Math.PI && this.lo !== Math.PI)
    );
  }

  is_inverted() {
    return this.lo > this.hi;
  }

  isEmpty() {
    return this.lo - this.hi === 2 * Math.PI;
  }

  getCenter() {
    let center = 0.5 * (this.lo + this.hi);

    if (!this.is_inverted()) {
      return center;
    }

    if (center <= 0) {
      return center + Math.PI;
    } else {
      return center - Math.PI;
    }
  }

  getLength() {
    let length = this.hi - this.lo;

    if (length >= 0) {
      return length;
    }

    length += 2 * Math.PI;

    if (length > 0) {
      return length;
    } else {
      return -1;
    }
  }

  complement() {
    /*
            """Return the complement of the interior of the interval.

        An interval and its complement have the same boundary but do not share
        any interior values. The complement operator is not a bijection, since
        the complement of a singleton interval (containing a single value) is
        the same as the complement of an empty interval.

     */
    if (this.lo === this.hi) {
      return this.constructor.full();
    }
    return new this.constructor(this.hi, this.lo);
  }

  approxEquals(other, max_error = 1e-15) {
    if (this.isEmpty()) {
      return other.getLength() <= max_error;
    }
    if (other.isEmpty()) {
      return this.getLength() <= max_error;
    }
    return (
      Math.abs(S2jsphere.drem(other.lo - this.lo, 2 * Math.PI)) +
      Math.abs(S2jsphere.drem(other.hi - this.hi, 2 * Math.PI)) <=
      max_error
    );
  }

  fast_contains(other) {
    if (this.is_inverted()) {
      return (
        (other >= this.lo || other <= this.hi) &&
        !this.isEmpty()
      );
    } else {
      return other >= this.lo && other <= this.hi;
    }
  }

  contains(other) {
    if (other instanceof this.constructor) {
      if (this.is_inverted()) {
        if (other.is_inverted()) {
          return (
            other.lo >= this.lo && other.hi <= this.hi
          );
        }
        return (
          (other.lo >= this.lo || other.hi <= this.hi) &&
          !this.isEmpty()
        );
      } else {
        if (other.is_inverted()) {
          return this.isFull() || other.isEmpty();
        }
        return (
          other.lo >= this.lo && other.hi <= this.hi
        );
      }
    } else {
      if (Math.abs(other) > Math.PI)
        throw new Error()

      if (other === -Math.PI) {
        other = Math.PI;
      }
      return this.fast_contains(other)
    }
  }

  interiorContains(other) {
    if (other instanceof this.constructor) {
      if (this.is_inverted()) {
        if (!other.is_inverted()) {
          return (other.lo > this.lo || other.hi < this.hi);
        }
        return ((other.lo > this.lo && other.hi < this.hi) || other.isEmpty());
      } else {
        if (other.is_inverted()) {
          return this.isFull() || other.isEmpty();
        }
        return ((other.lo > this.lo && other.hi < this.hi) || this.isFull());
      }
    } else {
      if (Math.abs(other) > Math.PI)
        throw new Error()

      if (other === -Math.PI) {
        other = Math.PI;
      }

      if (this.is_inverted()) {
        return other > this.lo || other < this.hi;
      } else {
        return (
          (other > this.lo && other < this.hi) ||
          this.isFull()
        );
      }
    }
  }

  intersects(other) {
    if (this.isEmpty() || other.isEmpty()) {
      return false;
    }

    if (this.is_inverted()) {
      return (
        other.is_inverted() ||
        other.lo <= this.hi ||
        other.hi >= this.lo
      );
    } else {
      if (other.is_inverted()) {
        return (
          other.lo <= this.hi ||
          other.hi >= this.lo
        );
      }
      return (
        other.lo <= this.hi &&
        other.hi >= this.lo
      );
    }
  }

  interiorIntersects(other) {
    if (
      this.isEmpty() ||
      other.isEmpty() ||
      this.lo === this.hi
    ) {
      return false;
    }

    if (this.is_inverted()) {
      return (
        other.is_inverted() ||
        other.lo < this.hi ||
        other.hi > this.lo
      );
    } else {
      if (other.is_inverted()) {
        return (
          other.lo < this.hi ||
          other.hi > this.lo
        );
      }
      return (other.lo < this.hi && other.hi > this.lo) || this.isFull();
    }
  }

  union(other) {
    if (other.isEmpty()) {
      return this;
    }

    if (this.fast_contains(other.lo)) {
      if (this.fast_contains(other.hi)) {
        if (this.contains(other))
          return this;
        return this.constructor.full();
      }
      return new this.constructor(this.lo, other.hi, true);
    }

    if (this.fast_contains(other.hi)) {
      return new this.constructor(other.lo, this.hi, true);
    }

    if (this.isEmpty() || other.fast_contains(this.lo)) {
      return other;
    }

    const dlo = this.constructor.positive_distance(other.hi, this.lo);
    const dhi = this.constructor.positive_distance(this.hi, other.lo);

    if (dlo < dhi) {
      return new this.constructor(other.lo, this.hi, true);
    } else {
      return new this.constructor(this.lo, other.hi, true);
    }
  }

  intersection(other) {
    if (other.isEmpty()) {
      return this.constructor.empty();
    }

    if (this.fast_contains(other.lo)) {
      if (this.fast_contains(other.hi)) {
        if (other.getLength() < this.getLength()) {
          return other;
        }
        return this;
      }
      return new this.constructor(other.lo, this.hi, true);
    }

    if (this.fast_contains(other.hi)) {
      return new this.constructor(this.lo, other.hi, true);
    }

    if (other.fast_contains(this.lo)) {
      return this;
    }

    if (this.intersects(other)) throw new Error()
    return this.constructor.empty();
  }

  expanded(radius) {
    if (radius < 0) throw new Error()

    if (this.isEmpty()) {
      return this;
    }

    if (this.getLength() + 2 * radius >= 2 * Math.PI - 1e-15) {
      return this.constructor.full();
    }

    let lo = S2jsphere.drem(this.lo - radius, 2 * Math.PI);
    let hi = S2jsphere.drem(this.hi + radius, 2 * Math.PI);

    if (lo <= -Math.PI) {
      lo = Math.PI;
    }

    return new this.constructor(lo, hi);
  }

  get_complement_center() {
    if (this.lo !== this.hi) {
      return this.complement().getCenter();
    } else {
      if (this.hi <= 0) {
        return this.hi + Math.PI;
      } else {
        return this.hi - Math.PI;
      }
    }
  }

  getDirectedHausdorffDistance(other) {
    if (other.contains(this)) {
      return 0.0;
    }

    if (other.isEmpty()) {
      return Math.PI;
    }

    let other_complement_center = other.get_complement_center();

    if (this.contains(other_complement_center)) {
      return this.constructor.positive_distance(other.hi, other_complement_center);
    } else {
      let hi_hi, lo_lo

      if (new this.constructor(other.hi, other_complement_center).contains(this.hi)) {
        hi_hi = this.constructor.positive_distance(other.hi, this.hi);
      } else {
        hi_hi = 0;
      }

      if (new this.constructor(other_complement_center, other.lo).contains(this.lo)) {
        lo_lo = this.constructor.positive_distance(this.lo, other.lo);
      } else {
        lo_lo = 0;
      }

      if (hi_hi <= 0 && lo_lo <= 0) throw new Error()
      return Math.max(hi_hi, lo_lo);
    }
  }
}

S2jsphere.Cell = class {
  /*
      """Cell

    see :cpp:class:`S2Cell`

   */
  constructor(cellId = null) {
    this.uv = [[null, null], [null, null]];
    if (cellId !== null) {
      this.cell_id = cellId;
      const [face, i, j, orientation] = cellId.toFaceIjOrientation();
      const ij = [i, j];
      this._face = face;
      this._orientation = orientation;
      this._level = cellId.level();

      const cell_size = cellId.getSizeIj();
      ij.forEach((ij_, idx) => {
        const ij_lo = ij_ & -cell_size;
        const ij_hi = ij_lo + cell_size;
        this.uv[idx][0] = S2jsphere.CellId.stToUv((1.0 / S2jsphere.CellId.MAX_SIZE) * ij_lo);
        this.uv[idx][1] = S2jsphere.CellId.stToUv((1.0 / S2jsphere.CellId.MAX_SIZE) * ij_hi);
      });
    }
  }

  static fromLatLng(ll) {
    return new this(S2jsphere.CellId.fromLatLng(ll));
  }

  static fromPoint(point) {
    return new this(S2jsphere.CellId.fromPoint(point));
  }

  toString() {
    return `${this.constructor.name}: face ${this._face}, level ${this._level}, orientation ${this._orientation}, id ${this.cell_id.id()}`;
  }

  static fromFacePosLevel(face, pos, level) {
    return new S2jsphere.Cell(S2jsphere.CellId.fromFacePosLevel(face, pos, level));
  }

  id() {
    return this.cell_id;
  }

  face() {
    return this._face;
  }

  level() {
    return this._level;
  }

  orientation() {
    return this._orientation;
  }

  isLeaf() {
    return this._level === S2jsphere.CellId.MAX_LEVEL;
  }

  getEdge(k) {
    /*
            """the k-th edge

        Return the inward-facing normal of the great circle passing through
        the edge from vertex k to vertex k+1 (mod 4).  The normals returned
        by GetEdgeRaw are not necessarily unit length.
     */
    return this.getEdgeRaw(k).normalize();
  }

  getEdgeRaw(k) {
    if (k === 0) {
      return S2jsphere.getVNorm(this._face, this.uv[1][0]);  // South
    } else if (k === 1) {
      return S2jsphere.getUNorm(this._face, this.uv[0][1]);  // East
    } else if (k === 2) {
      return S2jsphere.getVNorm(this._face, this.uv[1][1]).neg()  // North
    } else {
      return S2jsphere.getUNorm(this._face, this.uv[0][0]).neg();  // West
    }
  }

  getVertex(k) {
    /*
            """Return the k-th vertex of the cell (k = 0,1,2,3).

        Vertices are returned in CCW order.
        The points returned by GetVertexRaw are not necessarily unit length.
     */
    return this.getVertexRaw(k).normalize();
  }

  getVertexRaw(k) {
    return S2jsphere.faceUvToXyz(
      this._face,
      this.uv[0][(k >> 1) ^ (k & 1)],
      this.uv[1][k >> 1]
    );
  }

  exactArea() {
    /*
            """cell area in steradians accurate to 6 digits but slow to compute

        Return the area of this cell as accurately as possible.  This method is
        more expensive but it is accurate to 6 digits of precision even for
        leaf cells (whose area is approximately 1e-18).
     */
    const v0 = this.getVertex(0);
    const v1 = this.getVertex(1);
    const v2 = this.getVertex(2);
    const v3 = this.getVertex(3);
    return S2jsphere.area(v0, v1, v2) + S2jsphere.area(v0, v2, v3);
  }

  averageArea() {
    // cell area in steradians
    return S2jsphere.AVG_AREA.getValue(this._level);
  }

  approxArea() {
    /*
            """approximate cell area in steradians accurate to within 3%

        For cells at level 5 or higher (cells with edge length 350km or
        smaller), it is accurate to within 0.1%.
     */
    if (this._level < 2) {
      return this.averageArea();
    }

    const flatArea = (0.5 * (this.getVertex(2).subtract(this.getVertex(0)))
      .crossProd(this.getVertex(3).subtract(this.getVertex(1)))
      .norm());

    return (flatArea * 2 /
      (1 + Math.sqrt(1 - Math.min((1.0 / Math.PI) * flatArea, 1.0))));
  }

  *subdivide() {
    const uv_mid = this.cell_id.getCenterUV();
    for (let pos = 0; pos < 4; pos++) {
      const child = new S2jsphere.Cell();
      child._face = this._face;
      child._level = this._level + 1;
      child._orientation = this._orientation ^ S2jsphere.POS_TO_ORIENTATION[pos];
      const children = [...this.cell_id.children()]
      child.cell_id = children[pos];

      /*
                  # We want to split the cell in half in "u" and "v".  To decide
            # which side to set equal to the midpoint value, we look at
            # cell's (i,j) position within its parent.  The index for "i"
            # is in bit 1 of ij.
       */
      const ij = S2jsphere.POS_TO_IJ[this._orientation][pos];
      const i = ij >> 1;
      const j = ij & 1;
      child.uv[0][i] = this.uv[0][i];
      child.uv[0][1 - i] = uv_mid[0];
      child.uv[1][j] = this.uv[1][j];
      child.uv[1][1 - j] = uv_mid[1];
      yield child;
    }
  }

  getCenter() {
    return this.getCenterRaw().normalize();
  }

  getCenterRaw() {
    return this.cell_id.toPointRaw();
  }

  contains(other) {
    if (other instanceof this.constructor) {
      return this.cell_id.contains(other.cell_id);
    } else if (other instanceof S2jsphere.Point) {
      const [valid, u, v] = S2jsphere.faceXyzToUv(this._face, other);
      if (!valid) {
        return false;
      }
      return (u >= this.uv[0][0] && u <= this.uv[0][1] &&
        v >= this.uv[1][0] && v <= this.uv[1][1]);
    }
  }

  mayIntersect(cell) {
    return this.cell_id.intersects(cell.cell_id);
  }

  getLatitude(i, j) {
    const p = S2jsphere.faceUvToXyz(this._face, this.uv[0][i], this.uv[1][j]);
    return S2jsphere.LatLng.latitude(p).radians;
  }

  getLongitude(i, j) {
    const p = S2jsphere.faceUvToXyz(this._face, this.uv[0][i], this.uv[1][j]);
    return S2jsphere.LatLng.longitude(p).radians;
  }

  getCapBound() {
    const u = 0.5 * (this.uv[0][0] + this.uv[0][1]);
    const v = 0.5 * (this.uv[1][0] + this.uv[1][1]);
    const cap = S2jsphere.Cap.fromAxisHeight(S2jsphere.faceUvToXyz(this._face, u, v).normalize(), 0);
    for (let k = 0; k < 4; k++) {
      cap.addPoint(this.getVertex(k));
    }
    return cap;
  }

  getRectBound() {
    if (this._level > 0) {
      const u = this.uv[0][0] + this.uv[0][1];
      const v = this.uv[1][0] + this.uv[1][1];
      const i = S2jsphere.getUAxis(this._face).get(2) === 0 ? (u < 0) | 0 : (u > 0) | 0; //"| 0" to cast to int
      const j = S2jsphere.getVAxis(this._face).get(2) === 0 ? (v < 0) | 0 : (v > 0) | 0;
      const max_error = (1.0 / (1 << 25)) / (1 << 26);  // originally 1.0 / (1 << 51) but Javascript and 32bit bitshift arithmetic
      let lat = S2jsphere.LineInterval.fromPointPair(this.getLatitude(i, j),
        this.getLatitude(1 - i, 1 - j));
      lat = lat.expanded(max_error).intersection(S2jsphere.LatLngRect.full_lat());

      if (lat.lo === -Math.PI / 2.0 || lat.hi === Math.PI / 2.0) {
        return new S2jsphere.LatLngRect(lat, S2jsphere.SphereInterval.full());
      }

      const lng = S2jsphere.SphereInterval.fromPointPair(this.getLongitude(i, 1 - j),
        this.getLongitude(1 - i, j));
      return new S2jsphere.LatLngRect(lat, lng.expanded(max_error));
    }

    const pole_min_lat = Math.asin(Math.sqrt(1.0 / 3.0));
    if (this._face === 0n) {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(-Math.PI / 4.0, Math.PI / 4.0),
        new S2jsphere.SphereInterval(-Math.PI / 4.0, Math.PI / 4.0)
      );
    } else if (this._face === 1n) {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(-Math.PI / 4.0, Math.PI / 4.0),
        new S2jsphere.SphereInterval(Math.PI / 4.0, 3.0 * Math.PI / 4.0)
      );
    } else if (this._face === 2n) {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(pole_min_lat, Math.PI / 2.0),
        new S2jsphere.SphereInterval(-Math.PI, Math.PI)
      );
    } else if (this._face === 3n) {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(-Math.PI / 4.0, Math.PI / 4.0),
        new S2jsphere.SphereInterval(3.0 * Math.PI / 4.0, -3.0 * Math.PI / 4.0)
      );
    } else if (this._face === 4n) {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(-Math.PI / 4.0, Math.PI / 4.0),
        new S2jsphere.SphereInterval(-3.0 * Math.PI / 4.0, -Math.PI / 4.0)
      );
    } else {
      return new S2jsphere.LatLngRect(
        new S2jsphere.LineInterval(-Math.PI / 2.0, -pole_min_lat),
        new S2jsphere.SphereInterval(-Math.PI, Math.PI)
      );
    }
  }
}

S2jsphere.CellUnion = class {

  #cellIds
  constructor(cellIds, raw = true) {
    /*
        """Cell Union

    see :cpp:class:`S2CellUnion`
    """

     */

    if (cellIds === undefined) {
      this.#cellIds = [];
    } else {
      this.#cellIds = cellIds.map((cellId) =>
        cellId instanceof S2jsphere.CellId ? cellId : new S2jsphere.CellId(cellId)
      );
      if (raw) {
        this.normalize();
      }
    }
  }

  equals(other) {
    return other instanceof this.constructor && this.#cellIds === other.#cellIds
  }

  ne(other) {
    return ! this.equals(other)
  }

  toString() {
    return `${this.constructor.name}: ${this.#cellIds}`;
  }

  static getUnion(x, y) {
    return new S2jsphere.CellUnion([...x.#cellIds, ...y.#cellIds]);
  }

  static getIntersection() {
    if (arguments.length === 2 && arguments[0] instanceof S2jsphere.CellUnion && arguments[1] instanceof S2jsphere.CellId) {
      const [cellUnion, cellId] = arguments;
      if (cellUnion.contains(cellId)) {
        return new S2jsphere.CellUnion([cellId]);
      } else {
        let index = az.bisect.bisectLeft(cellUnion.#cellIds, cellId.rangeMin());
        const idmax = cellId.rangeMax();
        const intersectedCellIds = [];

        while (
          index !== cellUnion.#cellIds.length &&
          cellUnion.#cellIds[index] <= idmax
          ) {
          intersectedCellIds.push(cellUnion.#cellIds[index]);
          index++;
        }
        return new S2jsphere.CellUnion(intersectedCellIds);
      }
    } else if (arguments.length === 2 &&
      arguments[0] instanceof S2jsphere.CellUnion && arguments[1] instanceof S2jsphere.CellUnion) {
      const [x, y] = arguments;
      let i = 0, j = 0;
      const cellIds = [];

      while (i < x.numCells() && j < y.numCells()) {
        const imin = x.#cellIds[i].rangeMin();
        const jmin = y.#cellIds[j].rangeMin();

        if (imin > jmin) {
          if (x.#cellIds[i] <= y.#cellIds[j].rangeMax()) {
            cellIds.push(x.#cellIds[i]);
            i++;
          } else {
            j = az.bisect.bisectLeft(y.#cellIds, imin, {lo:j + 1});
            if (x.#cellIds[i] <= y.#cellIds[j - 1].rangeMax()) {
              j--;
            }
          }
        } else if (jmin > imin) {
          if (y.#cellIds[j] <= x.#cellIds[i].rangeMax()) {
            cellIds.push(y.#cellIds[j]);
            j++;
          } else {
            i = az.bisect.bisectLeft(x.#cellIds, jmin, {lo: i + 1});
            if (y.#cellIds[j] <= x.#cellIds[i - 1].rangeMax()) {
              i--;
            }
          }
        } else {
          if (x.#cellIds[i] < y.#cellIds[j]) {
            cellIds.push(x.#cellIds[i]);
            i++;
          } else {
            cellIds.push(y.#cellIds[j]);
            j++;
          }
        }
      }

      const cellUnion = new S2jsphere.CellUnion(cellIds);
      if (cellUnion.#cellIds.every(
          (value, index, array) => index === array.length - 1 || value <= array[index + 1]) &&
        ! cellUnion.normalize()) {
        return cellUnion;
      } else throw new Error()
    } else {
      throw new Error("Not implemented");
    }
  }

  expand() {
    if (arguments.length === 1 && typeof arguments[0] === 'number') {
      const level = arguments[0]
      const output = [];
      const levelLsb = S2jsphere.CellId.lsbForLevel(level);
      let i = this.numCells() - 1;

      while (i >= 0) {
        let cellId = this.#cellIds[i];

        if (cellId.lsb() < levelLsb) {
          cellId = cellId.parent(level);
          while (i > 0 && cellId.contains(this.#cellIds[i - 1])) {
            i--;
          }
        }

        output.push(cellId);
        cellId.appendAllNeighbors(level, output); // TODO is this code ever run? Python source has this call, but does not have definition for function
        i--;
      }

      this.#cellIds = output;
    } else if (arguments. length === 2 && arguments[0] instanceof S2jsphere.Angle && typeof arguments[1] === 'number') {
      const [minRadius, maxLevelDiff] = arguments;
      let minLevel = S2jsphere.CellId.MAX_LEVEL;

      for (const cellId of this.#cellIds) {
        minLevel = Math.min(minLevel, cellId.level());
      }

      const radiusLevel = S2jsphere.CellId.minWidth().getMaxLevel(minRadius.radians);

      if (radiusLevel === 0 && minRadius.radians > S2jsphere.CellId.minWidth().getValue(0)) {
        this.expand(0);
      }

      this.expand(Math.min(minLevel + maxLevelDiff, radiusLevel));
    } else {
      throw new Error("Not implemented");
    }
  }

  static getDifference(x, y) {
    const cellIds = [];
    for (const cellId of x.#cellIds) {
      this.#getDifference(cellId, y, cellIds);
    }

    const cellUnion = new S2jsphere.CellUnion(cellIds);

    if (
      !cellUnion.#cellIds.every(
        (value, index, array) => index === array.length - 1 || value <= array[index + 1]
      ))
      throw new Error()
    if (cellUnion.normalize()) throw new Error()

    return cellUnion;
  }

  static #getDifference(cellId, y, cellIds) {
    if (!y.intersects(cellId)) {
      cellIds.push(cellId);
    } else if (!y.contains(cellId)) {
      for (const child of cellId.children()) {
        this.#getDifference(child, y, cellIds);
      }
    }
  }

  numCells() {
    return this.#cellIds.length;
  }

  cellId(i) {
    return this.#cellIds[i];
  }

  cellIds() {
    return this.#cellIds;
  }

  normalize() {
    this.#cellIds.sort();
    const output = [];

    for (let cellId of this.#cellIds) {
      if (output.length && output[output.length - 1].contains(cellId)) {
        continue;
      }

      while (output.length && cellId.contains(output[output.length - 1])) {
        output.pop();
      }

      while (output.length >= 3) {
        if (
          (output[output.length - 3].id() ^
            output[output.length - 2].id() ^
            output[output.length - 1].id()) !==
          cellId.id()
        ) {
          break;
        }

        let mask = cellId.lsb() << 1n;
        mask = ~(mask + (mask << 1n));
        const idMasked = cellId.id() & mask;

        if (
          (output[output.length - 3].id() & mask) !== idMasked ||
          (output[output.length - 2].id() & mask) !== idMasked ||
          (output[output.length - 1].id() & mask) !== idMasked ||
          cellId.isFace()
        ) {
          break;
        }

        output.pop();
        output.pop();
        output.pop();
        cellId = cellId.parent();
      }

      output.push(cellId);
    }

    if (output.length < this.numCells()) {
      this.#cellIds = output;
      return true;
    }

    return false;
  }

  denormalize(minLevel, levelMod) {

    if (minLevel < 0 || minLevel > S2jsphere.CellId.MAX_LEVEL || levelMod < 1 || levelMod > 3)
      throw new Error()

    const cellIds = [];

    for (const cellId of this.#cellIds) {
      const level = cellId.level();
      let newLevel = Math.max(minLevel, level);

      if (levelMod > 1) {
        newLevel += (S2jsphere.CellId.MAX_LEVEL - (newLevel - minLevel)) % levelMod;
        newLevel = Math.min(S2jsphere.CellId.MAX_LEVEL, newLevel);
      }

      if (newLevel === level) {
        cellIds.push(cellId);
      } else {
        for (const child of cellId.children(newLevel)) {
          cellIds.push(child);
        }
      }
    }

    return cellIds;
  }

  contains() {
    if (arguments.length === 1 && arguments[0] instanceof S2jsphere.Cell) {
      return this.contains(arguments[0].id());
    } else if (arguments.length === 1 && arguments[0] instanceof S2jsphere.CellId) {
      const cellId = arguments[0];
      const index = az.bisect.bisectLeft(this.#cellIds, cellId);

      if (
        index < this.#cellIds.length &&
        this.#cellIds[index].rangeMin() <= cellId
      ) {
        return true;
      }

      return (index !== 0 && this.#cellIds[index - 1].rangeMax() >= cellId
      );
    } else if (arguments.length === 1 && arguments[0] instanceof S2jsphere.Point) {
      return this.contains(S2jsphere.CellId.fromPoint(arguments[0]));
    } else if (arguments.length === 1 && arguments[0] instanceof S2jsphere.CellUnion) {
      const cellUnion = arguments[0];

      for (let i = 0; i < cellUnion.numCells(); i++) {
        if (!this.contains(cellUnion.cellId(i))) {
          return false;
        }
      }

      return true;
    } else {
      throw new Error("Not implemented");
    }
  }

  intersects() {
    if (arguments.length === 1 && arguments[0] instanceof S2jsphere.CellId) {
      const cellId = arguments[0];
      const index = az.bisect.bisectLeft(this.#cellIds, cellId);

      if (
        index !== this.#cellIds.length &&
        this.#cellIds[index].rangeMin() <= cellId.rangeMax()
      ) {
        return true;
      }

      return (
        index !== 0 &&
        this.#cellIds[index - 1].rangeMax() >= cellId.rangeMin()
      );
    } else if (arguments.length === 1 && arguments[0] instanceof S2jsphere.CellUnion) {
      const cellUnion = arguments[0];

      for (const cellId of cellUnion.#cellIds) {
        if (this.intersects(cellId)) {
          return true;
        }
      }

      return false;
    } else {
      throw new Error("Not implemented");
    }
  }

  getRectBound() {
    let bound = S2jsphere.LatLngRect.empty();

    for (const cellId of this.#cellIds) {
      bound = bound.union(new S2jsphere.Cell(cellId).getRectBound());
    }

    return bound;
  }
}

S2jsphere.FACE_CELLS = [
  S2jsphere.Cell.fromFacePosLevel(0, 0, 0),
  S2jsphere.Cell.fromFacePosLevel(1, 0, 0),
  S2jsphere.Cell.fromFacePosLevel(2, 0, 0),
  S2jsphere.Cell.fromFacePosLevel(3, 0, 0),
  S2jsphere.Cell.fromFacePosLevel(4, 0, 0),
  S2jsphere.Cell.fromFacePosLevel(5, 0, 0)
];

S2jsphere.RegionCoverer = class {
  #minLevel
  #maxLevel
  #levelMod
  #maxCells
  #region
  #result
  #pq
  #interiorCovering
  #centerInsideCovering
  constructor() {
    this.#minLevel = 0;
    this.#maxLevel = S2jsphere.CellId.MAX_LEVEL;
    this.#levelMod = 1;
    this.#maxCells = 8;
    this.#region = null;
    this.#result = [];
    this.#pq = [];
  }

  static get Candidate() {
    class Candidate {
      get numChildren() {
        return this.children.length;
      }

      constructor() {
        this.cell = null;
        this.isTerminal = false;
        this.children = [];
      }

      compareTo(other) {
        if (!this.cell || !other.cell) {
          throw new Error("Not implemented");
        }
        return this.cell.id() < other.cell.id();
      }
    }
    return Candidate;
  }

  get minLevel() {
    return this.#minLevel;
  }

  set minLevel(value) {
    if (value < 0 || value > S2jsphere.CellId.MAX_LEVEL) {
      throw new Error("Value out of range");
    }
    this.#minLevel = Math.max(0, Math.min(S2jsphere.CellId.MAX_LEVEL, value));
  }

  get maxLevel() {
    return this.#maxLevel;
  }

  set maxLevel(value) {
    if (value < 0 || value > S2jsphere.CellId.MAX_LEVEL) {
      throw new Error("Value out of range");
    }
    this.#maxLevel = Math.max(0, Math.min(S2jsphere.CellId.MAX_LEVEL, value));
  }

  get levelMod() {
    return this.#levelMod;
  }

  set levelMod(value) {
    if (value < 1 || value > 3) {
      throw new Error("Value out of range");
    }
    this.#levelMod = Math.max(1, Math.min(3, value));
  }

  get maxCells() {
    return this.#maxCells;
  }

  set maxCells(value) {
    this.#maxCells = value;
  }

  getCovering(region) {
    this.#result = [];
    const tmpUnion = this.#getCellUnion(region);
    return tmpUnion.denormalize(this.#minLevel, this.#levelMod);
  }

  getInteriorCovering(region) {
    this.#result = [];
    const tmpUnion = this.#getInteriorCellUnion(region);
    return tmpUnion.denormalize(this.#minLevel, this.#levelMod);
  }

  getCenterInsideCovering(region) {
    this.#result = []
    const tmpUnion = this.#getCenterInsideCellUnion(region);
    return tmpUnion.denormalize(this.#minLevel, this.#levelMod);

  }

  #newCandidate(cell) {
    if (!this.#region.mayIntersect(cell)) {
      return null;
    }

    let isTerminal = false;
    if (cell.level() >= this.#minLevel) {
      if (this.#interiorCovering) {
        if (this.#region.contains(cell)) {
          isTerminal = true;
        } else if (cell.level() + this.#levelMod > this.#maxLevel) {
          return null;
        }
      } else if (this.#centerInsideCovering) {
        console.log(cell.cell_id+"", cell.level(), cell.cell_id.toPoint()+"",this.#region.contains(cell.cell_id.toPoint()))
        if (this.#region.contains(cell.cell_id.toPoint())) {
          isTerminal = true
        } else if (cell.level() + this.#levelMod > this.#maxLevel) {
          return null
        }
      } else {
        if (
          cell.level() + this.#levelMod > this.#maxLevel ||
          this.#region.contains(cell)
        ) {
          isTerminal = true;
        }
      }
    }

    const candidate = new this.constructor.Candidate();
    candidate.cell = cell;
    candidate.isTerminal = isTerminal;
    candidate.children = [];
    return candidate;
  }

  #maxChildrenShift() {
    return 2 * this.#levelMod;
  }

  #expandChildren(candidate, cell, numLevels) {
    numLevels -= 1;
    let numTerminals = 0;
    for (const childCell of cell.subdivide()) {
      if (numLevels > 0) {
        if (this.#region.mayIntersect(childCell)) {
          numTerminals += this.#expandChildren(candidate, childCell, numLevels);
        }
        continue;
      }
      const child = this.#newCandidate(childCell);
      if (child !== null) {
        candidate.children.push(child);
        if (child.isTerminal) {
          numTerminals += 1;
        }
      }
    }
    return numTerminals;
  }

  #addCandidate(candidate) {
    if (candidate === null) {
      return;
    }

    if (candidate.isTerminal) {
      this.#result.push(candidate.cell.id());
      return;
    }

    if (candidate.numChildren !== 0) {
      console.log(candidate)
      throw new Error()

    }

    let numLevels = this.#levelMod
    if (candidate.cell.level() < this.#minLevel)
      numLevels = 1
    const numTerminals = this.#expandChildren(candidate, candidate.cell, numLevels)

    if (candidate.numChildren === 0) {
      /* Not needed due to GC */
    } else if (
      !this.#interiorCovering &&
      numTerminals === 1 << this.#maxChildrenShift() &&
      candidate.cell.level() >= this.#minLevel
    ) {
      candidate.isTerminal = true;
      this.#addCandidate(candidate);
    } else {
      const priority =
        (((candidate.cell.level() << this.#maxChildrenShift()) +
            candidate.numChildren) <<
          this.#maxChildrenShift()) + numTerminals
      az.heapq.heappush(this.#pq,({priority:priority, value:candidate}))
    }
  }

  #getInitialCandidates() {
    if (this.#maxCells >= 4) {
      const cap = this.#region.getCapBound();
      let level = Math.min(
        S2jsphere.CellId.minWidth().getMaxLevel(2 * cap.angle().radians),
        Math.min(this.#maxLevel, S2jsphere.CellId.MAX_LEVEL - 1)
      );

      if (this.#levelMod > 1 && level > this.#minLevel) {
        level -= (level - this.#minLevel) % this.#levelMod;
      }

      if (level > 0) {
        const cellId = S2jsphere.CellId.fromPoint(cap.axis);
        const vertexNeighbors = cellId.getVertexNeighbors(level);
        for (const neighbor of vertexNeighbors) {
          this.#addCandidate(this.#newCandidate(new S2jsphere.Cell(neighbor)));
        }
        return;
      }
    }

    for (let face = 0; face < 6; face++) {
      this.#addCandidate(this.#newCandidate(S2jsphere.FACE_CELLS[face]));
    }
  }

  #getCovering(region) {
    if (this.#pq.length !== 0) {
      throw new Error("Expected empty queue");
    }
    if (this.#result.length !== 0) {
      throw new Error("Expected empty result");
    }
    this.#region = region;

    this.#getInitialCandidates();
    while (
      this.#pq.length > 0 &&
      (!this.#interiorCovering ||
        this.#result.length < this.#maxCells)
      ) {
      const candidate = az.heapq.heappop(this.#pq).value;

      let resultSize = 0;
      if (this.#interiorCovering) {
        resultSize = 0;
      } else {
        resultSize = this.#pq.length;
      }
      if (
        candidate.cell.level() < this.#minLevel ||
        candidate.numChildren === 1 ||
        this.#result.length + resultSize + candidate.numChildren <=
        this.#maxCells
      ) {
        for (const child of candidate.children) {
          this.#addCandidate(child);
        }
      } else if (this.#interiorCovering) {
        /* Do nothing here */
      } else {
        candidate.isTerminal = true;
        this.#addCandidate(candidate);
      }
    }
    this.#pq = [];
    this.#region = null;
  }

  #getCellUnion(region) {
    this.#interiorCovering = false;
    this.#getCovering(region);
    return new S2jsphere.CellUnion(this.#result);
  }

  #getInteriorCellUnion(region) {
    this.#interiorCovering = true;
    this.#getCovering(region);
    return new S2jsphere.CellUnion(this.#result);
  }

  #getCenterInsideCellUnion(region) {
    this.#interiorCovering = false
    this.#centerInsideCovering = true
    this.#getCovering(region);
    return new S2jsphere.CellUnion(this.#result);
  }

  static *floodFill(region, start) {
    const allNbrs = new Set();
    const frontier = [];
    allNbrs.add(start.id());
    frontier.push(start);
    while (frontier.length !== 0) {
      const cellId = frontier.pop();
      if (!region.mayIntersect(new S2jsphere.Cell(cellId))) {
        continue;
      }
      yield cellId;

      const neighbors = cellId.getEdgeNeighbors();
      for (const nbr of neighbors) {
        if (!allNbrs.has(nbr.id())) {
          allNbrs.add(nbr.id());
          frontier.push(nbr);
        }
      }
    }
  }

  static getSimpleCovering(region, start, level) {
    return this.floodFill(region, S2jsphere.CellId.fromPoint(start).parent(level));
  }
}


module.exports = { S2jsphere, az };
